(ns pet-app.api.queries.client-queries
  "Query helpers for Client (pet owner) endpoints.
   
   Provides queries scoped to the authenticated client."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

;; ============================================
;; Client Pets Queries
;; ============================================

(defn list-client-pets
  "List all pets belonging to the authenticated client."
  [{:keys [ds]} request]
  (let [client-id (:client-id request)]
    (if-not client-id
      {:status 403
       :body {:error "Client authentication required"}}

      (try
        (let [pets (db/execute! ds
                                {:select [:p.id :p.name :p.species :p.breed :p.size
                                          :p.birth-date :p.weight-kg :p.photo-url
                                          :p.notes :p.status
                                          :p.current-appointment-id :p.care-started-at
                                          :p.created-at :p.updated-at]
                                 :from [[:core.pets :p]]
                                 :where [:= :p.client-id [:cast client-id :uuid]]
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
                                    (let [appt (db/execute-one! ds
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
          {:status 200
           :body {:pets pets-with-care
                  :count (count pets-with-care)}})
        (catch Exception e
          (log/error e "Failed to list client pets")
          {:status 500
           :body {:error "Failed to list pets"}})))))

(defn get-client-pet
  "Get a specific pet belonging to the authenticated client."
  [{:keys [ds]} request]
  (let [client-id (:client-id request)
        pet-id (get-in request [:path-params :id])]
    (if-not client-id
      {:status 403
       :body {:error "Client authentication required"}}

      (try
        (let [pet (db/execute-one! ds
                                   {:select :*
                                    :from :core.pets
                                    :where [:and
                                            [:= :id [:cast pet-id :uuid]]
                                            [:= :client-id [:cast client-id :uuid]]]})]
          (if pet
            {:status 200
             :body {:pet (update pet :id str)}}
            {:status 404
             :body {:error "Pet not found"}}))
        (catch Exception e
          (log/error e "Failed to get pet:" pet-id)
          {:status 500
           :body {:error "Failed to get pet"}})))))

;; ============================================
;; Client Appointments Queries
;; ============================================

(defn list-client-appointments
  "List all appointments for the authenticated client."
  [{:keys [ds]} request]
  (let [client-id (:client-id request)
        {:keys [status upcoming]} (:query-params request)]
    (if-not client-id
      {:status 403
       :body {:error "Client authentication required"}}

      (try
        (let [base-query {:select [:a.*
                                   [:p.name :pet-name]
                                   [:s.name :service-name]
                                   [:s.price-cents :service-price]
                                   [:pr.name :professional-name]
                                   [:e.name :enterprise-name]
                                   [:e.contact-phone :enterprise-phone]]
                          :from [[:core.appointments :a]]
                          :left-join [[:core.pets :p] [:= :a.pet-id :p.id]
                                      [:core.services :s] [:= :a.service-id :s.id]
                                      [:core.professionals :pr] [:= :a.professional-id :pr.id]
                                      [:core.enterprises :e] [:= :a.enterprise-id :e.id]]
                          :where [:= :a.client-id [:cast client-id :uuid]]
                          :order-by [[:a.start-time :desc]]}

              filtered-query (cond-> base-query
                               status
                               (update :where #(vector :and % [:= :a.status status]))

                               (= upcoming "true")
                               (update :where #(vector :and % [:> :a.start-time [:now]])))

              appointments (db/execute! ds filtered-query)]
          {:status 200
           :body {:appointments (mapv #(update % :id str) appointments)
                  :count (count appointments)}})
        (catch Exception e
          (log/error e "Failed to list client appointments")
          {:status 500
           :body {:error "Failed to list appointments"}})))))

;; ============================================
;; Enterprise Discovery (Geolocation)
;; ============================================

(defn list-nearby-enterprises
  "List enterprises near the client's location.
   
   Query params:
     - lat: client latitude
     - lon: client longitude
     - radius: search radius in km (default 10)"
  [{:keys [ds]} request]
  (let [{:keys [lat lon radius]} (:query-params request)
        radius-km (or (when radius (Double/parseDouble radius)) 10.0)]
    (cond
      (nil? lat)
      {:status 400 :body {:error "Latitude (lat) is required"}}

      (nil? lon)
      {:status 400 :body {:error "Longitude (lon) is required"}}

      :else
      (try
        (let [lat-num (Double/parseDouble lat)
              lon-num (Double/parseDouble lon)
              ;; Aproximação simples: 1 grau ≈ 111km
              lat-range (/ radius-km 111.0)
              lon-range (/ radius-km (* 111.0 (Math/cos (Math/toRadians lat-num))))

              enterprises (db/execute! ds
                                       {:select [:id :name :slug :contact-phone
                                                 :contact-email :address
                                                 :latitude :longitude :theme-config]
                                        :from :core.enterprises
                                        :where [:and
                                                [:= :status "ACTIVE"]
                                                [:>= :latitude (- lat-num lat-range)]
                                                [:<= :latitude (+ lat-num lat-range)]
                                                [:>= :longitude (- lon-num lon-range)]
                                                [:<= :longitude (+ lon-num lon-range)]]
                                        :order-by [[:name :asc]]})]
          {:status 200
           :body {:enterprises (mapv #(update % :id str) enterprises)
                  :count (count enterprises)
                  :search {:latitude lat-num
                           :longitude lon-num
                           :radius-km radius-km}}})
        (catch NumberFormatException _
          {:status 400 :body {:error "Invalid latitude or longitude format"}})
        (catch Exception e
          (log/error e "Failed to list nearby enterprises")
          {:status 500
           :body {:error "Failed to search enterprises"}})))))

(defn get-enterprise-services
  "Get services offered by a specific enterprise."
  [{:keys [ds]} request]
  (let [enterprise-id (get-in request [:path-params :enterprise-id])]
    (try
      (let [services (db/execute! ds
                                  {:select [:id :name :description :category
                                            :price-cents :duration-minutes]
                                   :from :core.services
                                   :where [:and
                                           [:= :enterprise-id [:cast enterprise-id :uuid]]
                                           [:= :active true]]
                                   :order-by [[:category :asc] [:name :asc]]})]
        {:status 200
         :body {:services (mapv #(update % :id str) services)
                :count (count services)}})
      (catch Exception e
        (log/error e "Failed to get enterprise services:" enterprise-id)
        {:status 500
         :body {:error "Failed to get services"}}))))

(defn get-enterprise-professionals
  "Get professionals at a specific enterprise."
  [{:keys [ds]} request]
  (let [enterprise-id (get-in request [:path-params :enterprise-id])]
    (try
      (let [professionals (db/execute! ds
                                       {:select [:id :name :specialty :availability]
                                        :from :core.professionals
                                        :where [:and
                                                [:= :enterprise-id [:cast enterprise-id :uuid]]
                                                [:= :active true]]
                                        :order-by [[:name :asc]]})]
        {:status 200
         :body {:professionals (mapv #(update % :id str) professionals)
                :count (count professionals)}})
      (catch Exception e
        (log/error e "Failed to get enterprise professionals:" enterprise-id)
        {:status 500
         :body {:error "Failed to get professionals"}}))))
