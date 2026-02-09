(ns pet-app.api.commands.clients
  "Client command handlers.
   
   Provides CRUD operations for client-owned resources:
   - Pets
   - Appointments"
  (:require [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.api.helpers :refer [ok created bad-request forbidden not-found error]]
            [clojure.tools.logging :as log]
            [clojure.data.json :as json])
  (:import [java.util UUID]))

;; ============================================
;; Pet Commands
;; ============================================

(defn create-pet
  "Create a new pet for the authenticated client.
   
   Body:
     {:name 'Rex'
      :species 'DOG'
      :breed 'Golden Retriever'
      :size 'LARGE'
      :birth-date '2020-05-15'
      :weight-kg 32.5
      :notes {:sedentary false :castrated true}
      :medical-notes {:vaccines 'All up to date'}}"
  [{:keys [ds kafka-producer topics]} request]
  (let [client-id (:client-id request)
        body (:body-params request)]
    (if-not client-id
      (forbidden "Client authentication required")

      (try
        (let [pet-id (str (UUID/randomUUID))
              pet-data {:id [:cast pet-id :uuid]
                        :client-id [:cast client-id :uuid]
                        :name (:name body)
                        :species (or (:species body) "DOG")
                        :breed (:breed body)
                        :size (:size body)
                        :birth-date (:birth-date body)
                        :weight-kg (:weight-kg body)
                        :notes (when (:notes body)
                                 [:cast (json/write-str (:notes body)) :jsonb])
                        :medical-notes (when (:medical-notes body)
                                         [:cast (json/write-str (:medical-notes body)) :jsonb])
                        :status "ACTIVE"}

              _ (db/execute-one! ds
                                 {:insert-into :core.pets
                                  :values [(into {} (filter (fn [[_ v]] (some? v)) pet-data))]})]

          ;; Publicar evento
          (when kafka-producer
            (kafka/send-event! kafka-producer
                               (:pet-events topics)
                               pet-id
                               {:event-type "PetCreated"
                                :pet-id pet-id
                                :client-id client-id
                                :name (:name body)}))

          (log/info "Pet created:" pet-id "for client:" client-id)

          (created
           {:pet {:id pet-id
                  :name (:name body)
                  :species (or (:species body) "DOG")
                  :breed (:breed body)}}))

        (catch Exception e
          (log/error e "Failed to create pet")
          (error "Failed to create pet"))))))

(defn update-pet
  "Update an existing pet owned by the authenticated client."
  [{:keys [ds kafka-producer topics]} request]
  (let [client-id (:client-id request)
        pet-id (get-in request [:path-params :id])
        body (:body-params request)]
    (if-not client-id
      (forbidden "Client authentication required")

      (try
        ;; Verificar propriedade
        (let [existing-pet (db/execute-one! ds
                                            {:select [:id]
                                             :from :core.pets
                                             :where [:and
                                                     [:= :id [:cast pet-id :uuid]]
                                                     [:= :client-id [:cast client-id :uuid]]]})]
          (if-not existing-pet
            (not-found "Pet not found or you don't have access")

            (let [update-data (cond-> {}
                                (:name body) (assoc :name (:name body))
                                (:species body) (assoc :species (:species body))
                                (:breed body) (assoc :breed (:breed body))
                                (:size body) (assoc :size (:size body))
                                (:birth-date body) (assoc :birth-date (:birth-date body))
                                (:weight-kg body) (assoc :weight-kg (:weight-kg body))
                                (:notes body) (assoc :notes [:cast (json/write-str (:notes body)) :jsonb])
                                (:medical-notes body) (assoc :medical-notes
                                                             [:cast (json/write-str (:medical-notes body)) :jsonb]))]

              (when (seq update-data)
                (db/execute! ds
                             {:update :core.pets
                              :set update-data
                              :where [:= :id [:cast pet-id :uuid]]}))

              ;; Publicar evento
              (when kafka-producer
                (kafka/send-event! kafka-producer
                                   (:pet-events topics)
                                   pet-id
                                   {:event-type "PetUpdated"
                                    :pet-id pet-id
                                    :client-id client-id
                                    :updated-fields (keys update-data)}))

              (log/info "Pet updated:" pet-id)

              (ok {:message "Pet updated successfully"
                            :pet-id pet-id}))))

        (catch Exception e
          (log/error e "Failed to update pet:" pet-id)
          (error "Failed to update pet"))))))

(defn delete-pet
  "Soft delete a pet owned by the authenticated client."
  [{:keys [ds kafka-producer topics]} request]
  (let [client-id (:client-id request)
        pet-id (get-in request [:path-params :id])]
    (if-not client-id
      (forbidden "Client authentication required")

      (try
        (let [result (db/execute! ds
                                  {:update :core.pets
                                   :set {:status "DELETED"}
                                   :where [:and
                                           [:= :id [:cast pet-id :uuid]]
                                           [:= :client-id [:cast client-id :uuid]]]})]
          (if (pos? (count result))
            (do
              (when kafka-producer
                (kafka/send-event! kafka-producer
                                   (:pet-events topics)
                                   pet-id
                                   {:event-type "PetDeleted"
                                    :pet-id pet-id
                                    :client-id client-id}))
              (log/info "Pet deleted:" pet-id)
              (ok {:message "Pet deleted successfully"}))
            (not-found "Pet not found or you don't have access")))

        (catch Exception e
          (log/error e "Failed to delete pet:" pet-id)
          (error "Failed to delete pet"))))))

;; ============================================
;; Appointment Commands (Client-initiated)
;; ============================================

