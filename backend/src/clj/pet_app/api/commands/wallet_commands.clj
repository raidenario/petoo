(ns pet-app.api.commands.wallet-commands
  (:require [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [pet-app.api.helpers :refer [ok error]]
            [clojure.tools.logging :as log])
  (:import [java.util UUID]))

(defn deposit-funds
  "Request a wallet deposit."
  [{:keys [db kafka config]} request]
  (let [body-params (:body-params request)
        current-user (:user request)
        amount-cents (:amount_cents body-params)
        payment-method (:payment_method body-params)
        user-id (or (:id current-user) (:user_id body-params)) ;; Support admin depositing for user
        topics (:topics config)]

    (if (or (nil? amount-cents) (<= amount-cents 0))
      (error 400 "Invalid amount")
      (try
        (let [deposit-id (UUID/randomUUID)
              ;; 1. Get user wallet (create if needed)
              wallet (or (db/execute-one! db {:select [:id]
                                              :from [:financial.wallets]
                                              :where [:and [:= :owner-id [:cast user-id :uuid]] [:= :owner-type "USER"]]})
                         (db/execute-one! db {:insert-into :financial.wallets
                                              :values [{:owner-id [:cast user-id :uuid]
                                                        :owner-type "USER"
                                                        :balance-cents 0
                                                        :pending-cents 0}]
                                              :returning [:id]}))

              ;; 2. Record deposit request
              _ (db/execute! db {:insert-into :financial.wallet-deposits
                                 :values [{:id deposit-id
                                           :wallet-id (:id wallet)
                                           :amount-cents amount-cents
                                           :payment-method payment-method}]})]

          ;; 3. Emit event
          (kafka/send-event! (:producer kafka)
                             (:wallet-deposit-requested topics)
                             (str user-id)
                             (kafka/make-event :wallet.deposit.requested
                                               {:user-id user-id
                                                :amount-cents amount-cents
                                                :payment-method payment-method
                                                :deposit-id (str deposit-id)}))

          (ok {:deposit_id (str deposit-id)
               :status "PENDING"}))
        (catch Exception e
          (log/error e "Error requesting deposit")
          (error 500 "Internal server error"))))))

(defn add-balance-dev
  "DEV ONLY: Manually add balance to a wallet."
  [{:keys [db config]} request]
  (let [body-params (:body-params request)
        enabled (get-in config [:features :enable-dev-endpoints])
        amount-cents (:amount_cents body-params)
        user-id (:user_id body-params)]

    (if-not enabled
      (error 403 "DEV endpoints are disabled")
      (if (or (nil? amount-cents) (nil? user-id))
        (error 400 "Missing amount_cents or user_id")
        (try
          ;; Direct update (no Kafka for simplicity in DEV)
          (let [wallet (or (db/execute-one! db {:select [:*]
                                                :from [:financial.wallets]
                                                :where [:and [:= :owner-id [:cast user-id :uuid]] [:= :owner-type "USER"]]})
                           (db/execute-one! db {:insert-into :financial.wallets
                                                :values [{:owner-id [:cast user-id :uuid]
                                                          :owner-type "USER"
                                                          :balance-cents 0
                                                          :pending-cents 0}]
                                                :returning [:*]}))
                updated (db/execute-one! db {:update :financial.wallets
                                             :set {:balance-cents [:+ :balance-cents amount-cents]
                                                   :updated-at [:now]}
                                             :where [:= :id (:id wallet)]
                                             :returning [:*]})]

            ;; Create ledger entry
            (db/execute! db {:insert-into :financial.ledger-entries
                             :values [{:wallet-id (:id wallet)
                                       :entry-type "ADJUSTMENT"
                                       :amount-cents amount-cents
                                       :balance-after-cents (:balance-cents updated)
                                       :description "Manual DEV balance addition"}]})

            (ok {:user_id user-id
                 :new_balance (:balance-cents updated)}))
          (catch Exception e
            (log/error e "Error adding balance in DEV")
            (error 500 "Internal server error")))))))
