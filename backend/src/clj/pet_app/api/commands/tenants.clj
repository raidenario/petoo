(ns pet-app.api.commands.tenants
  "Tenant command handlers."
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.infra.storage :as storage]
            [clojure.tools.logging :as log]))

(defn create-tenant
  "Create a new tenant (petshop/clinic)."
  [{:keys [ds]} request]
  (let [body (:body-params request)]
    (try
      (let [tenant-id (h/uuid)
            tenant {:id [:cast tenant-id :uuid]
                    :name (:name body)
                    :slug (:slug body)
                    :contact-email (:contact-email body)
                    :contact-phone (:contact-phone body)
                    :address (:address body)
                    :status "ACTIVE"}
            _ (db/execute-one! ds
                               {:insert-into :core.tenants
                                :values [tenant]
                                :returning [:*]})]
        {:status 201
         :body {:id tenant-id
                :name (:name body)
                :slug (:slug body)}})
      (catch Exception e
        (log/error e "Failed to create tenant")
        (if (re-find #"duplicate key" (.getMessage e))
          (h/response-bad-request {:slug "Slug already exists"})
          (h/response-error (.getMessage e)))))))

(defn update-tenant-logo [deps request]
  (let [tenant-id (get-in request [:path-params :id])
        file-params (get-in request [:params "file"])
        logo-url (storage/save-file! file-params)]
    (if logo-url
      (do
        (db/update-tenant-logo! (:ds deps) tenant-id logo-url)
        (when-let [producer (:kafka-producer deps)]
          (let [event (kafka/make-event :tenant.updated {:tenant-id tenant-id :logo-url logo-url})]
            (kafka/send-event! producer "tenant.updated" tenant-id event)))
        {:status 200
         :body {:id tenant-id
                :logo-url logo-url}})
      (h/response-error "Failed to upload logo"))))
