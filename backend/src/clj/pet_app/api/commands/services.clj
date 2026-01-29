(ns pet-app.api.commands.services
  "Service command handlers."
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn create-service
  "Create a new service."
  [{:keys [ds]} request]
  (let [body (:body-params request)]
    (try
      (let [service-id (h/uuid)
            service {:id [:cast service-id :uuid]
                     :tenant-id [:cast (:tenant-id body) :uuid]
                     :name (:name body)
                     :description (:description body)
                     :category (:category body)
                     :price-cents (:price-cents body)
                     :duration-minutes (:duration-minutes body)
                     :active true}
            _ (db/execute-one! ds
                               {:insert-into :core.services
                                :values [service]
                                :returning [:*]})]
        {:status 201
         :body {:id service-id
                :name (:name body)
                :price-cents (:price-cents body)}})
      (catch Exception e
        (log/error e "Failed to create service")
        (h/response-error (.getMessage e))))))
