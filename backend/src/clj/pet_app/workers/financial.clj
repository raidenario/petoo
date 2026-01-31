(ns pet-app.workers.financial
  "Financial Worker - Processa pagamentos e ledger.
   
   Consome: slot.reserved
   Produz: payment.success | payment.failed
   
   Lógica:
   1. Recebe evento de slot reservado
   2. Cria transação no financial.transactions
   3. Cria entries no ledger (imutável)
   4. Simula chamada ao gateway de pagamento
   5. Emite payment.success ou payment.failed"
  (:require [pet-app.workers.base :as base]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [clojure.tools.logging :as log])
  (:import [java.util UUID]))


(defn get-enterprise-wallet
  "Get or create wallet for enterprise."
  [ds enterprise-id]
  (let [existing (db/execute-one! ds
                                  {:select [:*]
                                   :from [:financial.wallets]
                                   :where [:and
                                           [:= :owner-id [:cast enterprise-id :uuid]]
                                           [:= :owner-type "ENTERPRISE"]]})]
    (or existing
        ;; Create wallet if not exists
        (db/execute-one! ds
                         {:insert-into :financial.wallets
                          :values [{:owner-id [:cast enterprise-id :uuid]
                                    :owner-type "ENTERPRISE"
                                    :balance-cents 0
                                    :pending-cents 0}]
                          :returning [:*]}))))

(defn get-platform-wallet
  "Get the platform wallet."
  [ds]
  (db/execute-one! ds
                   {:select [:*]
                    :from [:financial.wallets]
                    :where [:= :owner-type "PLATFORM"]}))


(defn create-transaction!
  "Create a new transaction record."
  [ds {:keys [wallet-id appointment-id amount-cents payment-method]}]
  (let [tx-id (str (UUID/randomUUID))]
    (db/execute-one! ds
                     {:insert-into :financial.transactions
                      :values [{:id [:cast tx-id :uuid]
                                :wallet-id [:cast wallet-id :uuid]
                                :appointment-id [:cast appointment-id :uuid]
                                :amount-cents amount-cents
                                :fee-cents 0
                                :payment-method (or payment-method "PIX")
                                :status "PROCESSING"
                                :metadata [:cast (str "{\"source\": \"slot.reserved\"}") :jsonb]}]
                      :returning [:*]})))

(defn update-transaction-status!
  "Update transaction status."
  [ds tx-id status & {:keys [external-id]}]
  (db/execute-one! ds
                   {:update :financial.transactions
                    :set (cond-> {:status status
                                  :updated-at [:now]}
                           external-id (assoc :external-id external-id)
                           (= status "PAID") (assoc :paid-at [:now]))
                    :where [:= :id [:cast tx-id :uuid]]
                    :returning [:*]}))

(defn create-ledger-entry!
  "Create an immutable ledger entry."
  [ds {:keys [transaction-id wallet-id entry-type amount-cents balance-after description]}]
  (db/execute-one! ds
                   {:insert-into :financial.ledger-entries
                    :values [{:transaction-id [:cast transaction-id :uuid]
                              :wallet-id [:cast wallet-id :uuid]
                              :entry-type entry-type
                              :amount-cents amount-cents
                              :balance-after-cents balance-after
                              :description description}]
                    :returning [:*]}))

(defn update-wallet-balance!
  "Update wallet balance."
  [ds wallet-id amount-cents]
  (db/execute-one! ds
                   {:update :financial.wallets
                    :set {:balance-cents [:+ :balance-cents amount-cents]
                          :updated-at [:now]}
                    :where [:= :id [:cast wallet-id :uuid]]
                    :returning [:*]}))