(defn create-appointment
  "Create a new appointment as a client.
   
   Body:
     {:enterprise-id 'uuid'
      :pet-id 'uuid'
      :service-id 'uuid'
      :professional-id 'uuid'  ;; optional
      :start-time '2024-01-15T10:00:00Z'
      :notes 'Special instructions'}"
  [{:keys [ds kafka-producer topics]} request]
  (let [client-id (:client-id request)
        body (:body-params request)]
    (cond
      (nil? client-id)
      (forbidden "Client authentication required")

      (nil? (:enterprise-id body))
      (bad-request "Enterprise ID is required")

      (nil? (:pet-id body))
      (bad-request "Pet ID is required")

      (nil? (:service-id body))
      (bad-request "Service ID is required")

      (nil? (:start-time body))
      (bad-request "Start time is required")

      :else
      (try
        ;; Verificar que o pet pertence ao cliente
        (let [pet (db/execute-one! ds
                                   {:select [:id]
                                    :from :core.pets
                                    :where [:and
                                            [:= :id [:cast (:pet-id body) :uuid]]
                                            [:= :client-id [:cast client-id :uuid]]]})]
          (if-not pet
            (bad-request "Pet not found or doesn't belong to you")

            ;; Buscar duração e preço do serviço
            (let [service (db/execute-one! ds
                                           {:select [:duration-minutes :price-cents]
                                            :from :core.services
                                            :where [:= :id [:cast (:service-id body) :uuid]]})
                  _ (when-not service (throw (ex-info "Service not found" {})))

                  duration-minutes (or (:duration-minutes service) 30)
                  price-cents (:price-cents service)
                  payment-method (or (:payment_method body) "PIX")

                  ;; Se for pagamento via carteira, verificar saldo
                  _ (when (= payment-method "WALLET_BALANCE")
                      (let [wallet (db/execute-one! ds
                                                    {:select [:balance-cents]
                                                     :from [:financial.wallets]
                                                     :where [:and
                                                             [:= :owner-id [:cast client-id :uuid]]
                                                             [:= :owner-type "USER"]]})
                            balance (or (:balance-cents wallet) 0)]
                        (when (< balance price-cents)
                          (throw (ex-info "Insufficient balance"
                                          {:type :insufficient-balance
                                           :balance balance
                                           :required price-cents})))))

                  appointment-id (str (UUID/randomUUID))

                  appointment-data {:id [:cast appointment-id :uuid]
                                    :enterprise-id [:cast (:enterprise-id body) :uuid]
                                    :client-id [:cast client-id :uuid]
                                    :pet-id [:cast (:pet-id body) :uuid]
                                    :service-id [:cast (:service-id body) :uuid]
                                    :professional-id (when (:professional-id body)
                                                       [:cast (:professional-id body) :uuid])
                                    :start-time [:cast (:start-time body) :timestamptz]
                                    :end-time (if (:end-time body)
                                                [:cast (:end-time body) :timestamptz]
                                                [:+ [:cast (:start-time body) :timestamptz]
                                                 [:* duration-minutes [:interval "1 minute"]]])
                                    :status "PENDING"
                                    :notes (:notes body)}

                  _ (db/execute-one! ds
                                     {:insert-into :core.appointments
                                      :values [(into {} (filter (fn [[_ v]] (some? v)) appointment-data))]})]

              ;; Publicar evento com info de pagamento
              (when kafka-producer
                (kafka/send-event! kafka-producer
                                   (:appointment-events topics)
                                   appointment-id
                                   {:event-type "AppointmentCreated"
                                    :appointment-id appointment-id
                                    :client-id client-id
                                    :enterprise-id (:enterprise-id body)
                                    :service-id (:service-id body)
                                    :price-cents price-cents
                                    :payment-method payment-method}))

              (log/info "Appointment created:" appointment-id
                        "for client:" client-id
                        "payment:" payment-method)

              (created
               {:appointment {:id appointment-id
                              :status "PENDING"
                              :payment_method payment-method
                              :price_cents price-cents
                              :start-time (:start-time body)}}))))

        (catch Exception e
          (log/error e "Failed to create appointment")
          (if (= :insufficient-balance (:type (ex-data e)))
            {:status 400
             :body {:error "Insufficient balance"
                    :balance_cents (:balance (ex-data e))
                    :required_cents (:required (ex-data e))
                    :message "Your wallet balance is insufficient for this service"}}
            (error "Failed to create appointment")))))))

(defn cancel-appointment
  "Cancel an existing appointment."
  [{:keys [ds kafka-producer topics]} request]
  (let [client-id (:client-id request)
        appointment-id (get-in request [:path-params :id])]
    (if-not client-id
      (forbidden "Client authentication required")

      (try
        (let [result (db/execute! ds
                                  {:update :core.appointments
                                   :set {:status "CANCELLED"}
                                   :where [:and
                                           [:= :id [:cast appointment-id :uuid]]
                                           [:= :client-id [:cast client-id :uuid]]
                                           [:in :status ["PENDING" "CONFIRMED"]]]})]
          (if (pos? (count result))
            (do
              (when kafka-producer
                (kafka/send-event! kafka-producer
                                   (:appointment-events topics)
                                   appointment-id
                                   {:event-type "AppointmentCancelled"
                                    :appointment-id appointment-id
                                    :client-id client-id
                                    :cancelled-by "client"}))
              (log/info "Appointment cancelled:" appointment-id)
              (ok {:message "Appointment cancelled successfully"}))
            (not-found "Appointment not found or cannot be cancelled")))

        (catch Exception e
          (log/error e "Failed to cancel appointment:" appointment-id)
          (error "Failed to cancel appointment"))))))
