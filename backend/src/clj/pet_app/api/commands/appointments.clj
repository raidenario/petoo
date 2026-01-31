(ns pet-app.api.commands.appointments
  "Appointment command handlers."
  (:require [pet-app.api.commands.helpers :as h]
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
            (h/response-bad-request {:service-id "Service not found"})

            :else
            (h/response-error (.getMessage e))))))))
