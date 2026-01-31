(ns pet-app.api.queries.pet-queries
  "Query handlers for pets."
  (:require [pet-app.infra.db :as db]
            [pet-app.api.helpers :refer [ok error not-found]]
            [clojure.tools.logging :as log]))

(defn list-user-pets
  "List all pets belonging to the authenticated user.
   
   Returns pets with their current status and appointment info if IN_CARE."
  [{:keys [db]} request]
  (let [user-id (get-in request [:user :user-id])]
    (if-not user-id
      (error 401 "Authentication required")
      (try
        (let [pets (db/execute! db
                                {:select [:p.id :p.name :p.species :p.breed :p.size
                                          :p.birth-date :p.weight-kg :p.photo-url :p.status
                                          :p.current-appointment-id :p.care-started-at
                                          :p.created-at]
                                 :from [[:core.pets :p]]
                                 :where [:= :p.user-id [:cast user-id :uuid]]
                                 :order-by [[:p.name :asc]]})

              ;; For pets IN_CARE, fetch appointment details
              pets-with-care (mapv
                              (fn [pet]
                                (let [base-pet {:id (str (:id pet))
                                                :name (:name pet)
                                                :species (:species pet)
                                                :breed (:breed pet)
                                                :size (:size pet)
                                                :birth_date (:birth-date pet)
                                                :weight_kg (:weight-kg pet)
                                                :photo_url (:photo-url pet)
                                                :status (:status pet)
                                                :created_at (:created-at pet)}]
                                  (if (and (= (:status pet) "IN_CARE")
                                           (:current-appointment-id pet))
                                    ;; Fetch appointment details
                                    (let [appt (db/execute-one! db
                                                                {:select [:a.id :a.start-time :a.end-time
                                                                          [:e.name :enterprise-name]
                                                                          [:s.name :service-name]]
                                                                 :from [[:core.appointments :a]]
                                                                 :left-join [[:core.enterprises :e] [:= :a.enterprise-id :e.id]
                                                                             [:core.services :s] [:= :a.service-id :s.id]]
                                                                 :where [:= :a.id (:current-appointment-id pet)]})]
                                      (assoc base-pet
                                             :care_started_at (:care-started-at pet)
                                             :current_appointment
                                             (when appt
                                               {:id (str (:id appt))
                                                :enterprise_name (:enterprise-name appt)
                                                :service_name (:service-name appt)
                                                :start_time (:start-time appt)
                                                :end_time (:end-time appt)})))
                                    ;; Not in care, no appointment info needed
                                    (assoc base-pet :current_appointment nil))))
                              pets)]
          (ok {:pets pets-with-care
               :count (count pets-with-care)}))
        (catch Exception e
          (log/error e "Failed to list user pets")
          (error 500 "Failed to list pets"))))))

(defn get-pet-by-id
  "Get a single pet by ID.
   
   Only returns pet if it belongs to the authenticated user or
   the user is an enterprise admin with an active appointment for this pet."
  [{:keys [db]} request]
  (let [user-id (get-in request [:user :user-id])
        pet-id (get-in request [:path-params :pet-id])]
    (if-not user-id
      (error 401 "Authentication required")
      (try
        (let [pet (db/execute-one! db
                                   {:select [:p.*
                                             [:u.name :owner-name]
                                             [:u.phone :owner-phone]]
                                    :from [[:core.pets :p]]
                                    :left-join [[:core.users :u] [:= :p.user-id :u.id]]
                                    :where [:= :p.id [:cast pet-id :uuid]]})]
          (if-not pet
            (not-found "Pet not found")
            ;; Check if user owns this pet or has an active appointment
            (let [is-owner (= (str (:user-id pet)) (str user-id))
                  has-appointment (when-not is-owner
                                    (db/execute-one! db
                                                     {:select [1]
                                                      :from [:core.appointments]
                                                      :where [:and
                                                              [:= :pet-id [:cast pet-id :uuid]]
                                                              [:in :status ["CONFIRMED" "IN_PROGRESS"]]
                                                              [:= :enterprise-id
                                                               {:select [:enterprise-id]
                                                                :from [:core.users]
                                                                :where [:= :id [:cast user-id :uuid]]}]]}))]
              (if (or is-owner has-appointment)
                (ok {:pet {:id (str (:id pet))
                           :name (:name pet)
                           :species (:species pet)
                           :breed (:breed pet)
                           :size (:size pet)
                           :birth_date (:birth-date pet)
                           :weight_kg (:weight-kg pet)
                           :photo_url (:photo-url pet)
                           :notes (:notes pet)
                           :status (:status pet)
                           :owner_name (:owner-name pet)
                           :owner_phone (:owner-phone pet)
                           :created_at (:created-at pet)}})
                (error 403 "You don't have access to this pet")))))
        (catch Exception e
          (log/error e "Failed to get pet")
          (error 500 "Failed to get pet"))))))
