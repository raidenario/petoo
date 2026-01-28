(ns pet-app.infra.migrations
  "Database migrations using Migratus."
  (:require [migratus.core :as migratus]
            [aero.core :as aero]
            [clojure.java.io :as io]
            [clojure.tools.logging :as log]
            [next.jdbc :as jdbc]
            [clojure.string :as str]))

(defn load-config
  "Load Migratus config from config.edn"
  []
  (let [config (aero/read-config (io/resource "config.edn"))]
    (:migratus config)))

(defn migrate!
  "Run pending migrations."
  []
  (log/info "Running database migrations...")
  (let [config (load-config)]
    (migratus/migrate config)
    (log/info "Migrations completed.")))

(defn rollback!
  "Rollback the last migration."
  []
  (log/info "Rolling back last migration...")
  (let [config (load-config)]
    (migratus/rollback config)
    (log/info "Rollback completed.")))

(defn reset-db!
  "Reset database (rollback all, then migrate)."
  []
  (log/warn "Resetting database...")
  (let [config (load-config)]
    (migratus/reset config)
    (log/info "Database reset completed.")))

(defn status
  "Get migration status."
  []
  (let [config (load-config)]
    (migratus/pending-list config)))

(defn create-migration
  "Create a new migration file."
  [name]
  (let [config (load-config)]
    (migratus/create config name)))

;; Entry point for command line
(defn -main
  "CLI entry point for migrations."
  [& args]
  (let [command (first args)]
    (case command
      "migrate" (migrate!)
      "rollback" (rollback!)
      "reset" (reset-db!)
      "status" (println "Pending migrations:" (status))
      "create" (if-let [name (second args)]
                 (create-migration name)
                 (println "Usage: clj -M:migrate create <name>"))
      (println "Usage: clj -M:migrate [migrate|rollback|reset|status|create <name>]"))))
