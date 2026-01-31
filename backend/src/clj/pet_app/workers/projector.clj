(ns pet-app.workers.projector
  "Projector Worker - Atualiza Read Models.
   
   Consome: TODOS os eventos
   Produz: Nada (apenas atualiza DB)
   
   Lógica:
   1. Escuta todos os eventos do sistema
   2. Atualiza tabelas desnormalizadas no read_model schema
   3. Mantém views otimizadas para consultas rápidas"
  (:require [pet-app.workers.base :as base]
            [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]
            [clojure.data.json :as json])
  (:import [java.util UUID]))


(defn fetch-appointment-data
  "Fetch all related data for an appointment."
  [ds appointment-id]
  (db/execute-one! ds
                   {:select [[:a.id :appointment-id]
                             [:a.enterprise-id :enterprise-id]
                             [:a.start-time :start-time]
                             [:a.end-time :end-time]
                             [:a.status :status]
                             [:a.notes :appointment-notes]
                             [:a.transaction-id :transaction-id]
                             [:e.name :enterprise-name]
                             [:e.slug :enterprise-slug]
                             [:e.theme-config :enterprise-theme]
                             [:u.id :user-id]
                             [:u.name :user-name]
                             [:u.email :user-email]
                             [:u.phone :user-phone]
                             [:u.avatar-url :user-avatar-url]
                             [:p.id :pet-id]
                             [:p.name :pet-name]
                             [:p.species :pet-species]
                             [:p.breed :pet-breed]
                             [:p.photo-url :pet-photo-url]
                             [:p.notes :pet-notes]
                             [:p.medical-notes :pet-medical-notes]
                             [:pr.id :professional-id]
                             [:pr.name :professional-name]
                             [:s.id :service-id]
                             [:s.name :service-name]
                             [:s.price-cents :service-price-cents]
                             [:s.duration-minutes :service-duration-minutes]]
                    :from [[:core.appointments :a]]
                    :left-join [[:core.enterprises :e] [:= :a.enterprise-id :e.id]
                                [:core.users :u] [:= :a.user-id :u.id]
                                [:core.pets :p] [:= :a.pet-id :p.id]
                                [:core.professionals :pr] [:= :a.professional-id :pr.id]
                                [:core.services :s] [:= :a.service-id :s.id]]
                    :where [:= :a.id [:cast appointment-id :uuid]]}))

(defn build-appointment-json
  "Build JSONB structure for appointments_view."
  [data tx-info]
  {:appointment {:id (str (:appointment-id data))
                 :startTime (str (:start-time data))
                 :endTime (str (:end-time data))
                 :status (:status data)
                 :notes (:appointment-notes data)}
   :enterprise {:id (str (:enterprise-id data))
                :name (:enterprise-name data)
                :slug (:enterprise-slug data)
                :logo (get-in (:enterprise-theme data) [:logo])}
   :user {:id (str (:user-id data))
          :name (:user-name data)
          :email (:user-email data)
          :phone (:user-phone data)
          :avatarUrl (:user-avatar-url data)}
   :pet {:id (str (:pet-id data))
         :name (:pet-name data)
         :species (:pet-species data)
         :breed (:pet-breed data)
         :photoUrl (:pet-photo-url data)
         :notes (:pet-notes data)
         :medicalNotes (:pet-medical-notes data)}
   :professional {:id (str (:professional-id data))
                  :name (:professional-name data)}
   :service {:id (str (:service-id data))
             :name (:service-name data)
             :priceCents (:service-price-cents data)
             :durationMinutes (:service-duration-minutes data)}
   :payment (when tx-info
              {:transactionId (str (:transaction-id tx-info))
               :status (:status tx-info)
               :amountCents (:amount-cents tx-info)})})

(defn upsert-appointment-view!
  "Insert or update appointment in read_model.appointments_view."
  [ds appointment-id]
  (let [data (fetch-appointment-data ds appointment-id)]
    (when data
      (let [tx-info (when (:transaction-id data)
                      (db/execute-one! ds
                                       {:select [:id :status :amount-cents]
                                        :from [:financial.transactions]
                                        :where [:= :id (:transaction-id data)]}))
            json-data (build-appointment-json data tx-info)]

        ;; Upsert into read model
        (log/infof "[DB: read_model.appointments_view] Upserting appointment: %s" appointment-id)
        (db/execute-one! ds
                         {:insert-into :read-model.appointments-view
                          :values [{:id [:cast appointment-id :uuid]
                                    :enterprise-id [:cast (str (:enterprise-id data)) :uuid]
                                    :data [:cast (json/write-str json-data) :jsonb]
                                    :status (:status data)
                                    :start-time (:start-time data)
                                    :end-time (:end-time data)
                                    :user-id [:cast (str (:user-id data)) :uuid]
                                    :pet-id [:cast (str (:pet-id data)) :uuid]
                                    :professional-id [:cast (str (:professional-id data)) :uuid]
                                    :service-id [:cast (str (:service-id data)) :uuid]
                                    :updated-at [:now]}]
                          :on-conflict [:id]
                          :do-update-set [:data :status :updated-at :version]
                          :returning [:id]})

        (log/debug "Updated appointments_view for:" appointment-id)))))


