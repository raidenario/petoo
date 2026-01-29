(ns pet-app.api.queries.schedule
  "Schedule query handlers."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn get-professional-schedule
  "Get appointments for a professional in a date range."
  [{:keys [ds]} request]
  (let [professional-id (get-in request [:path-params :professional-id])
        params (:query-params request)
        tenant-id (get params "tenant-id")
        date (get params "date")
        days (Integer/parseInt (or (get params "days") "7"))]
    (if (or (not tenant-id) (not date))
      {:status 400
       :body {:error "tenant-id and date are required"}}
      (try
        (let [appointments (db/execute! ds
                                        {:select [[:a.id :id]
                                                  [:a.start-time :start-time]
                                                  [:a.end-time :end-time]
                                                  [:a.status :status]
                                                  [:p.name :pet-name]
                                                  [:s.name :service-name]
                                                  [:s.duration-minutes :duration-minutes]]
                                         :from [[:core.appointments :a]]
                                         :left-join [[:core.pets :p] [:= :a.pet-id :p.id]
                                                     [:core.services :s] [:= :a.service-id :s.id]]
                                         :where [:and
                                                 [:= :a.tenant-id [:cast tenant-id :uuid]]
                                                 [:= :a.professional-id [:cast professional-id :uuid]]
                                                 [:>= :a.start-time [:cast date :date]]
                                                 [:< :a.start-time [:+ [:cast date :date] [:raw (str days " days")]]]
                                                 [:in :a.status ["PENDING" "CONFIRMED"]]]
                                         :order-by [[:a.start-time :asc]]})]
          {:status 200
           :body {:professional-id professional-id
                  :from date
                  :days days
                  :appointments (mapv (fn [apt]
                                        {:id (str (:id apt))
                                         :start-time (str (:start-time apt))
                                         :end-time (str (:end-time apt))
                                         :status (:status apt)
                                         :pet-name (:pet-name apt)
                                         :service-name (:service-name apt)
                                         :duration-minutes (:duration-minutes apt)})
                                      appointments)}})
        (catch Exception e
          (log/error e "Error fetching schedule for" professional-id)
          {:status 500
           :body {:error "Failed to fetch schedule"}})))))
