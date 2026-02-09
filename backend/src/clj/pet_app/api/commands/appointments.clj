(ns pet-app.api.commands.appointments
  "Appointment command handlers.
   
   Operations:
   - create-appointment         (POST)
   - enterprise-cancel-appointment (POST /:id/cancel, enterprise side)
   - enterprise-reschedule      (PUT /:id/reschedule, enterprise side)"
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.api.helpers :refer [ok bad-request not-found error forbidden]]
            [pet-app.domain.schemas :as schemas]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [clojure.tools.logging :as log]))

(defn get-service-duration
  "Fetch service duration from database."
  [ds service-id]
  (db/execute-one! ds
                   {:select [:duration-minutes :price-cents]
                    :from [:core.services]
                    :where [:= :id [:cast service-id :uuid]]}))

(defn get-appointment-status
  "Get current status of an appointment."
  [ds appointment-id]
  (db/execute-one! ds
                   {:select [:id :status]
                    :from [:core.appointments]
                    :where [:= :id [:cast appointment-id :uuid]]}))

(defn get-user-wallet-balance
  "Get user's wallet balance."
  [ds user-id]
  (if-let [wallet (db/execute-one! ds
                                   {:select [:balance-cents]
                                    :from [:financial.wallets]
                                    :where [:and
                                            [:= :owner-id [:cast user-id :uuid]]
                                            [:= :owner-type "USER"]]})]
    (:balance-cents wallet)
    0))

(defn wait-for-processing
  "Wait for appointment to be processed by workers.
   Polls the database until status changes from PENDING or timeout."
  [ds appointment-id & {:keys [timeout-ms poll-interval]
                        :or {timeout-ms 10000 poll-interval 100}}]
  (let [deadline (+ (System/currentTimeMillis) timeout-ms)]
    (loop []
      (let [result (get-appointment-status ds appointment-id)
            status (:status result)
            now (System/currentTimeMillis)]
        (cond
          (= status "CONFIRMED")
          {:status "CONFIRMED" :appointment-id appointment-id}

          (= status "CANCELLED")
          {:status "CANCELLED" :appointment-id appointment-id :reason "Time slot conflict"}

          (>= now deadline)
          {:status "TIMEOUT" :appointment-id appointment-id
           :message "Processing timeout - appointment may still be processed"}

          :else
          (do
            (Thread/sleep poll-interval)
            (recur)))))))

