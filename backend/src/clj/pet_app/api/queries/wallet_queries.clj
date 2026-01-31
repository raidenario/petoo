(ns pet-app.api.queries.wallet-queries
  (:require [pet-app.infra.db :as db]
            [pet-app.api.helpers :refer [ok error not-found]]
            [clojure.tools.logging :as log]))

(defn get-balance
  "Get current user's wallet balance."
  [{:keys [db]} request]
  (let [user-id (get-in request [:user :user-id])]
    (if-not user-id
      (error 401 "Authentication required")
      (if-let [wallet (db/execute-one! db {:select [:balance-cents :pending-cents]
                                           :from [:financial.wallets]
                                           :where [:and
                                                   [:= :owner-id [:cast user-id :uuid]]
                                                   [:= :owner-type "USER"]]})]
        (ok {:balance_cents (:balance-cents wallet)
             :pending_cents (:pending-cents wallet)
             :currency "BRL"})
        ;; Return zero if no wallet exists yet
        (ok {:balance_cents 0 :pending_cents 0 :currency "BRL"})))))

(defn get-enterprise-wallet
  "Get enterprise wallet balance (Admin only)."
  [{:keys [db]} request]
  (let [enterprise-id (get-in request [:path-params :enterprise-id])
        user-id (get-in request [:user :user-id])
        user-role (keyword (get-in request [:user :role]))]

    (if-not user-id
      (error 401 "Authentication required")
      ;; Platform admin can access any wallet, others need to be admin of the enterprise
      (if (or (= user-role :PLATFORM)
              (db/execute-one! db {:select [1]
                                   :from [:core.users]
                                   :where [:and
                                           [:= :enterprise-id [:cast enterprise-id :uuid]]
                                           [:= :id [:cast user-id :uuid]]
                                           [:in :role ["ADMIN" "MASTER"]]]}))
        (if-let [wallet (db/execute-one! db {:select [:*]
                                             :from [:financial.wallets]
                                             :where [:and
                                                     [:= :owner-id [:cast enterprise-id :uuid]]
                                                     [:= :owner-type "ENTERPRISE"]]})]
          (ok {:id (str (:id wallet))
               :enterprise_id enterprise-id
               :balance_cents (:balance-cents wallet)
               :pending_cents (:pending-cents wallet)})
          (ok {:enterprise_id enterprise-id
               :balance_cents 0
               :pending_cents 0}))
        (error 403 "Only enterprise admins can access the wallet")))))

(defn get-transactions
  "Get user transaction history."
  [{:keys [db]} request]
  (let [user-id (get-in request [:user :user-id])
        params (:query-params request)
        limit (Integer/parseInt (or (:limit params) "20"))
        offset (Integer/parseInt (or (:offset params) "0"))]

    (if-not user-id
      (error 401 "Authentication required")
      ;; Get wallet first
      (if-let [wallet (db/execute-one! db {:select [:id]
                                           :from [:financial.wallets]
                                           :where [:and
                                                   [:= :owner-id [:cast user-id :uuid]]
                                                   [:= :owner-type "USER"]]})]
        (let [txs (db/execute! db {:select [:id :entry-type :amount-cents :balance-after-cents
                                            :description :reference-type :created-at]
                                   :from [:financial.ledger-entries]
                                   :where [:= :wallet-id (:id wallet)]
                                   :order-by [[:created-at :desc]]
                                   :limit limit
                                   :offset offset})]
          (ok {:transactions (mapv (fn [tx]
                                     {:id (str (:id tx))
                                      :type (:entry-type tx)
                                      :amount_cents (:amount-cents tx)
                                      :balance_after_cents (:balance-after-cents tx)
                                      :description (:description tx)
                                      :reference_type (:reference-type tx)
                                      :created_at (:created-at tx)})
                                   txs)
               :limit limit
               :offset offset}))
        (ok {:transactions []
             :limit limit
             :offset offset})))))
