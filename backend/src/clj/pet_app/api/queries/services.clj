(ns pet-app.api.queries.services
  "Service query handlers."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn list-services
  "List active services for an enterprise."
  [{:keys [ds]} request]
  (let [params (:query-params request)
        enterprise-id (or (get params "enterprise-id") (get params "enterprise_id"))]
    (if-not enterprise-id
      {:status 400
       :body {:error "enterprise-id is required"}}
      (try
        (let [services (db/execute! ds
                                    {:select [:id :name :description :category
                                              :price-cents :duration-minutes]
                                     :from [:core.services]
                                     :where [:and
                                             [:= :enterprise-id [:cast enterprise-id :uuid]]
                                             [:= :active true]]
                                     :order-by [[:category :asc] [:name :asc]]})]
          {:status 200
           :body {:services (mapv #(update % :id str) services)
                  :count (count services)}})
        (catch Exception e
          (log/error e "Error listing services")
          {:status 500
           :body {:error "Failed to fetch services"}})))))