(defn simulate-payment-gateway
  "Simulate a payment gateway call.
   In production, this would call Stripe/Pagarme/etc.
   
   Returns:
     {:success true :external-id \"...\"} or
     {:success false :error \"...\"}"
  [_amount-cents _payment-method]
  ;; Simulate 95% success rate
  (Thread/sleep 100) ;; Simulate network latency
  (if (< (rand) 0.95)
    {:success true
     :external-id (str "sim_" (UUID/randomUUID))}
    {:success false
     :error "Payment declined by issuer"}))


(def PLATFORM_COMMISSION_RATE 0.10) ;; 10%

(defn calculate-split
  "Calculate payment split between enterprise and platform."
  [amount-cents commission-rate]
  (let [platform-fee (Math/round (* amount-cents (double commission-rate)))
        enterprise-amount (- amount-cents platform-fee)]
    {:total amount-cents
     :platform-fee platform-fee
     :enterprise-amount enterprise-amount}))


(defn handle-slot-reserved
  "Handle slot.reserved event.
   
   Process payment and update ledger."
  [{:keys [deps value] :as event}]
  (let [{:keys [ds kafka-producer topics]} deps
        payload (:payload value)
        {:keys [appointment-id enterprise-id price-cents]} payload]

    (log/infof "[IN: slot.reserved] Processing for appointment: %s (amount: %d cents)"
               appointment-id price-cents)

    (try
      ;; Get wallets
      (let [enterprise-wallet (get-enterprise-wallet ds enterprise-id)
            platform-wallet (get-platform-wallet ds)

            ;; Create transaction
            transaction (create-transaction! ds
                                             {:wallet-id (:id enterprise-wallet)
                                              :appointment-id appointment-id
                                              :amount-cents price-cents
                                              :payment-method "PIX"})
            tx-id (str (:id transaction))

            ;; Simulate payment
            payment-result (simulate-payment-gateway price-cents "PIX")]

        (if (:success payment-result)
          ;; Payment successful
          (do
            (log/infof "[FINANCIAL] Payment successful for transaction: %s" tx-id)

            ;; Update transaction
            (log/infof "[DB: financial.transactions] Marking TX as PAID: %s" tx-id)
            (update-transaction-status! ds tx-id "PAID"
                                        :external-id (:external-id payment-result))

            ;; Calculate split
            (let [{:keys [platform-fee enterprise-amount]}
                  (calculate-split price-cents PLATFORM_COMMISSION_RATE)

                  ;; Update enterprise wallet and create ledger entry
                  updated-enterprise-wallet (update-wallet-balance! ds
                                                                    (:id enterprise-wallet)
                                                                    enterprise-amount)]

              ;; Ledger entry for enterprise (CREDIT)
              (log/infof "[DB: financial.ledger_entries] Creating CREDIT entry for enterprise wallet: %s" (:id enterprise-wallet))
              (create-ledger-entry! ds
                                    {:transaction-id tx-id
                                     :wallet-id (:id enterprise-wallet)
                                     :entry-type "CREDIT"
                                     :amount-cents enterprise-amount
                                     :balance-after (:balance-cents updated-enterprise-wallet)
                                     :description (str "Payment for appointment " appointment-id)})

              ;; Ledger entry for platform fee (FEE)
              (when (and platform-wallet (> platform-fee 0))
                (let [updated-platform (update-wallet-balance! ds
                                                               (:id platform-wallet)
                                                               platform-fee)]
                  (log/infof "[DB: financial.ledger_entries] Creating FEE entry for platform wallet: %s" (:id platform-wallet))
                  (create-ledger-entry! ds
                                        {:transaction-id tx-id
                                         :wallet-id (:id platform-wallet)
                                         :entry-type "FEE"
                                         :amount-cents platform-fee
                                         :balance-after (:balance-cents updated-platform)
                                         :description (str "Platform fee for appointment " appointment-id)})))

              ;; Link transaction to appointment
              (db/execute! ds
                           {:update :core.appointments
                            :set {:transaction-id [:cast tx-id :uuid]
                                  :updated-at [:now]}
                            :where [:= :id [:cast appointment-id :uuid]]})

              ;; Emit payment.success
              (when kafka-producer
                (log/infof "[OUT: payment.success] Emitting success for: %s" appointment-id)
                (kafka/send-event! kafka-producer
                                   (:payment-success topics)
                                   appointment-id
                                   (kafka/make-event :payment.success
                                                     {:appointment-id appointment-id
                                                      :transaction-id tx-id
                                                      :amount-cents price-cents
                                                      :enterprise-amount enterprise-amount
                                                      :platform-fee platform-fee})))

              (log/infof "[FINANCIAL] Payment processed successfully: %s" tx-id)))

          ;; Payment failed
          (do
            (log/warn "Payment failed for transaction:" tx-id
                      "reason:" (:error payment-result))

            (update-transaction-status! ds tx-id "FAILED")

            ;; Emit payment.failed
            (when kafka-producer
              (kafka/send-event! kafka-producer
                                 (:payment-failed topics)
                                 appointment-id
                                 (kafka/make-event :payment.failed
                                                   {:appointment-id appointment-id
                                                    :transaction-id tx-id
                                                    :reason (:error payment-result)}))))))

      (catch Exception e
        (log/error e "Error processing payment for appointment:" appointment-id)))))


(defn handle-event
  "Route event to appropriate handler."
  [{:keys [value] :as event}]
  (let [event-type (:event-type value)]
    (case event-type
      "slot.reserved" (handle-slot-reserved event)
      (log/warn "Unknown event type:" event-type))))


(defn start
  "Start the financial worker."
  [kafka-config topics ds producer]
  (let [deps {:ds ds
              :kafka-producer producer
              :topics topics}
        subscribe-topics [(:slot-reserved topics)]]
    (base/run-worker "financial"
                     kafka-config
                     subscribe-topics
                     handle-event
                     deps)))

(defn stop
  "Stop the financial worker."
  [worker]
  (base/stop-worker worker))