(defn create-appointment
  "Create a new appointment command.
   
   When a user creates an appointment for themselves with WALLET_BALANCE payment,
   we verify they have sufficient balance before proceeding."
  [{:keys [ds kafka-producer topics]} request]
  (let [body (:body-params request)
        current-user (:user request)
        current-user-id (or (:user-id current-user) (:id current-user))
        validation (schemas/validate schemas/CreateAppointment body)]
    (if-not (:valid? validation)
      (h/response-bad-request (:errors validation))
      (try
        (let [service (get-service-duration ds (:service-id body))
              _ (when-not service
                  (throw (ex-info "Service not found" {:service-id (:service-id body)})))

              price-cents (:price-cents service)
              payment-method (or (:payment_method body) "PIX")
              requested-user-id (:user-id body)

              ;; Check if user is creating appointment for themselves
              is-self-booking (and current-user-id
                                   (= (str current-user-id) (str requested-user-id)))

              ;; For WALLET_BALANCE payments, verify sufficient balance upfront
              _ (when (and (= payment-method "WALLET_BALANCE") is-self-booking)
                  (let [balance (get-user-wallet-balance ds requested-user-id)]
                    (when (< balance price-cents)
                      (throw (ex-info "Insufficient wallet balance"
                                      {:type :insufficient-balance
                                       :balance balance
                                       :required price-cents})))))

              start-time (:start-time body)
              end-time (or (:end-time body)
                           (h/calculate-end-time start-time (:duration-minutes service)))
              appointment-id (h/uuid)

              ;; Support both enterprise-id and tenant-id for backwards compatibility
              enterprise-id (or (:enterprise-id body) (:tenant-id body))

              appointment {:id [:cast appointment-id :uuid]
                           :enterprise-id [:cast enterprise-id :uuid]
                           :user-id [:cast requested-user-id :uuid]
                           :pet-id [:cast (:pet-id body) :uuid]
                           :professional-id [:cast (:professional-id body) :uuid]
                           :service-id [:cast (:service-id body) :uuid]
                           :start-time [:cast start-time :timestamptz]
                           :end-time [:cast end-time :timestamptz]
                           :status "PENDING"
                           :notes (:notes body)}

              _ (db/execute-one! ds
                                 {:insert-into :core.appointments
                                  :values [appointment]
                                  :returning [:*]})

              event (kafka/make-event
                     :appointment.created
                     {:appointment-id appointment-id
                      :enterprise-id enterprise-id
                      :user-id requested-user-id
                      :pet-id (:pet-id body)
                      :professional-id (:professional-id body)
                      :service-id (:service-id body)
                      :start-time start-time
                      :end-time end-time
                      :price-cents price-cents
                      :payment-method payment-method
                      :is-self-booking is-self-booking})
              topic (:appointment-created topics)]

          (if kafka-producer
            (do
              (kafka/send-event! kafka-producer topic appointment-id event)
              (log/info "Waiting for availability worker to process appointment:" appointment-id
                        "| self-booking:" is-self-booking
                        "| payment:" payment-method)
              (let [result (wait-for-processing ds appointment-id :timeout-ms 10000)]
                (case (:status result)
                  "CONFIRMED"
                  {:status 201
                   :body {:id appointment-id
                          :status "CONFIRMED"
                          :payment_method payment-method
                          :price_cents price-cents
                          :message "Appointment confirmed successfully"}}

                  "CANCELLED"
                  {:status 409
                   :body {:error "Time slot not available"
                          :id appointment-id
                          :status "CANCELLED"
                          :message "The selected time slot conflicts with an existing appointment"}}

                  "TIMEOUT"
                  {:status 202
                   :body {:id appointment-id
                          :status "PENDING"
                          :message "Appointment created but validation is still processing. Check status later."}})))
            {:status 503
             :body {:error "Service unavailable"
                    :message "Event processing is not available. Please try again later."}}))
        (catch Exception e
          (log/error e "Failed to create appointment")
          (cond
            (= :insufficient-balance (:type (ex-data e)))
            {:status 400
             :body {:error "Insufficient balance"
                    :balance_cents (:balance (ex-data e))
                    :required_cents (:required (ex-data e))
                    :message "Your wallet balance is insufficient for this service"}}

            (= (:service-id (ex-data e)) (:service-id body))
            (bad-request {:service-id "Service not found"})

            :else
            (error (.getMessage e))))))))

;; ============================================
;; Enterprise: Cancel Appointment
;; ============================================

