(ns pet-app.api.queries.services
  "Service query handlers."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn list-services
  "List active services for a tenant."
  [{:keys [ds]} request]
  (let [params (:query-params request)
        tenant-id (get params "tenant-id")]
    (if-not tenant-id
      {:status 400
       :body {:error "tenant-id is required"}}
      (try
        (let [services (db/execute! ds
                                    {:select [:id :name :description :category
                                              :price-cents :duration-minutes]
                                     :from [:core.services]
                                     :where [:and
                                             [:= :tenant-id [:cast tenant-id :uuid]]
                                             [:= :active true]]
                                     :order-by [[:category :asc] [:name :asc]]})]
          {:status 200
           :body {:services (mapv #(update % :id str) services)
                  :count (count services)}})
        (catch Exception e
          (log/error e "Error listing services")
          {:status 500
           :body {:error "Failed to fetch services"}})))))
