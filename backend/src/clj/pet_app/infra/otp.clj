(ns pet-app.infra.otp
  "OTP (One-Time Password) generation and validation.
   
   Fluxo OTP para autenticação de Clients:
   1. Cliente solicita token via POST /auth/otp/request
   2. Sistema gera código de 6 dígitos com expiração de 5 minutos
   3. Sistema envia SMS (mock em dev, provedor em prod)
   4. Cliente valida via POST /auth/otp/verify
   5. Se válido, retorna JWT e cria/atualiza registro do Client"
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]
            [clj-time.core :as time]
            [clj-time.coerce :as tc])
  (:import [java.security SecureRandom]
           [java.util UUID]))

;; ============================================
;; Configuration
;; ============================================

(def ^:private otp-length 6)
(def ^:private otp-expiration-minutes 5)
(def ^:private max-attempts 5)

;; ============================================
;; OTP Generation
;; ============================================

(defn generate-otp-code
  "Generate a cryptographically secure 6-digit OTP."
  []
  (let [random (SecureRandom.)
        code (StringBuilder.)]
    (dotimes [_ otp-length]
      (.append code (.nextInt random 10)))
    (str code)))

;; ============================================
;; OTP Token Management
;; ============================================

(defn create-otp-token
  "Create a new OTP token for a phone number.
   
   Invalida tokens anteriores do mesmo telefone antes de criar novo.
   
   Args:
     ds    - DataSource
     phone - Phone number in E.164 format
   
   Returns:
     {:token '123456' :expires-at <instant> :phone '+5511999998888'}"
  [ds phone]
  (let [token (generate-otp-code)
        expires-at (tc/to-sql-time
                    (time/plus (time/now)
                               (time/minutes otp-expiration-minutes)))
        id (str (UUID/randomUUID))]

    (try
      ;; Invalidar tokens anteriores do mesmo telefone
      (db/execute! ds
                   {:delete-from :core.otp-tokens
                    :where [:= :phone phone]})

      ;; Criar novo token
      (db/execute-one! ds
                       {:insert-into :core.otp-tokens
                        :values [{:id [:cast id :uuid]
                                  :phone phone
                                  :token token
                                  :expires-at expires-at
                                  :attempts 0
                                  :verified false}]
                        :returning :*})

      (log/info "OTP created for phone:" phone "expires at:" expires-at)

      {:token token
       :expires-at expires-at
       :phone phone}

      (catch Exception e
        (log/error e "Failed to create OTP token for phone:" phone)
        (throw (ex-info "Failed to create OTP token"
                        {:phone phone :error (.getMessage e)}))))))

(defn verify-otp-token
  "Verify an OTP token.
   
   Valida:
   - Token existe e não expirou
   - Número de tentativas não excedeu o máximo
   - Token corresponde ao esperado
   
   Args:
     ds    - DataSource
     phone - Phone number
     token - 6-digit OTP code
   
   Returns:
     {:valid? true :phone '...'} se válido
     {:valid? false :error '...'} se inválido"
  [ds phone token]
  (try
    (let [stored-otp (db/execute-one! ds
                                      {:select :*
                                       :from :core.otp-tokens
                                       :where [:and
                                               [:= :phone phone]
                                               [:= :verified false]
                                               [:> :expires-at [:now]]]})]
      (cond
        ;; Token não encontrado ou expirado
        (nil? stored-otp)
        (do
          (log/warn "OTP not found or expired for phone:" phone)
          {:valid? false :error "Token not found or expired"})

        ;; Máximo de tentativas excedido
        (>= (:attempts stored-otp) max-attempts)
        (do
          (log/warn "Max OTP attempts exceeded for phone:" phone)
          {:valid? false :error "Maximum attempts exceeded"})

        ;; Token incorreto
        (not= token (:token stored-otp))
        (do
          ;; Incrementar contador de tentativas
          (db/execute! ds
                       {:update :core.otp-tokens
                        :set {:attempts [:+ :attempts 1]}
                        :where [:= :id (:id stored-otp)]})
          (log/warn "Invalid OTP attempt for phone:" phone
                    "attempts:" (inc (:attempts stored-otp)))
          {:valid? false :error "Invalid token"})

        ;; Token válido!
        :else
        (do
          ;; Marcar como verificado
          (db/execute! ds
                       {:update :core.otp-tokens
                        :set {:verified true}
                        :where [:= :id (:id stored-otp)]})
          (log/info "OTP verified successfully for phone:" phone)
          {:valid? true :phone phone})))

    (catch Exception e
      (log/error e "Error verifying OTP for phone:" phone)
      {:valid? false :error "Verification failed"})))

(defn cleanup-expired-tokens
  "Remove expired OTP tokens from database.
   
   Should be called periodically (e.g., via scheduled job)."
  [ds]
  (try
    (let [result (db/execute! ds
                              {:delete-from :core.otp-tokens
                               :where [:< :expires-at [:now]]})]
      (log/info "Cleaned up expired OTP tokens:" (count result))
      {:deleted (count result)})
    (catch Exception e
      (log/error e "Failed to cleanup expired OTP tokens")
      {:error (.getMessage e)})))

;; ============================================
;; SMS Provider (Mock for Development)
;; ============================================

(defn send-otp-sms
  "Send OTP via SMS.
   
   Em desenvolvimento: loga o código no console.
   Em produção: integrar com Twilio, AWS SNS, ou outro provedor.
   
   Args:
     phone - Phone number in E.164 format
     token - 6-digit OTP code
   
   Returns:
     {:sent? true :provider 'mock'} em dev
     {:sent? true :provider 'twilio'} em prod"
  [phone token]
  (let [env (or (System/getenv "ENV") "development")]
    (if (= env "production")
      ;; === PRODUÇÃO ===
      ;; TODO: Integrar com provedor SMS
      ;; Exemplo Twilio:
      ;; (twilio/send-sms {:to phone :body (str "Seu código Petoo: " token)})
      (do
        (log/warn "SMS provider not configured for production!")
        (log/info "Would send SMS to" phone "with token" token)
        {:sent? true :provider "mock" :token token})

      ;; === DESENVOLVIMENTO ===
      (do
        (log/info "")
        (log/info "╔════════════════════════════════════════╗")
        (log/info "║          🔐 DEV OTP TOKEN              ║")
        (log/info "╠════════════════════════════════════════╣")
        (log/info (str "║  Phone: " phone))
        (log/info (str "║  Token: " token))
        (log/info "╚════════════════════════════════════════╝")
        (log/info "")
        {:sent? true :provider "mock" :token token}))))