(defn enterprise-cancel-appointment
  "Cancel/reject an appointment from the enterprise side.
   
   Only MASTER/ADMIN/EMPLOYEE of the owning enterprise can cancel.
   Body (optional):
     {:reason 'Client no-show' or similar}"
  [{:keys [ds kafka-producer topics]} request]
  (let [appointment-id (get-in request [:path-params :id])
        enterprise-id (get-in request [:user :enterprise-id])
        body (:body-params request)
        reason (or (:reason body) "Cancelled by enterprise")]
    (cond
      (nil? appointment-id)
      (bad-request "Appointment ID is required")

      (nil? enterprise-id)
      (forbidden "Enterprise context required")

      :else
      (try
        (let [appointment (db/execute-one! ds
                                           {:select [:id :enterprise-id :status :client-id :pet-id :service-id]
                                            :from [:core.appointments]
                                            :where [:= :id [:cast appointment-id :uuid]]})]
          (cond
            (nil? appointment)
            (not-found "Appointment not found")

            (not= (str (:enterprise-id appointment)) (str enterprise-id))
            (forbidden "This appointment does not belong to your enterprise")

            (= (:status appointment) "CANCELLED")
            (bad-request "Appointment is already cancelled")

            (= (:status appointment) "COMPLETED")
            (bad-request "Cannot cancel a completed appointment")

            :else
            (do
              (db/update! ds :core.appointments
                          {:status "CANCELLED"
                           :notes reason}
                          [:= :id [:cast appointment-id :uuid]])

              ;; Emit cancellation event
              (when kafka-producer
                (let [event (kafka/make-event
                             :appointment.cancelled
                             {:appointment-id appointment-id
                              :enterprise-id (str enterprise-id)
                              :reason reason
                              :cancelled-by "enterprise"})]
                  (kafka/send-event! kafka-producer
                                     (or (:appointment-cancelled topics) "appointment.cancelled")
                                     appointment-id event)))

              (ok {:id appointment-id
                   :status "CANCELLED"
                   :reason reason
                   :message "Appointment cancelled successfully"}))))
        (catch Exception e
          (log/error e "Failed to cancel appointment" appointment-id)
          (error (.getMessage e)))))))

;; ============================================
;; Enterprise: Reschedule Appointment
;; ============================================

(defn enterprise-reschedule-appointment
  "Reschedule an appointment from the enterprise side.
   
   Body:
     {:start-time '2026-02-15T10:00:00Z'
      :end-time   '2026-02-15T11:00:00Z' ;; optional}"
  [{:keys [ds kafka-producer topics]} request]
  (let [appointment-id (get-in request [:path-params :id])
        enterprise-id (get-in request [:user :enterprise-id])
        body (:body-params request)
        new-start (:start-time body)]
    (cond
      (nil? appointment-id)
      (bad-request "Appointment ID is required")

      (nil? enterprise-id)
      (forbidden "Enterprise context required")

      (nil? new-start)
      (bad-request "start-time is required for rescheduling")

      :else
      (try
        (let [appointment (db/execute-one! ds
                                           {:select [:id :enterprise-id :status :service-id]
                                            :from [:core.appointments]
                                            :where [:= :id [:cast appointment-id :uuid]]})]
          (cond
            (nil? appointment)
            (not-found "Appointment not found")

            (not= (str (:enterprise-id appointment)) (str enterprise-id))
            (forbidden "This appointment does not belong to your enterprise")

            (= (:status appointment) "CANCELLED")
            (bad-request "Cannot reschedule a cancelled appointment")

            (= (:status appointment) "COMPLETED")
            (bad-request "Cannot reschedule a completed appointment")

            :else
            (let [service (get-service-duration ds (str (:service-id appointment)))
                  new-end (or (:end-time body)
                              (when (and service (:duration-minutes service))
                                (h/calculate-end-time new-start (:duration-minutes service))))
                  update-data (cond-> {:start-time [:cast new-start :timestamptz]
                                       :status "PENDING"}
                                new-end (assoc :end-time [:cast new-end :timestamptz]))]
              (db/update! ds :core.appointments
                          update-data
                          [:= :id [:cast appointment-id :uuid]])

              ;; Emit reschedule event
              (when kafka-producer
                (let [event (kafka/make-event
                             :appointment.rescheduled
                             {:appointment-id appointment-id
                              :enterprise-id (str enterprise-id)
                              :new-start-time new-start
                              :new-end-time new-end
                              :rescheduled-by "enterprise"})]
                  (kafka/send-event! kafka-producer
                                     (or (:appointment-rescheduled topics) "appointment.rescheduled")
                                     appointment-id event)))

              (ok {:id appointment-id
                   :status "PENDING"
                   :start-time new-start
                   :end-time new-end
                   :message "Appointment rescheduled successfully"}))))
        (catch Exception e
          (log/error e "Failed to reschedule appointment" appointment-id)
          (error (.getMessage e)))))))
