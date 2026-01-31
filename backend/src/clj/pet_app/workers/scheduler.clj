(ns pet-app.workers.scheduler
  "Scheduler worker for time-based transitions.
   
   Handles:
   - Pet status transitions (ACTIVE <-> IN_CARE) based on appointment times
   - Appointment status transitions (CONFIRMED -> IN_PROGRESS -> COMPLETED)
   
   This prepares the foundation for the future Pet Diary feature."
  (:require [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [clojure.tools.logging :as log])
  (:import [java.time Instant]))

(defn find-appointments-to-start
  "Find confirmed appointments whose start time has passed."
  [ds]
  (db/execute! ds
               {:select [:a.id :a.pet-id :a.user-id :a.enterprise-id :a.service-id
                         :a.start-time :a.end-time
                         [:p.name :pet-name]
                         [:e.name :enterprise-name]]
                :from [[:core.appointments :a]]
                :left-join [[:core.pets :p] [:= :a.pet-id :p.id]
                            [:core.enterprises :e] [:= :a.enterprise-id :e.id]]
                :where [:and
                        [:= :a.status "CONFIRMED"]
                        [:<= :a.start-time [:now]]]}))

(defn find-appointments-to-end
  "Find in-progress appointments whose end time has passed."
  [ds]
  (db/execute! ds
               {:select [:a.id :a.pet-id :a.user-id :a.enterprise-id
                         :a.start-time :a.end-time
                         [:p.name :pet-name]]
                :from [[:core.appointments :a]]
                :left-join [[:core.pets :p] [:= :a.pet-id :p.id]]
                :where [:and
                        [:= :a.status "IN_PROGRESS"]
                        [:<= :a.end-time [:now]]]}))

(defn start-care!
  "Transition appointment to IN_PROGRESS and pet to IN_CARE."
  [ds kafka-producer topics appointment]
  (let [appt-id (:id appointment)
        pet-id (:pet-id appointment)
        now (Instant/now)]
    (try
      ;; Update appointment status
      (db/execute-one! ds
                       {:update :core.appointments
                        :set {:status "IN_PROGRESS"
                              :updated-at [:now]}
                        :where [:= :id appt-id]})

      ;; Update pet status and link to appointment
      (when pet-id
        (db/execute-one! ds
                         {:update :core.pets
                          :set {:status "IN_CARE"
                                :current-appointment-id appt-id
                                :care-started-at [:now]
                                :updated-at [:now]}
                          :where [:= :id pet-id]}))

      ;; Publish event for notifications
      (when kafka-producer
        (let [event (kafka/make-event
                     :pet.care-started
                     {:appointment-id (str appt-id)
                      :pet-id (str pet-id)
                      :pet-name (:pet-name appointment)
                      :enterprise-id (str (:enterprise-id appointment))
                      :enterprise-name (:enterprise-name appointment)
                      :user-id (str (:user-id appointment))
                      :started-at (str now)})]
          (kafka/send-event! kafka-producer
                             (:pet-events topics "pet-events")
                             (str pet-id)
                             event)))

      (log/info "Started care for pet" (:pet-name appointment)
                "at enterprise" (:enterprise-name appointment)
                "| appointment:" (str appt-id))

      :success
      (catch Exception e
        (log/error e "Failed to start care for appointment" (str appt-id))
        :error))))

(defn end-care!
  "Transition appointment to COMPLETED and pet back to ACTIVE."
  [ds kafka-producer topics appointment]
  (let [appt-id (:id appointment)
        pet-id (:pet-id appointment)
        now (Instant/now)]
    (try
      ;; Update appointment status
      (db/execute-one! ds
                       {:update :core.appointments
                        :set {:status "COMPLETED"
                              :updated-at [:now]}
                        :where [:= :id appt-id]})

      ;; Update pet status back to ACTIVE
      (when pet-id
        (db/execute-one! ds
                         {:update :core.pets
                          :set {:status "ACTIVE"
                                :current-appointment-id nil
                                :care-started-at nil
                                :updated-at [:now]}
                          :where [:= :id pet-id]}))

      ;; Publish event for notifications
      (when kafka-producer
        (let [event (kafka/make-event
                     :pet.care-ended
                     {:appointment-id (str appt-id)
                      :pet-id (str pet-id)
                      :pet-name (:pet-name appointment)
                      :user-id (str (:user-id appointment))
                      :ended-at (str now)})]
          (kafka/send-event! kafka-producer
                             (:pet-events topics "pet-events")
                             (str pet-id)
                             event)))

      (log/info "Ended care for pet" (:pet-name appointment)
                "| appointment:" (str appt-id))

      :success
      (catch Exception e
        (log/error e "Failed to end care for appointment" (str appt-id))
        :error))))

(defn run-scheduler-tick!
  "Run one tick of the scheduler.
   
   Checks for appointments that need status transitions."
  [{:keys [ds kafka-producer topics]}]
  (try
    ;; Start care for confirmed appointments whose time has come
    (let [to-start (find-appointments-to-start ds)]
      (when (seq to-start)
        (log/info "Found" (count to-start) "appointments to start care")
        (doseq [appt to-start]
          (start-care! ds kafka-producer topics appt))))

    ;; End care for in-progress appointments that have finished
    (let [to-end (find-appointments-to-end ds)]
      (when (seq to-end)
        (log/info "Found" (count to-end) "appointments to end care")
        (doseq [appt to-end]
          (end-care! ds kafka-producer topics appt))))

    (catch Exception e
      (log/error e "Scheduler tick failed"))))

(defn start-scheduler!
  "Start the scheduler worker.
   
   Runs every `interval-ms` milliseconds (default: 30 seconds)."
  [{:keys [ds kafka-producer topics interval-ms]
    :or {interval-ms 30000}}]
  (log/info "Starting scheduler worker with interval:" interval-ms "ms")

  (let [running (atom true)
        scheduler-thread
        (Thread.
         (fn []
           (while @running
             (try
               (run-scheduler-tick! {:ds ds
                                     :kafka-producer kafka-producer
                                     :topics topics})
               (Thread/sleep interval-ms)
               (catch InterruptedException _
                 (log/info "Scheduler interrupted, stopping...")
                 (reset! running false))
               (catch Exception e
                 (log/error e "Scheduler error, will retry...")
                 (Thread/sleep 5000))))))]

    (.setName scheduler-thread "pet-care-scheduler")
    (.setDaemon scheduler-thread true)
    (.start scheduler-thread)

    ;; Return control handle
    {:thread scheduler-thread
     :running running
     :stop! (fn []
              (reset! running false)
              (.interrupt scheduler-thread)
              (log/info "Scheduler stopped"))}))

(defn stop-scheduler!
  "Stop the scheduler worker."
  [{:keys [stop!]}]
  (when stop!
    (stop!)))
