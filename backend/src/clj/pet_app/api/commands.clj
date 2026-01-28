(ns pet-app.api.commands
  "Command API handlers for write operations.
   
   All commands follow the pattern:
   1. Validate input with Malli
   2. Persist with PENDING status
   3. Publish event to Kafka
   4. Return 202 Accepted"
  (:require [pet-app.domain.schemas :as schemas]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.infra.auth :as auth]
            [pet-app.infra.storage :as storage]
            [clojure.tools.logging :as log]
            [honey.sql :as sql])
  (:import [java.util UUID]
           [java.time Instant Duration]))

;; ============================================
;; Helpers
;; ============================================

(defn- uuid []
  (str (UUID/randomUUID)))

(defn- now []
  (str (Instant/now)))

(defn- calculate-end-time
  "Calculate end time based on start time and duration."
  [start-time duration-minutes]
  (let [start (Instant/parse start-time)
        end (.plus start (Duration/ofMinutes duration-minutes))]
    (str end)))

(defn- response-accepted
  "Return 202 Accepted with resource id."
  [id & {:keys [message]}]
  {:status 202
   :body {:accepted true
          :id id
          :message (or message "Request accepted for processing")}})

(defn- response-bad-request
  "Return 400 Bad Request with validation errors."
  [errors]
  {:status 400
   :body {:error "Validation failed"
          :details errors}})

(defn- response-error
  "Return 500 Internal Server Error."
  [message]
  {:status 500
   :body {:error "Internal server error"
          :message message}})

;; ============================================
;; POST /api/v1/appointments
;; ============================================

(defn get-service-duration
  "Fetch service duration from database."
  [ds service-id]
  (let [result (db/execute-one! ds
                                {:select [:duration-minutes :price-cents]
                                 :from [:core.services]
                                 :where [:= :id [:cast service-id :uuid]]})]
    result))

(defn get-appointment-status
  "Get current status of an appointment."
  [ds appointment-id]
  (db/execute-one! ds
                   {:select [:id :status]
                    :from [:core.appointments]
                    :where [:= :id [:cast appointment-id :uuid]]}))

