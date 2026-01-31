(ns pet-app.api.queries.enterprises
  "Enterprise query handlers."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn get-enterprise-by-slug
  "Get enterprise configuration by slug (for whitelabel)."
  [{:keys [ds]} request]
  (let [slug (get-in request [:path-params :slug])]
    (try
      (let [result (db/execute-one! ds
                                    {:select [:id :name :slug :theme-config :logo-url :status]
                                     :from [:core.enterprises]
                                     :where [:and
                                             [:= :slug slug]
                                             [:= :status "ACTIVE"]]})]
        (if result
          {:status 200
           :body {:id (str (:id result))
                  :name (:name result)
                  :slug (:slug result)
                  :logo-url (:logo-url result)
                  :theme (:theme-config result)}}
          {:status 404
           :body {:error "Enterprise not found"}}))
      (catch Exception e
        (log/error e "Error fetching enterprise" slug)
        {:status 500
         :body {:error "Failed to fetch enterprise"}}))))
