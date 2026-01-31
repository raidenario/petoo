(ns diagnose-workers
  "Diagnostic tools for worker pipeline verification."
  (:require [pet-app.infra.db :as db]
            [aero.core :as aero]
            [clojure.java.io :as io]
            [next.jdbc :as jdbc]
            [clojure.pprint :refer [pprint]]))

(defn- load-config []
  (aero/read-config (io/resource "config.edn")))

(defn- get-ds []
  (let [config (:database (load-config))]
    (jdbc/get-datasource config)))

(defn check-read-model
  "Query the read model to see recent updates."
  []
  (let [ds (get-ds)]
    (println "\n--- [READ MODEL] Recent Appointments ---")
    (pprint
     (db/execute! ds
                  {:select [:id :status :updated_at]
                   :from [:read_model.appointments_view]
                   :order-by [[:updated_at :desc]]
                   :limit 5}))))

(defn check-financials
  "Query financial tables for recent activity."
  []
  (let [ds (get-ds)]
    (println "\n--- [FINANCIAL] Recent Transactions ---")
    (pprint
     (db/execute! ds
                  {:select [:id :appointment_id :amount_cents :status :created_at]
                   :from [:financial.transactions]
                   :order-by [[:created_at :desc]]
                   :limit 5}))))

(defn check-core-appointments
  "Summary of appointment statuses in core."
  []
  (let [ds (get-ds)]
    (println "\n--- [CORE] Appointment Status Summary ---")
    (pprint
     (db/execute! ds
                  {:select [[:status :status] [[:count :*] :total]]
                   :from [:core.appointments]
                   :group-by [:status]}))))

(defn -main [& _]
  (println "Starting Petoo Worker Diagnostics...")
  (check-core-appointments)
  (check-financials)
  (check-read-model)
  (println "\n--- Diagnostics Complete ---"))