(defn wait-for-processing
  "Wait for appointment to be processed by workers.
   
   Polls the database until status changes from PENDING or timeout.
   
   Args:
     ds             - DataSource
     appointment-id - Appointment UUID string
     timeout-ms     - Maximum wait time in milliseconds (default 10000)
     poll-interval  - Polling interval in milliseconds (default 100)
   
   Returns:
     {:status \"CONFIRMED\"} or {:status \"CANCELLED\" :reason ...} or {:status \"TIMEOUT\"}"
  [ds appointment-id & {:keys [timeout-ms poll-interval]
                        :or {timeout-ms 10000 poll-interval 100}}]
  (let [start-time (System/currentTimeMillis)
        deadline (+ start-time timeout-ms)]
    (loop []
      (let [result (get-appointment-status ds appointment-id)
            status (:status result)
            now (System/currentTimeMillis)]
        (cond
          ;; Processed - return result
          (= status "CONFIRMED")
          {:status "CONFIRMED" :appointment-id appointment-id}

          (= status "CANCELLED")
          {:status "CANCELLED" :appointment-id appointment-id :reason "Time slot conflict"}

          ;; Timeout reached
          (>= now deadline)
          {:status "TIMEOUT" :appointment-id appointment-id
           :message "Processing timeout - appointment may still be processed"}

          ;; Still PENDING - wait and retry
          :else
          (do
            (Thread/sleep poll-interval)
            (recur)))))))

(defn create-appointment
  "Create a new appointment command.
   
   Flow:
   1. Validate request body
   2. Get service details (duration, price)
   3. Insert appointment with PENDING status
   4. Publish appointment.created event to Kafka
   5. Return 202 Accepted"
  [{:keys [ds kafka-producer topics]} request]
  (let [body (:body-params request)
        ;; Validate
        validation (schemas/validate schemas/CreateAppointment body)]

    (if-not (:valid? validation)
      (response-bad-request (:errors validation))

      (try
        ;; Get service details
        (let [service (get-service-duration ds (:service-id body))
              _ (when-not service
                  (throw (ex-info "Service not found" {:service-id (:service-id body)})))

              ;; Calculate times
              start-time (:start-time body)
              end-time (calculate-end-time start-time (:duration-minutes service))

              ;; Generate IDs
              appointment-id (uuid)

              ;; Insert into database with PENDING status
              appointment {:id [:cast appointment-id :uuid]
                           :tenant-id [:cast (:tenant-id body) :uuid]
                           :user-id [:cast (:user-id body) :uuid]
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

              ;; Create event for Availability Worker
              event (kafka/make-event
                     :appointment.created
                     {:appointment-id appointment-id
                      :tenant-id (:tenant-id body)
                      :user-id (:user-id body)
                      :pet-id (:pet-id body)
                      :professional-id (:professional-id body)
                      :service-id (:service-id body)
                      :start-time start-time
                      :end-time end-time
                      :price-cents (:price-cents service)})

              ;; Publish to Kafka
              topic (:appointment-created topics)]

          ;; Publish event
          (if kafka-producer
            (do
              (kafka/send-event! kafka-producer topic appointment-id event)
              (log/info "Event published:" topic "id:" appointment-id)

              ;; Wait for Availability Worker to process
              (log/info "Waiting for availability worker to process appointment:" appointment-id)
              (let [result (wait-for-processing ds appointment-id :timeout-ms 10000)]
                (case (:status result)
                  "CONFIRMED"
                  {:status 201
                   :body {:id appointment-id
                          :status "CONFIRMED"
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

            ;; No Kafka - cannot process
            {:status 503
             :body {:error "Service unavailable"
                    :message "Event processing is not available. Please try again later."}}))

        (catch Exception e
          (log/error e "Failed to create appointment")
          (if (= (:service-id (ex-data e)) (:service-id body))
            (response-bad-request {:service-id "Service not found"})
            (response-error (.getMessage e))))))))

;; ============================================
;; POST /api/v1/users
;; ============================================

(defn create-user
  "Create a new user."
  [{:keys [ds]} request]
  (let [body (:body-params request)
        validation (schemas/validate schemas/CreateUser body)]

    (if-not (:valid? validation)
      (response-bad-request (:errors validation))

      (try
        (let [user-id (uuid)
              password-hash (auth/hash-password (:password body))
              user {:id [:cast user-id :uuid]
                    :tenant-id [:cast (:tenant-id body) :uuid]
                    :email (:email body)
                    :password-hash password-hash
                    :name (:name body)
                    :phone (:phone body)
                    :role (or (:role body) "CUSTOMER")
                    :status "ACTIVE"}

              result (db/execute-one! ds
                                      {:insert-into :core.users
                                       :values [user]
                                       :returning [:id :email :name :role]})]

          {:status 201
           :body {:id user-id
                  :email (:email body)
                  :name (:name body)
                  :role (or (:role body) "CUSTOMER")}})

        (catch Exception e
          (log/error e "Failed to create user")
          (if (re-find #"duplicate key" (.getMessage e))
            (response-bad-request {:email "Email already exists"})
            (response-error (.getMessage e))))))))

;; ============================================
;; POST /api/v1/pets
;; ============================================

(defn create-pet
  "Create a new pet."
  [{:keys [ds]} request]
  (let [body (:body-params request)
        validation (schemas/validate schemas/CreatePet body)]

    (if-not (:valid? validation)
      (response-bad-request (:errors validation))

      (try
        (let [pet-id (uuid)
              birth-date (:birth-date body)
              pet {:id [:cast pet-id :uuid]
                   :tenant-id [:cast (:tenant-id body) :uuid]
                   :user-id [:cast (:user-id body) :uuid]
                   :name (:name body)
                   :species (or (:species body) "DOG")
                   :breed (:breed body)
                   :size (:size body)
                   :birth-date (when birth-date [:cast birth-date :date])
                   :weight-kg (:weight-kg body)
                   :notes (:notes body)
                   :status "ACTIVE"}

              result (db/execute-one! ds
                                      {:insert-into :core.pets
                                       :values [pet]
                                       :returning [:*]})]

          {:status 201
           :body {:id pet-id
                  :name (:name body)
                  :species (or (:species body) "DOG")}})

        (catch Exception e
          (log/error e "Failed to create pet")
          (response-error (.getMessage e)))))))


(defn update-pet-photo [deps request]
  (let [pet-id (get-in request [:path-params :id])
        file-params (get-in request [:params "file"])
        photo-url (storage/save-file! file-params)]
    (if photo-url
      (do
        (db/update-pet-photo! (:ds deps) pet-id photo-url)
        ;; Publish event for read model updates
        (when-let [producer (:kafka-producer deps)]
          (let [event (kafka/make-event :pet.updated {:pet-id pet-id :photo-url photo-url})]
            (kafka/send-event! producer "pet.updated" pet-id event)))
        {:status 200
         :body {:id pet-id
                :photo-url photo-url}})
      (response-error "Failed to upload photo"))))

(defn update-professional-avatar [deps request]
  (let [professional-id (get-in request [:path-params :id])
        file-params (get-in request [:params "file"])
        avatar-url (storage/save-file! file-params)]
    (if avatar-url
      (do
        (db/update-professional-avatar! (:ds deps) professional-id avatar-url)
        ;; Publish event for read model updates
        (when-let [producer (:kafka-producer deps)]
          (let [event (kafka/make-event :professional.updated {:professional-id professional-id :avatar-url avatar-url})]
            (kafka/send-event! producer "professional.updated" professional-id event)))
        {:status 200
         :body {:id professional-id
                :avatar-url avatar-url}})
      (response-error "Failed to upload avatar"))))

(defn update-tenant-logo [deps request]
  (let [tenant-id (get-in request [:path-params :id])
        file-params (get-in request [:params "file"])
        logo-url (storage/save-file! file-params)]
    (if logo-url
      (do
        (db/update-tenant-logo! (:ds deps) tenant-id logo-url)
        ;; Publish event for read model updates
        (when-let [producer (:kafka-producer deps)]
          (let [event (kafka/make-event :tenant.updated {:tenant-id tenant-id :logo-url logo-url})]
            (kafka/send-event! producer "tenant.updated" tenant-id event)))
        {:status 200
         :body {:id tenant-id
                :logo-url logo-url}})
      (response-error "Failed to upload logo"))))



;; ============================================
;; POST /api/v1/services
;; ============================================

(defn create-service
  "Create a new service."
  [{:keys [ds]} request]
  (let [body (:body-params request)]
    (try
      (let [service-id (uuid)
            service {:id [:cast service-id :uuid]
                     :tenant-id [:cast (:tenant-id body) :uuid]
                     :name (:name body)
                     :description (:description body)
                     :category (:category body)
                     :price-cents (:price-cents body)
                     :duration-minutes (:duration-minutes body)
                     :active true}

            result (db/execute-one! ds
                                    {:insert-into :core.services
                                     :values [service]
                                     :returning [:*]})]

        {:status 201
         :body {:id service-id
                :name (:name body)
                :price-cents (:price-cents body)}})

      (catch Exception e
        (log/error e "Failed to create service")
        (response-error (.getMessage e))))))

;; ============================================
;; POST /api/v1/professionals
;; ============================================

(defn create-professional
  "Create a new professional."
  [{:keys [ds]} request]
  (let [body (:body-params request)]
    (try
      (let [professional-id (uuid)
            professional {:id [:cast professional-id :uuid]
                          :tenant-id [:cast (:tenant-id body) :uuid]
                          :name (:name body)
                          :specialty (:specialty body)
                          :active true}

            result (db/execute-one! ds
                                    {:insert-into :core.professionals
                                     :values [professional]
                                     :returning [:*]})]

        {:status 201
         :body {:id professional-id
                :name (:name body)}})

      (catch Exception e
        (log/error e "Failed to create professional")
        (response-error (.getMessage e))))))

;; ============================================
;; POST /api/v1/tenants
;; ============================================

(defn create-tenant
  "Create a new tenant (petshop/clinic)."
  [{:keys [ds]} request]
  (let [body (:body-params request)]
    (try
      (let [tenant-id (uuid)
            tenant {:id [:cast tenant-id :uuid]
                    :name (:name body)
                    :slug (:slug body)
                    :contact-email (:contact-email body)
                    :contact-phone (:contact-phone body)
                    :address (:address body)
                    :status "ACTIVE"}

            result (db/execute-one! ds
                                    {:insert-into :core.tenants
                                     :values [tenant]
                                     :returning [:*]})]

        {:status 201
         :body {:id tenant-id
                :name (:name body)
                :slug (:slug body)}})

      (catch Exception e
        (log/error e "Failed to create tenant")
        (if (re-find #"duplicate key" (.getMessage e))
          (response-bad-request {:slug "Slug already exists"})
          (response-error (.getMessage e)))))))
