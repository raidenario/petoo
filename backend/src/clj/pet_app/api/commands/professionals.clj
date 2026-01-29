(ns pet-app.api.commands.professionals
  "Professional command handlers."
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.infra.storage :as storage]
            [clojure.tools.logging :as log]))

(defn create-professional
  "Create a new professional."
  [{:keys [ds]} request]
  (let [body (:body-params request)]
    (try
      (let [professional-id (h/uuid)
            professional {:id [:cast professional-id :uuid]
                          :tenant-id [:cast (:tenant-id body) :uuid]
                          :user-id [:cast (:user-id body) :uuid]
                          :name (:name body)
                          :specialty (:specialty body)
                          :active true}
            _ (db/execute-one! ds
                               {:insert-into :core.professionals
                                :values [professional]
                                :returning [:*]})]
        {:status 201
         :body {:id professional-id
                :name (:name body)}})
      (catch Exception e
        (log/error e "Failed to create professional")
        (h/response-error (.getMessage e))))))

(defn update-professional-avatar [deps request]
  (let [professional-id (get-in request [:path-params :id])
        file-params (get-in request [:params "file"])
        avatar-url (storage/save-file! file-params)]
    (if avatar-url
      (do
        (db/update-professional-avatar! (:ds deps) professional-id avatar-url)
        (when-let [producer (:kafka-producer deps)]
          (let [event (kafka/make-event :professional.updated {:professional-id professional-id :avatar-url avatar-url})]
            (kafka/send-event! producer "professional.updated" professional-id event)))
        {:status 200
         :body {:id professional-id
                :avatar-url avatar-url}})
      (h/response-error "Failed to upload avatar"))))
