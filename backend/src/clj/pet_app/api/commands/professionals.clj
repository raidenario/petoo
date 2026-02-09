(ns pet-app.api.commands.professionals
  "Professional command handlers.
   
   CRUD operations for enterprise professionals:
   - create-professional       (POST)
   - update-professional       (PUT)
   - deactivate-professional   (DELETE / soft-delete)
   - update-professional-avatar (POST file upload)"
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.api.helpers :refer [ok created bad-request not-found error]]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.infra.storage :as storage]
            [clojure.tools.logging :as log]))

(defn create-professional
  "Create a new professional for an enterprise."
  [{:keys [ds]} request]
  (let [body (:body-params request)
        enterprise-id (:enterprise-id body)]
    (cond
      (nil? enterprise-id)
      (bad-request "enterprise-id is required")

      (nil? (:name body))
      (bad-request "name is required")

      :else
      (try
        (let [professional-id (h/uuid)
              professional {:id [:cast professional-id :uuid]
                            :enterprise-id [:cast enterprise-id :uuid]
                            :user-id (when (:user-id body)
                                       [:cast (:user-id body) :uuid])
                            :name (:name body)
                            :specialty (:specialty body)
                            :active true}
              _ (db/execute-one! ds
                                 {:insert-into :core.professionals
                                  :values [professional]
                                  :returning [:*]})]
          (created {:id professional-id
                    :name (:name body)
                    :specialty (:specialty body)}))
        (catch Exception e
          (log/error e "Failed to create professional")
          (error (.getMessage e)))))))

(defn update-professional
  "Update an existing professional.
   
   Only MASTER/ADMIN of the enterprise can update.
   Supports partial updates."
  [{:keys [ds]} request]
  (let [professional-id (get-in request [:path-params :id])
        body (:body-params request)
        enterprise-id (get-in request [:user :enterprise-id])]
    (cond
      (nil? professional-id)
      (bad-request "Professional ID is required")

      (nil? enterprise-id)
      (bad-request "Enterprise context required")

      :else
      (try
        ;; Verify professional belongs to this enterprise
        (let [existing (db/execute-one! ds
                                        {:select [:id :enterprise-id]
                                         :from [:core.professionals]
                                         :where [:and
                                                 [:= :id [:cast professional-id :uuid]]
                                                 [:= :enterprise-id [:cast enterprise-id :uuid]]]})]
          (if-not existing
            (not-found "Professional not found or does not belong to this enterprise")
            (let [update-data (cond-> {}
                                (:name body) (assoc :name (:name body))
                                (:specialty body) (assoc :specialty (:specialty body))
                                (some? (:active body)) (assoc :active (:active body)))]
              (if (empty? update-data)
                (bad-request "No fields provided to update")
                (let [updated (first (db/update! ds :core.professionals
                                                 update-data
                                                 [:= :id [:cast professional-id :uuid]]))]
                  (ok {:id (str (:id updated))
                       :name (:name updated)
                       :specialty (:specialty updated)
                       :active (:active updated)}))))))
        (catch Exception e
          (log/error e "Failed to update professional" professional-id)
          (error (.getMessage e)))))))

(defn deactivate-professional
  "Soft-delete a professional (set active = false).
   
   Professionals are not physically deleted to preserve appointment history."
  [{:keys [ds]} request]
  (let [professional-id (get-in request [:path-params :id])
        enterprise-id (get-in request [:user :enterprise-id])]
    (cond
      (nil? professional-id)
      (bad-request "Professional ID is required")

      (nil? enterprise-id)
      (bad-request "Enterprise context required")

      :else
      (try
        (let [existing (db/execute-one! ds
                                        {:select [:id]
                                         :from [:core.professionals]
                                         :where [:and
                                                 [:= :id [:cast professional-id :uuid]]
                                                 [:= :enterprise-id [:cast enterprise-id :uuid]]]})]
          (if-not existing
            (not-found "Professional not found or does not belong to this enterprise")
            (do
              (db/update! ds :core.professionals
                          {:active false}
                          [:= :id [:cast professional-id :uuid]])
              (ok {:id professional-id
                   :message "Professional deactivated successfully"}))))
        (catch Exception e
          (log/error e "Failed to deactivate professional" professional-id)
          (error (.getMessage e)))))))

(defn update-professional-avatar
  "Upload and update professional avatar."
  [deps request]
  (let [professional-id (get-in request [:path-params :id])
        file-params (get-in request [:params "file"])
        avatar-url (storage/save-file! file-params)]
    (if avatar-url
      (do
        (db/update-professional-avatar! (:ds deps) professional-id avatar-url)
        (when-let [producer (:kafka-producer deps)]
          (let [event (kafka/make-event :professional.updated {:professional-id professional-id :avatar-url avatar-url})]
            (kafka/send-event! producer "professional.updated" professional-id event)))
        (ok {:id professional-id
             :avatar-url avatar-url}))
      (error "Failed to upload avatar"))))
