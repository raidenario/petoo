(ns pet-app.api.commands.pets
  "Pet command handlers."
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.domain.schemas :as schemas]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.infra.storage :as storage]
            [clojure.tools.logging :as log]
            [clojure.data.json :as json]))

(defn create-pet
  "Create a new pet."
  [{:keys [ds]} request]
  (let [body (:body-params request)
        validation (schemas/validate schemas/CreatePet body)]
    (if-not (:valid? validation)
      (h/response-bad-request (:errors validation))
      (try
        (let [pet-id (h/uuid)
              birth-date (:birth-date body)
              pet {:id [:cast pet-id :uuid]
                   :user-id [:cast (:user-id body) :uuid]
                   :name (:name body)
                   :species (or (:species body) "DOG")
                   :breed (:breed body)
                   :size (:size body)
                   :birth-date (when birth-date [:cast birth-date :date])
                   :weight-kg (:weight-kg body)
                   :notes [:cast (json/write-str (or (:notes body) {})) :jsonb]
                   :medical-notes [:cast (json/write-str (or (:medical-notes body) {})) :jsonb]
                   :status "ACTIVE"}
              _ (db/execute-one! ds
                                 {:insert-into :core.pets
                                  :values [pet]
                                  :returning [:*]})]
          {:status 201
           :body {:id pet-id
                  :name (:name body)
                  :species (or (:species body) "DOG")}})
        (catch Exception e
          (log/error e "Failed to create pet")
          (h/response-error (.getMessage e)))))))

(defn update-pet-photo [deps request]
  (let [pet-id (get-in request [:path-params :id])
        file-params (get-in request [:params "file"])
        photo-url (storage/save-file! file-params)]
    (if photo-url
      (do
        (db/update-pet-photo! (:ds deps) pet-id photo-url)
        (when-let [producer (:kafka-producer deps)]
          (let [event (kafka/make-event :pet.updated {:pet-id pet-id :photo-url photo-url})]
            (kafka/send-event! producer "pet.updated" pet-id event)))
        {:status 200
         :body {:id pet-id
                :photo-url photo-url}})
      (h/response-error "Failed to upload photo"))))