(defn update-schedule-slot!
  "Update or create a schedule slot in read_model."
  [ds {:keys [enterprise-id professional-id slot-date slot-time duration-minutes
              is-available appointment-id]}]
  (db/execute-one! ds
                   {:insert-into :read-model.schedule-slots-view
                    :values [{:enterprise-id [:cast enterprise-id :uuid]
                              :professional-id [:cast professional-id :uuid]
                              :slot-date slot-date
                              :slot-time slot-time
                              :duration-minutes duration-minutes
                              :is-available is-available
                              :appointment-id (when appointment-id [:cast appointment-id :uuid])
                              :updated-at [:now]}]
                    :on-conflict [:enterprise-id :professional-id :slot-date :slot-time]
                    :do-update-set [:is-available :appointment-id :updated-at]}))


(defn handle-appointment-created
  "Project appointment.created to read models."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id]} payload]
    (log/info "Projecting appointment.created:" appointment-id)
    (upsert-appointment-view! ds appointment-id)))

(defn handle-slot-reserved
  "Project slot.reserved - mark slot as unavailable."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id enterprise-id professional-id start-time]} payload]
    (log/info "Projecting slot.reserved:" appointment-id)

    ;; Update appointment view with CONFIRMED status
    (upsert-appointment-view! ds appointment-id)

    ;; Mark slot as unavailable
    (try
      (let [start-instant (java.time.Instant/parse start-time)]
        (update-schedule-slot! ds
                               {:enterprise-id enterprise-id
                                :professional-id professional-id
                                :slot-date (str (.toLocalDate (.atZone start-instant (java.time.ZoneId/of "America/Sao_Paulo"))))
                                :slot-time (str (.toLocalTime (.atZone start-instant (java.time.ZoneId/of "America/Sao_Paulo"))))
                                :duration-minutes 30
                                :is-available false
                                :appointment-id appointment-id}))
      (catch Exception e
        (log/warn "Could not update schedule slot:" (.getMessage e))))))

(defn handle-slot-conflict
  "Project slot.conflict - update appointment status."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id]} payload]
    (log/info "Projecting slot.conflict:" appointment-id)
    (upsert-appointment-view! ds appointment-id)))

(defn handle-payment-failed
  "Project payment.failed - update appointment status."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id]} payload]
    (log/info "Projecting payment.failed:" appointment-id)
    (upsert-appointment-view! ds appointment-id)))


(defn upsert-user-wallet-view!
  "Update or create user wallet in read model."
  [ds user-id]
  (let [wallet (db/execute-one! ds
                                {:select [:id :balance-cents :pending-cents :currency]
                                 :from [:financial.wallets]
                                 :where [:and
                                         [:= :owner-id [:cast user-id :uuid]]
                                         [:= :owner-type "USER"]]})]
    (when wallet
      (log/infof "[DB: read_model.user_wallets_view] Updating wallet for user: %s" user-id)
      (db/execute-one! ds
                       {:insert-into :read-model.user-wallets-view
                        :values [{:id (:id wallet)
                                  :user-id [:cast user-id :uuid]
                                  :balance-cents (:balance-cents wallet)
                                  :pending-cents (:pending-cents wallet)
                                  :currency (:currency wallet)
                                  :updated-at [:now]}]
                        :on-conflict [:user-id]
                        :do-update-set [:balance-cents :pending-cents :updated-at]}))))

(defn upsert-enterprise-wallet-view!
  "Update or create enterprise wallet in read model."
  [ds enterprise-id]
  (let [wallet (db/execute-one! ds
                                {:select [:id :balance-cents :pending-cents :currency]
                                 :from [:financial.wallets]
                                 :where [:and
                                         [:= :owner-id [:cast enterprise-id :uuid]]
                                         [:= :owner-type "ENTERPRISE"]]})
        total-received (db/execute-one! ds
                                        {:select [[:%sum.amount-cents :total]]
                                         :from [:financial.ledger-entries]
                                         :where [:and
                                                 [:= :wallet-id (:id wallet)]
                                                 [:= :entry-type "CREDIT"]]})]
    (when wallet
      (log/infof "[DB: read_model.enterprise_wallets_view] Updating wallet for enterprise: %s" enterprise-id)
      (db/execute-one! ds
                       {:insert-into :read-model.enterprise-wallets-view
                        :values [{:id (:id wallet)
                                  :enterprise-id [:cast enterprise-id :uuid]
                                  :balance-cents (:balance-cents wallet)
                                  :pending-cents (:pending-cents wallet)
                                  :currency (:currency wallet)
                                  :total-received-cents (or (:total total-received) 0)
                                  :updated-at [:now]}]
                        :on-conflict [:enterprise-id]
                        :do-update-set [:balance-cents :pending-cents :total-received-cents :updated-at]}))))

