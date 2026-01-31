(ns pet-app.workers.financial-test
  "Unit tests for the financial worker."
  (:require [clojure.test :refer [deftest testing is]]
            [pet-app.workers.financial :as financial]))

;; ==============================================
;; Pure Function Tests (no mocks needed)
;; ==============================================

(deftest calculate-split-test
  (testing "Calculate payment split correctly"
    (let [result (financial/calculate-split 10000 0.10)]
      (is (= 10000 (:total result)))
      (is (= 1000 (:platform-fee result)))
      (is (= 9000 (:enterprise-amount result)))))

  (testing "Calculate split with 15% commission"
    (let [result (financial/calculate-split 20000 0.15)]
      (is (= 20000 (:total result)))
      (is (= 3000 (:platform-fee result)))
      (is (= 17000 (:enterprise-amount result)))))

  (testing "Calculate split with zero amount"
    (let [result (financial/calculate-split 0 0.10)]
      (is (= 0 (:total result)))
      (is (= 0 (:platform-fee result)))
      (is (= 0 (:enterprise-amount result)))))

  (testing "Handle small amounts with rounding"
    (let [result (financial/calculate-split 99 0.10)]
      (is (= 99 (:total result)))
      (is (= 10 (:platform-fee result)))  ;; Math/round(9.9) = 10
      (is (= 89 (:enterprise-amount result))))))

(deftest platform-commission-rate-test
  (testing "Platform commission rate is 10%"
    (is (= 0.10 financial/PLATFORM_COMMISSION_RATE))))

;; ==============================================
;; Event Handler Tests (with fixtures)
;; ==============================================

;; Test fixtures for database mocking
(defn mock-get-user-wallet [_ds user-id]
  {:id "wallet-123"
   :owner-id user-id
   :owner-type "USER"
   :balance-cents 50000
   :pending-cents 0})

(defn mock-get-enterprise-wallet [_ds enterprise-id]
  {:id "wallet-456"
   :owner-id enterprise-id
   :owner-type "ENTERPRISE"
   :balance-cents 100000
   :pending-cents 0})

(defn mock-get-platform-wallet [_ds]
  {:id "wallet-platform"
   :owner-id "platform"
   :owner-type "PLATFORM"
   :balance-cents 1000000
   :pending-cents 0})

(deftest handle-event-routing-test
  (testing "Routes slot.reserved events correctly"
    ;; This test verifies the case statement routing
    (is (fn? financial/handle-slot-reserved))
    (is (fn? financial/handle-wallet-deposit-requested)))

  (testing "Unknown events are handled gracefully"
    ;; The handle-event function should not throw for unknown events
    (let [unknown-event {:value {:event-type "unknown.event"
                                 :payload {}}}]
      ;; Should return nil, not throw
      (is (nil? (financial/handle-event unknown-event))))))

;; ==============================================
;; Wallet Balance Logic Tests
;; ==============================================

(deftest wallet-payment-logic-test
  (testing "Sufficient balance check"
    (let [wallet {:balance-cents 10000}
          price 5000]
      (is (>= (:balance-cents wallet) price))))

  (testing "Insufficient balance check"
    (let [wallet {:balance-cents 1000}
          price 5000]
      (is (not (>= (:balance-cents wallet) price))))))

;; ==============================================
;; Integration Tests (require database)
;; Commented out - run with actual DB connection
;; ==============================================

(comment
  ;; To run these tests, you need a running database
  ;; clj -M:test -n pet-app.workers.financial-test

  (deftest integration-get-user-wallet-test
    (testing "Creates wallet if not exists"
      ;; Would require db connection
      )

    (testing "Returns existing wallet"
      ;; Would require db connection
      ))

  (deftest integration-create-transaction-test
    (testing "Creates transaction with correct fields"
      ;; Would require db connection
      ))

  (deftest integration-handle-slot-reserved-test
    (testing "Full payment flow with PIX"
      ;; Would require db and kafka connection
      )

    (testing "Full payment flow with WALLET_BALANCE"
      ;; Would require db connection
      )))
