(ns pet-app.core
  "Application entry point.
   
   Starts the Petoo Backend system using Integrant."
  (:require [pet-app.system :as system]
            [clojure.tools.logging :as log])
  (:gen-class))

(defonce ^:private system-atom (atom nil))

(defn -main
  "Main entry point for the application."
  [& args]
  (log/info "╔═══════════════════════════════════════╗")
  (log/info "║     Petoo Backend - Starting...       ║")
  (log/info "╚═══════════════════════════════════════╝")

  (let [profile (keyword (or (first args) "dev"))]
    (try
      (let [sys (system/start-system profile)]
        (reset! system-atom sys)
        (log/info "╔═══════════════════════════════════════╗")
        (log/info "║     Petoo Backend - Ready! 🐾          ║")
        (log/info "║     http://localhost:3000              ║")
        (log/info "╚═══════════════════════════════════════╝")

        ;; Add shutdown hook
        (.addShutdownHook
         (Runtime/getRuntime)
         (Thread. (fn []
                    (log/info "Shutdown signal received...")
                    (when-let [sys @system-atom]
                      (system/stop-system sys)
                      (reset! system-atom nil))))))

      (catch Exception e
        (log/error e "Failed to start system")
        (System/exit 1)))))

(defn restart
  "Utility function for REPL development.
   Stops and restarts the system."
  []
  (when-let [sys @system-atom]
    (system/stop-system sys)
    (reset! system-atom nil))
  (-main "dev"))

(defn stop
  "Utility function for REPL development.
   Stops the system."
  []
  (when-let [sys @system-atom]
    (system/stop-system sys)
    (reset! system-atom nil)))
