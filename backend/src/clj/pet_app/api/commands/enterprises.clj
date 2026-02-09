(ns pet-app.api.commands.enterprises
  "Enterprise command handlers.
   
   Operations:
   - create-enterprise        (POST, PLATFORM only)
   - update-enterprise-profile (PUT /enterprises/me, self-service)
   - update-enterprise-logo    (POST file upload)"
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.api.helpers :refer [ok created bad-request not-found error]]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.infra.storage :as storage]
            [clojure.tools.logging :as log]))

(defn create-enterprise
  "Create a new enterprise (petshop/clinic).
   Only PLATFORM admins can create enterprises."
  [{:keys [ds]} request]
  (let [body (:body-params request)]
    (cond
      (nil? (:name body))
      (bad-request "name is required")

      (nil? (:slug body))
      (bad-request "slug is required")

      :else
      (try
        (let [enterprise-id (h/uuid)
              enterprise {:id [:cast enterprise-id :uuid]
                          :name (:name body)
                          :slug (:slug body)
                          :contact-email (:contact-email body)
                          :contact-phone (:contact-phone body)
                          :address (:address body)
                          :logo-url (:logo-url body)
                          :cnpj (:cnpj body)
                          :service-type (:service-type body)
                          :availability (when (:availability body)
                                          (h/->json (:availability body)))
                          :description (:description body)
                          :status "ACTIVE"}
              _ (db/execute-one! ds
                                 {:insert-into :core.enterprises
                                  :values [enterprise]
                                  :returning [:*]})]
          (created {:id enterprise-id
                    :name (:name body)
                    :slug (:slug body)}))
        (catch Exception e
          (log/error e "Failed to create enterprise")
          (if (re-find #"duplicate key" (.getMessage e))
            (bad-request "Slug already exists")
            (error (.getMessage e))))))))

(defn update-enterprise-profile
  "Self-service update for enterprise profile.
   
   Allows MASTER/ADMIN to update their own enterprise's data:
   name, description, address, contact info, availability, etc.
   
   Enterprise is identified from the authenticated user's token."
  [{:keys [ds]} request]
  (let [enterprise-id (get-in request [:user :enterprise-id])
        body (:body-params request)]
    (if (nil? enterprise-id)
      (bad-request "Enterprise context required. Login as an enterprise user.")
      (try
        ;; Verify enterprise exists
        (let [existing (db/execute-one! ds
                                        {:select [:id]
                                         :from [:core.enterprises]
                                         :where [:= :id [:cast enterprise-id :uuid]]})]
          (if-not existing
            (not-found "Enterprise not found")
            (let [update-data (cond-> {}
                                (:name body) (assoc :name (:name body))
                                (:description body) (assoc :description (:description body))
                                (:address body) (assoc :address (:address body))
                                (:contact-email body) (assoc :contact-email (:contact-email body))
                                (:contact-phone body) (assoc :contact-phone (:contact-phone body))
                                (:cnpj body) (assoc :cnpj (:cnpj body))
                                (:service-type body) (assoc :service-type (:service-type body))
                                (:availability body) (assoc :availability (h/->json (:availability body)))
                                (some? (:latitude body)) (assoc :latitude (:latitude body))
                                (some? (:longitude body)) (assoc :longitude (:longitude body)))]
              (if (empty? update-data)
                (bad-request "No fields provided to update")
                (let [updated (first (db/update! ds :core.enterprises
                                                 update-data
                                                 [:= :id [:cast enterprise-id :uuid]]))]
                  (ok {:id (str (:id updated))
                       :name (:name updated)
                       :description (:description updated)
                       :address (:address updated)
                       :contact-email (:contact-email updated)
                       :contact-phone (:contact-phone updated)
                       :message "Enterprise profile updated successfully"}))))))
        (catch Exception e
          (log/error e "Failed to update enterprise profile" enterprise-id)
          (error (.getMessage e)))))))

(defn update-enterprise-logo
  "Upload and update enterprise logo."
  [deps request]
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
        (ok {:id enterprise-id
             :logo-url logo-url}))
      (error "Failed to upload logo"))))
