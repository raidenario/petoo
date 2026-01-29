(ns pet-app.system
  "Integrant system configuration for Petoo Backend.
   
   This namespace defines all system components and their lifecycle:
   - :pet-app/config   - Loads configuration from config.edn
   - :pet-app/db       - HikariCP connection pool
   - :pet-app/kafka    - Kafka producer
   - :pet-app/workers  - Kafka consumer workers (availability, financial, projector)
   - :pet-app/router   - Reitit router
   - :pet-app/handler  - Ring handler
   - :pet-app/server   - Jetty HTTP server"
  (:require [integrant.core :as ig]
            [aero.core :as aero]
            [clojure.java.io :as io]
            [clojure.tools.logging :as log]
            [next.jdbc :as jdbc]
            [ring.adapter.jetty :as jetty]
            [pet-app.api.routes :as routes]
            [pet-app.infra.kafka :as kafka]
            [pet-app.workers.manager :as workers])
  (:import [com.zaxxer.hikari HikariDataSource HikariConfig]))


(defmethod ig/init-key :pet-app/config [_ {:keys [profile]}]
  (log/info "Loading configuration with profile:" (or profile :default))
  (aero/read-config (io/resource "config.edn") {:profile profile}))


(defmethod ig/init-key :pet-app/db [_ {:keys [config]}]
  (let [db-config (:database config)
        user (or (:user db-config) (System/getenv "DB_USER") "petoo")
        password (or (:password db-config) (System/getenv "DB_PASSWORD") "petoo_secret")
        jdbc-url (:jdbcUrl db-config)
        _ (log/info "Initializing database connection pool...")
        _ (log/debug "JDBC URL:" jdbc-url)
        _ (log/debug "User:" user)
        _ (log/debug "Password length:" (count password))
        _ (log/debug "Password starts with:" (subs password 0 (min 3 (count password))))
        ;; Create HikariDataSource directly with explicit configuration
        hikari-config (doto (HikariConfig.)
                        (.setJdbcUrl jdbc-url)
                        (.setUsername user)
                        (.setPassword password)
                        (.setMaximumPoolSize (or (:maximumPoolSize db-config) 10))
                        (.setMinimumIdle (or (:minimumIdle db-config) 2))
                        (.setConnectionTimeout (or (:connectionTimeout db-config) 30000)))
        datasource (HikariDataSource. hikari-config)]
    ;; Test connection
    (try
      (jdbc/execute-one! datasource ["SELECT 1 as ping"])
      (log/info "✓ Database connection established")
      datasource
      (catch Exception e
        (log/error e "✗ Failed to connect to database")
        (log/error "Connection details - Host:" (or (System/getenv "DB_HOST") "localhost")
                   "Port:" (or (System/getenv "DB_PORT") "5432")
                   "Database:" (or (System/getenv "DB_NAME") "petoo_db")
                   "User:" (or (System/getenv "DB_USER") "petoo"))
        (throw e)))))

(defmethod ig/halt-key! :pet-app/db [_ datasource]
  (log/info "Closing database connection pool...")
  (when datasource
    (.close ^HikariDataSource datasource)))


(defmethod ig/init-key :pet-app/kafka [_ {:keys [config]}]
  (let [kafka-config (:kafka config)]
    (log/info "Initializing Kafka producer...")
    (try
      (let [producer (kafka/create-producer kafka-config)]
        (log/info "✓ Kafka producer initialized")
        {:producer producer
         :config kafka-config})
      (catch Exception e
        (log/warn "⚠ Kafka producer initialization failed (non-fatal):" (.getMessage e))
        {:producer nil
         :config kafka-config
         :error (.getMessage e)}))))

(defmethod ig/halt-key! :pet-app/kafka [_ {:keys [producer]}]
  (when producer
    (log/info "Closing Kafka producer...")
    (kafka/close-producer producer)))


(defmethod ig/init-key :pet-app/workers [_ {:keys [config db kafka]}]
  (let [kafka-config (:kafka config)
        topics (:topics config)
        producer (:producer kafka)]
    (if producer
      (do
        (log/info "Starting Kafka workers...")
        (try
          (let [started-workers (workers/start-all! kafka-config topics db producer)]
            (log/info "✓ All workers started successfully")
            {:workers started-workers
             :enabled true})
          (catch Exception e
            (log/warn "⚠ Workers initialization failed (non-fatal):" (.getMessage e))
            {:workers nil
             :enabled false
             :error (.getMessage e)})))
      (do
        (log/warn "⚠ Workers not started - Kafka producer not available")
        {:workers nil
         :enabled false
         :error "Kafka producer not available"}))))

(defmethod ig/halt-key! :pet-app/workers [_ {:keys [enabled]}]
  (when enabled
    (log/info "Stopping Kafka workers...")
    (workers/stop-all!)))


(defmethod ig/init-key :pet-app/router [_ {:keys [db kafka config]}]
  (log/info "Initializing router...")
  (routes/router {:db db :kafka kafka :config config}))


(defmethod ig/init-key :pet-app/handler [_ {:keys [router]}]
  (log/info "Initializing Ring handler...")
  (routes/handler router))


(defmethod ig/init-key :pet-app/server [_ {:keys [config handler]}]
  (let [{:keys [port host]} (:http-server config)]
    (log/info (str "Starting HTTP server on " host ":" port))
    (jetty/run-jetty handler
                     {:port port
                      :host host
                      :join? false})))

(defmethod ig/halt-key! :pet-app/server [_ server]
  (log/info "Stopping HTTP server...")
  (when server
    (.stop server)))


(def system-config
  "Integrant configuration map defining component dependencies."
  {:pet-app/config {:profile nil}

   :pet-app/db {:config (ig/ref :pet-app/config)}

   :pet-app/kafka {:config (ig/ref :pet-app/config)}

   :pet-app/workers {:config (ig/ref :pet-app/config)
                     :db (ig/ref :pet-app/db)
                     :kafka (ig/ref :pet-app/kafka)}

   :pet-app/router {:db (ig/ref :pet-app/db)
                    :kafka (ig/ref :pet-app/kafka)
                    :config (ig/ref :pet-app/config)}

   :pet-app/handler {:router (ig/ref :pet-app/router)}

   :pet-app/server {:config (ig/ref :pet-app/config)
                    :handler (ig/ref :pet-app/handler)}})


(defn start-system
  "Initialize and start the system."
  ([]
   (start-system nil))
  ([profile]
   (log/info "=== Starting Petoo Backend ===")
   (-> system-config
       (assoc-in [:pet-app/config :profile] profile)
       ig/init)))

(defn stop-system
  "Halt the running system."
  [system]
  (log/info "=== Stopping Petoo Backend ===")
  (ig/halt! system))
