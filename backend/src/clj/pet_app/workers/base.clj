(ns pet-app.workers.base
  "Base utilities for Kafka consumers using Jackdaw.
   
   Provides common infrastructure for all workers:
   - Consumer creation and management
   - Polling loop
   - Error handling and retry logic"
  (:require [pet-app.infra.kafka :as kafka]
            [clojure.tools.logging :as log]
            [clojure.string :as str]))

;; ============================================
;; Event Processing
;; ============================================

(defn process-record
  "Process a single consumer record.
   
   Args:
     handler - Function (fn [event]) that processes the event
     record  - Kafka consumer record map
   
   Returns:
     {:success true} or {:success false :error <exception>}"
  [handler record]
  (let [topic (:topic record)
        partition (:partition record)
        offset (:offset record)]
    (try
      (handler record)
      (log/debugf "[%s:%d@%d] Processed record" topic partition offset)
      {:success true}
      (catch Exception e
        (log/error e (format "[%s:%d@%d] Error processing record: %s"
                             topic partition offset (pr-str (:value record))))
        {:success false :error e}))))

;; ============================================
;; Polling Loop
;; ============================================

(defn- poll-and-process
  "Poll for records and process them."
  [consumer handler poll-timeout-ms]
  (let [records (kafka/poll-events consumer poll-timeout-ms)]
    (when (seq records)
      (let [cnt (count records)
            topics (distinct (map :topic records))]
        (log/infof "Received %d records from topics: %s" cnt (str/join ", " topics))
        (doseq [record records]
          (process-record handler record))
        ;; Commit after processing batch
        (kafka/commit-sync! consumer)))
    (count records)))

(defn start-consumer-loop
  "Start a consumer polling loop.
   
   Args:
     consumer        - KafkaConsumer instance
     handler         - Function to process each event
     running-atom    - Atom with boolean, set to false to stop
     poll-timeout-ms - Poll timeout (default 1000ms)
   
   This runs in the current thread (blocking)."
  [consumer handler running-atom & {:keys [poll-timeout-ms] :or {poll-timeout-ms 1000}}]
  (log/info "Starting consumer loop...")
  (try
    (while @running-atom
      (poll-and-process consumer handler poll-timeout-ms))
    (finally
      (log/info "Consumer loop stopped")
      (kafka/close-consumer consumer))))

;; ============================================
;; Worker Runner
;; ============================================

(defn run-worker
  "Run a worker with the given handler.
   
   Args:
     name         - Worker name for logging
     kafka-config - Kafka configuration
     topics       - Topics to subscribe
     handler      - Event handler function
     deps         - Dependencies map (db, etc)
   
   Returns:
     {:consumer <consumer> :running <atom> :thread <Thread>}"
  [name kafka-config topics handler deps]
  (let [group-id (str "petagita-" name)
        ;; Reuse kafka/create-consumer from infra/kafka.clj
        config (assoc-in kafka-config [:consumer :group-id] group-id)
        consumer (kafka/create-consumer config topics)
        running-atom (atom true)
        handler-with-deps (fn [event]
                            (handler (assoc event :deps deps)))
        thread (Thread.
                (fn []
                  (log/info "Worker" name "started on topics:" topics)
                  (start-consumer-loop consumer handler-with-deps running-atom))
                (str "worker-" name))]
    (.start thread)
    {:consumer consumer
     :running running-atom
     :thread thread
     :name name}))

(defn stop-worker
  "Stop a running worker."
  [{:keys [running thread name]}]
  (log/info "Stopping worker:" name)
  (reset! running false)
  (.join ^Thread thread 5000)
  (when (.isAlive ^Thread thread)
    (log/warn "Worker thread still alive after timeout, interrupting...")
    (.interrupt ^Thread thread)))
