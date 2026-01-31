(ns pet-app.api.commands.enterprises
  "Enterprise command handlers (formerly Tenants)."
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.infra.storage :as storage]
            [clojure.tools.logging :as log]))

(defn create-enterprise
  "Create a new enterprise (petshop/clinic)."
  [{:keys [ds]} request]
  (let [body (:body-params request)]
    (try
      (let [enterprise-id (h/uuid)
            enterprise {:id [:cast enterprise-id :uuid]
                        :name (:name body)
                        :slug (:slug body)
                        :contact-email (or (:contact-email body) (:contact_email body))
                        :contact-phone (or (:contact-phone body) (:contact_phone body))
                        :address (:address body)
                        :logo-url (or (:logo-url body) (:logo_url body))
                        :cnpj (:cnpj body)
                        :service-type (:service-type body)
                        :availability (h/->json (:availability body))
                        :description (:description body)
                        :status "ACTIVE"}
            _ (db/execute-one! ds
                               {:insert-into :core.enterprises
                                :values [enterprise]
                                :returning [:*]})]
        {:status 201
         :body {:id enterprise-id
                :name (:name body)
                :slug (:slug body)}})
      (catch Exception e
        (log/error e "Failed to create enterprise")
        (if (re-find #"duplicate key" (.getMessage e))
          (h/response-bad-request {:slug "Slug already exists"})
          (h/response-error (.getMessage e)))))))

(defn update-enterprise-logo [deps request]
  (let [enterprise-id (get-in request [:path-params :id])
        file-params (get-in request [:params "file"])
        logo-url (storage/save-file! file-params)]
    (if logo-url
      (do
        (db/execute! (:ds deps)
                     {:update :core.enterprises
                      :set {:logo-url logo-url}
                      :where [:= :id [:cast enterprise-id :uuid]]})
        (when-let [producer (:kafka-producer deps)]
          (let [event (kafka/make-event :enterprise.updated {:enterprise-id enterprise-id :logo-url logo-url})]
            (kafka/send-event! producer "enterprise.updated" enterprise-id event)))
        {:status 200
         :body {:id enterprise-id
                :logo-url logo-url}})
      (h/response-error "Failed to upload logo"))))