(defn record-wallet-transaction-view!
  "Record a transaction in the unified wallet history."
  [ds transaction-id wallet-id owner-id owner-type amount-cents entry-type status payment-method description metadata]
  (log/infof "[DB: read_model.wallet_transactions_view] Recording %s for wallet: %s" entry-type wallet-id)
  (db/execute-one! ds
                   {:insert-into :read-model.wallet-transactions-view
                    :values [{:id [:cast transaction-id :uuid]
                              :wallet-id [:cast wallet-id :uuid]
                              :owner-id [:cast owner-id :uuid]
                              :owner-type owner-type
                              :amount-cents amount-cents
                              :fee-cents 0 ;; Simplified
                              :net-cents amount-cents
                              :type entry-type
                              :status status
                              :payment-method payment-method
                              :description description
                              :created-at [:now]
                              :metadata [:cast (json/write-str (or metadata {})) :jsonb]}]
                    :on-conflict [:id]
                    :do-update-set [:status]}))


(defn handle-wallet-deposit-completed
  "Project wallet.deposit.completed to read models."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [user-id transaction-id amount-cents deposit-id]} payload]
    (log/info "Projecting wallet.deposit.completed for user:" user-id)
    (upsert-user-wallet-view! ds user-id)

    ;; Get transaction/wallet info for receipt
    (let [wallet (db/execute-one! ds {:select [:id] :from [:financial.wallets] :where [:= :owner-id [:cast user-id :uuid]]})]
      (record-wallet-transaction-view! ds transaction-id (:id wallet) user-id "USER" amount-cents "DEPOSIT" "PAID" "UNKNOWN" "Wallet Deposit" {:deposit-id deposit-id}))))

(defn handle-payment-success
  "Project payment.success - update appointment and wallets."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id transaction-id amount-cents enterprise-amount]} payload]
    (log/info "Projecting payment.success:" appointment-id)
    (upsert-appointment-view! ds appointment-id)

    ;; Update enterprise wallet view
    (let [appointment (db/execute-one! ds {:select [:enterprise-id :user-id] :from [:core.appointments] :where [:= :id [:cast appointment-id :uuid]]})
          ent-id (:enterprise-id appointment)
          user-id (:user-id appointment)]
      (when ent-id (upsert-enterprise-wallet-view! ds ent-id))
      (when user-id (upsert-user-wallet-view! ds user-id))

      ;; Record transaction in history for both (simplified for now - usually you'd have one entry per wallet)
      (let [ent-wallet (db/execute-one! ds {:select [:id] :from [:financial.wallets] :where [:= :owner-id [:cast ent-id :uuid]]})]
        (record-wallet-transaction-view! ds transaction-id (:id ent-wallet) ent-id "ENTERPRISE" enterprise-amount "CREDIT" "PAID" "UNKNOWN" (str "Appointment " appointment-id) {:appointment-id appointment-id})))))


(defn handle-event
  "Route event to appropriate projector."
  [{:keys [value] :as event}]
  (let [event-type (:event-type value)
        payload (:payload value)
        id (or (:appointment-id payload) (:user-id payload) (:id payload))]
    (log/infof "[IN: %s] Projecting data for: %s" event-type id)
    (case event-type
      "appointment.created" (handle-appointment-created event)
      "slot.reserved" (handle-slot-reserved event)
      "slot.conflict" (handle-slot-conflict event)
      "payment.success" (handle-payment-success event)
      "payment.failed" (handle-payment-failed event)
      "wallet.deposit.completed" (handle-wallet-deposit-completed event)
      (log/warnf "[PROJECTOR] Unknown event type: %s" event-type))))

;; ============================================
;; Worker Startup
;; ============================================

(defn start
  "Start the projector worker."
  [kafka-config topics ds]
  (let [deps {:ds ds}
        subscribe-topics [(:appointment-created topics)
                          (:slot-reserved topics)
                          (:slot-conflict topics)
                          (:payment-success topics)
                          (:payment-failed topics)
                          (:wallet-deposit-completed topics)
                          (:wallet-deposit-failed topics)]]
    (base/run-worker "projector"
                     kafka-config
                     subscribe-topics
                     handle-event
                     deps)))

(defn stop
  "Stop the projector worker."
  [worker]
  (base/stop-worker worker))
