(ns pet-app.infra.kafka
  "Kafka adapter using native Apache Kafka clients.
   
   Provides producer and consumer utilities for event-driven architecture."
  (:require [clojure.data.json :as json]
            [clojure.tools.logging :as log])
  (:import [org.apache.kafka.clients.producer KafkaProducer ProducerRecord ProducerConfig]
           [org.apache.kafka.clients.consumer KafkaConsumer ConsumerConfig ConsumerRecords]
           [org.apache.kafka.common.serialization StringSerializer StringDeserializer]
           [java.time Duration]
           [java.util Properties]))

;; ============================================
;; Producer
;; ============================================

(defn- producer-config
  "Create producer configuration properties."
  [{:keys [bootstrap-servers client-id producer]}]
  (doto (Properties.)
    (.put ProducerConfig/BOOTSTRAP_SERVERS_CONFIG bootstrap-servers)
    (.put ProducerConfig/CLIENT_ID_CONFIG (str client-id "-producer"))
    (.put ProducerConfig/KEY_SERIALIZER_CLASS_CONFIG StringSerializer)
    (.put ProducerConfig/VALUE_SERIALIZER_CLASS_CONFIG StringSerializer)
    (.put ProducerConfig/ACKS_CONFIG (get producer :acks "all"))
    (.put ProducerConfig/RETRIES_CONFIG (int (get producer :retries 3)))))

(defn create-producer
  "Create a Kafka producer.
   
   Args:
     config - Kafka configuration map with :bootstrap-servers and :producer options
   
   Returns:
     KafkaProducer instance"
  [config]
  (log/info "Creating Kafka producer...")
  (KafkaProducer. (producer-config config)))

(defn close-producer
  "Close a Kafka producer."
  [producer]
  (when producer
    (.close ^KafkaProducer producer)))

(defn send-event!
  "Send an event to a Kafka topic.
   
   Args:
     producer - KafkaProducer instance
     topic    - Topic name string
     key      - Event key (string)
     event    - Event data (will be JSON encoded)
   
   Returns:
     Future with RecordMetadata"
  [producer topic key event]
  (let [value (json/write-str event)
        record (ProducerRecord. topic key value)]
    (log/info "Sending event to" topic "with key:" key)
    (.send ^KafkaProducer producer record)))

(defn send-event-sync!
  "Send an event synchronously and wait for acknowledgment.
   
   Args:
     producer - KafkaProducer instance
     topic    - Topic name string
     key      - Event key (string)
     event    - Event data (will be JSON encoded)
   
   Returns:
     RecordMetadata"
  [producer topic key event]
  @(send-event! producer topic key event))

;; ============================================
;; Consumer
;; ============================================

(defn- consumer-config
  "Create consumer configuration properties."
  [{:keys [bootstrap-servers client-id consumer]}]
  (doto (Properties.)
    (.put ConsumerConfig/BOOTSTRAP_SERVERS_CONFIG bootstrap-servers)
    (.put ConsumerConfig/CLIENT_ID_CONFIG (str client-id "-consumer"))
    (.put ConsumerConfig/GROUP_ID_CONFIG (:group-id consumer))
    (.put ConsumerConfig/KEY_DESERIALIZER_CLASS_CONFIG StringDeserializer)
    (.put ConsumerConfig/VALUE_DESERIALIZER_CLASS_CONFIG StringDeserializer)
    (.put ConsumerConfig/AUTO_OFFSET_RESET_CONFIG (get consumer :auto-offset-reset "earliest"))
    (.put ConsumerConfig/ENABLE_AUTO_COMMIT_CONFIG (str (get consumer :enable-auto-commit false)))))

(defn create-consumer
  "Create a Kafka consumer.
   
   Args:
     config - Kafka configuration map with :bootstrap-servers and :consumer options
     topics - Collection of topic names to subscribe to
   
   Returns:
     KafkaConsumer instance"
  [config topics]
  (let [kc (KafkaConsumer. (consumer-config config))]
    (.subscribe kc (vec topics))
    (log/info "Created Kafka consumer subscribed to:" topics)
    kc))

(defn close-consumer
  "Close a Kafka consumer."
  [consumer]
  (when consumer
    (.close ^KafkaConsumer consumer)))

(defn poll-events
  "Poll for events from subscribed topics.
   
   Args:
     consumer   - KafkaConsumer instance
     timeout-ms - Poll timeout in milliseconds
   
   Returns:
     Sequence of event maps with :topic, :key, :value, :offset, :partition"
  [consumer timeout-ms]
  (let [^ConsumerRecords records (.poll ^KafkaConsumer consumer (Duration/ofMillis timeout-ms))]
    (map (fn [record]
           {:topic (.topic record)
            :key (.key record)
            :value (try
                     (json/read-str (.value record) :key-fn keyword)
                     (catch Exception _
                       (.value record)))
            :offset (.offset record)
            :partition (.partition record)
            :timestamp (.timestamp record)})
         records)))

(defn commit-sync!
  "Synchronously commit current offsets for all subscribed topics."
  [consumer]
  (.commitSync ^KafkaConsumer consumer))

;; ============================================
;; Event Helpers
;; ============================================

(defn make-event
  "Create a standard event structure.
   
   Args:
     event-type - Keyword or string event type
     payload    - Event payload map
     metadata   - Optional metadata map
   
   Returns:
     Event map with :event-type, :payload, :timestamp, :id"
  [event-type payload & {:keys [metadata]}]
  (cond-> {:event-type (name event-type)
           :payload payload
           :timestamp (System/currentTimeMillis)
           :id (str (java.util.UUID/randomUUID))}
    metadata (assoc :metadata metadata)))
