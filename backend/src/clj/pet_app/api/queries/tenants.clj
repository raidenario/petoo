(ns pet-app.api.queries.tenants
  "Tenant query handlers."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn get-tenant-by-slug
  "Get tenant configuration by slug (for whitelabel)."
  [{:keys [ds]} request]
  (let [slug (get-in request [:path-params :slug])]
    (try
      (let [result (db/execute-one! ds
                                    {:select [:id :name :slug :theme-config :status]
                                     :from [:core.tenants]
                                     :where [:and
                                             [:= :slug slug]
                                             [:= :status "ACTIVE"]]})]
        (if result
          {:status 200
           :body {:id (str (:id result))
                  :name (:name result)
                  :slug (:slug result)
                  :theme (:theme-config result)}}
          {:status 404
           :body {:error "Tenant not found"}}))
      (catch Exception e
        (log/error e "Error fetching tenant" slug)
        {:status 500
         :body {:error "Failed to fetch tenant"}}))))
