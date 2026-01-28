(ns pet-app.workers.manager
  "Workers Manager - Start and stop all workers.
   
   Provides centralized control for all event processing workers."
  (:require [pet-app.workers.availability :as availability]
            [pet-app.workers.financial :as financial]
            [pet-app.workers.projector :as projector]
            [clojure.tools.logging :as log]))

(defonce ^:private workers-atom (atom {}))

(defn start-all!
  "Start all workers.
   
   Args:
     kafka-config - Kafka configuration map
     topics       - Topics configuration map
     ds           - Database datasource
     producer     - Kafka producer"
  [kafka-config topics ds producer]
  (log/info "Starting all workers...")

  (let [workers {:availability (availability/start kafka-config topics ds producer)
                 :financial (financial/start kafka-config topics ds producer)
                 :projector (projector/start kafka-config topics ds)}]

    (reset! workers-atom workers)
    (log/info "All workers started:" (keys workers))
    workers))

(defn stop-all!
  "Stop all running workers."
  []
  (log/info "Stopping all workers...")
  (doseq [[name worker] @workers-atom]
    (log/info "Stopping worker:" name)
    (try
      (case name
        :availability (availability/stop worker)
        :financial (financial/stop worker)
        :projector (projector/stop worker))
      (catch Exception e
        (log/warn "Error stopping worker" name ":" (.getMessage e)))))
  (reset! workers-atom {})
  (log/info "All workers stopped"))

(defn status
  "Get status of all workers."
  []
  (into {}
        (for [[name worker] @workers-atom]
          [name {:running @(:running worker)
                 :name (:name worker)}])))
