(ns pet-app.api.queries.professionals
  "Professional query handlers."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn list-professionals
  "List active professionals for a tenant."
  [{:keys [ds]} request]
  (let [params (:query-params request)
        tenant-id (get params "tenant-id")]
    (if-not tenant-id
      {:status 400
       :body {:error "tenant-id is required"}}
      (try
        (let [professionals (db/execute! ds
                                         {:select [:id :name :specialty :availability]
                                          :from [:core.professionals]
                                          :where [:and
                                                  [:= :tenant-id [:cast tenant-id :uuid]]
                                                  [:= :active true]]
                                          :order-by [[:name :asc]]})]
          {:status 200
           :body {:professionals (mapv #(update % :id str) professionals)
                  :count (count professionals)}})
        (catch Exception e
          (log/error e "Error listing professionals")
          {:status 500
           :body {:error "Failed to fetch professionals"}})))))
