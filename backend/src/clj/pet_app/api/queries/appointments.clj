(ns pet-app.api.queries.appointments
  "Appointment query handlers."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn list-appointments
  "List appointments with optional filters."
  [{:keys [ds]} request]
  (let [params (:query-params request)
        tenant-id (get params "tenant-id")
        user-id (get params "user-id")
        professional-id (get params "professional-id")
        status (get params "status")
        from-date (get params "from")
        to-date (get params "to")
        limit (min 100 (Integer/parseInt (or (get params "limit") "50")))
        offset (Integer/parseInt (or (get params "offset") "0"))]
    (if-not tenant-id
      {:status 400
       :body {:error "tenant-id is required"}}
      (try
        (let [where-clauses (cond-> [:and [:= :a.tenant-id [:cast tenant-id :uuid]]]
                              user-id (conj [:= :a.user-id [:cast user-id :uuid]])
                              professional-id (conj [:= :a.professional-id [:cast professional-id :uuid]])
                              status (conj [:= :a.status status])
                              from-date (conj [:>= :a.start-time [:cast from-date :timestamptz]])
                              to-date (conj [:<= :a.start-time [:cast to-date :timestamptz]]))
              appointments (db/execute! ds
                                        {:select [[:a.id :id]
                                                  [:a.status :status]
                                                  [:a.start-time :start-time]
                                                  [:a.end-time :end-time]
                                                  [:a.notes :notes]
                                                  [:u.name :user-name]
                                                  [:u.email :user-email]
                                                  [:p.name :pet-name]
                                                  [:p.species :pet-species]
                                                  [:pr.name :professional-name]
                                                  [:s.name :service-name]
                                                  [:s.price-cents :price-cents]]
                                         :from [[:core.appointments :a]]
                                         :left-join [[:core.users :u] [:= :a.user-id :u.id]
                                                     [:core.pets :p] [:= :a.pet-id :p.id]
                                                     [:core.professionals :pr] [:= :a.professional-id :pr.id]
                                                     [:core.services :s] [:= :a.service-id :s.id]]
                                         :where where-clauses
                                         :order-by [[:a.start-time :desc]]
                                         :limit limit
                                         :offset offset})
              results (mapv (fn [row]
                              {:id (str (:id row))
                               :status (:status row)
                               :start-time (str (:start-time row))
                               :end-time (str (:end-time row))
                               :notes (:notes row)
                               :user {:name (:user-name row)
                                      :email (:user-email row)}
                               :pet {:name (:pet-name row)
                                     :species (:pet-species row)}
                               :professional {:name (:professional-name row)}
                               :service {:name (:service-name row)
                                         :price-cents (:price-cents row)}})
                            appointments)]
          {:status 200
           :body {:appointments results
                  :count (count results)
                  :limit limit
                  :offset offset}})
        (catch Exception e
          (log/error e "Error listing appointments")
          {:status 500
           :body {:error "Failed to fetch appointments"}})))))

(defn get-appointment
  "Get a single appointment by ID."
  [{:keys [ds]} request]
  (let [id (get-in request [:path-params :id])]
    (try
      (let [result (db/execute-one! ds
                                    {:select [[:a.id :id]
                                              [:a.tenant-id :tenant-id]
                                              [:a.status :status]
                                              [:a.start-time :start-time]
                                              [:a.end-time :end-time]
                                              [:a.notes :notes]
                                              [:a.created-at :created-at]
                                              [:u.id :user-id]
                                              [:u.name :user-name]
                                              [:u.email :user-email]
                                              [:u.phone :user-phone]
                                              [:p.id :pet-id]
                                              [:p.name :pet-name]
                                              [:p.species :pet-species]
                                              [:p.breed :pet-breed]
                                              [:pr.id :professional-id]
                                              [:pr.name :professional-name]
                                              [:pr.specialty :professional-specialty]
                                              [:s.id :service-id]
                                              [:s.name :service-name]
                                              [:s.price-cents :price-cents]
                                              [:s.duration-minutes :duration-minutes]]
                                     :from [[:core.appointments :a]]
                                     :left-join [[:core.users :u] [:= :a.user-id :u.id]
                                                 [:core.pets :p] [:= :a.pet-id :p.id]
                                                 [:core.professionals :pr] [:= :a.professional-id :pr.id]
                                                 [:core.services :s] [:= :a.service-id :s.id]]
                                     :where [:= :a.id [:cast id :uuid]]})]
        (if result
          {:status 200
           :body {:id (str (:id result))
                  :tenant-id (str (:tenant-id result))
                  :status (:status result)
                  :start-time (str (:start-time result))
                  :end-time (str (:end-time result))
                  :notes (:notes result)
                  :created-at (str (:created-at result))
                  :user {:id (str (:user-id result))
                         :name (:user-name result)
                         :email (:user-email result)
                         :phone (:user-phone result)}
                  :pet {:id (str (:pet-id result))
                        :name (:pet-name result)
                        :species (:pet-species result)
                        :breed (:pet-breed result)}
                  :professional {:id (str (:professional-id result))
                                 :name (:professional-name result)
                                 :specialty (:professional-specialty result)}
                  :service {:id (str (:service-id result))
                            :name (:service-name result)
                            :price-cents (:price-cents result)
                            :duration-minutes (:duration-minutes result)}}}
          {:status 404
           :body {:error "Appointment not found"}}))
      (catch Exception e
        (log/error e "Error fetching appointment" id)
        {:status 500
         :body {:error "Failed to fetch appointment"}}))))
