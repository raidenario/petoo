(ns pet-app.api.auth.otp-auth
  "OTP Authentication handlers for Clients.
   
   Provides endpoints for phone-based authentication:
   - POST /api/v1/auth/otp/request - Request OTP
   - POST /api/v1/auth/otp/verify  - Verify OTP and get JWT"
  (:require [pet-app.infra.otp :as otp]
            [pet-app.infra.auth :as auth]
            [pet-app.infra.db :as db]
            [clojure.tools.logging :as log])
  (:import [java.util UUID]))

;; ============================================
;; Response Helpers
;; ============================================

(defn- response-ok [data]
  {:status 200 :body data})

(defn- response-created [data]
  {:status 201 :body data})

(defn- response-bad-request [error]
  {:status 400 :body {:error "Bad Request" :message error}})

(defn- response-unauthorized [error]
  {:status 401 :body {:error "Unauthorized" :message error}})

(defn- response-error [error]
  {:status 500 :body {:error "Internal Server Error" :message error}})

;; ============================================
;; Phone Validation
;; ============================================

(def ^:private phone-regex #"^\+?[1-9]\d{1,14}$")

(defn- valid-phone? [phone]
  (and (string? phone)
       (re-matches phone-regex phone)))

;; ============================================
;; POST /api/v1/auth/otp/request
;; ============================================

(defn request-otp
  "Solicitar envio de OTP para um telefone.
   
   Body:
     {:phone '+5511999998888'}
   
   Response:
     {:message 'OTP sent successfully'
      :expires-in-seconds 300
      :debug {:token '123456'}} ;; Apenas em desenvolvimento"
  [{:keys [ds]} request]
  (let [{:keys [phone]} (:body-params request)]
    (cond
      ;; Validar que phone foi fornecido
      (nil? phone)
      (response-bad-request "Phone number is required")

      ;; Validar formato do telefone
      (not (valid-phone? phone))
      (response-bad-request "Invalid phone number format. Use E.164 format (e.g., +5511999998888)")

      :else
      (try
        ;; Criar token OTP
        (let [otp-result (otp/create-otp-token ds phone)
              ;; Enviar SMS (mock em dev)
              sms-result (otp/send-otp-sms phone (:token otp-result))
              ;; Ambiente de desenvolvimento?
              is-dev? (not= (System/getenv "ENV") "production")]

          (response-ok
           (cond-> {:message "OTP sent successfully"
                    :expires-in-seconds 300}
             ;; Em dev, retornar token para facilitar testes
             is-dev? (assoc :debug {:token (:token otp-result)
                                    :provider (:provider sms-result)}))))

        (catch Exception e
          (log/error e "Failed to send OTP to" phone)
          (response-error "Failed to send OTP"))))))

;; ============================================
;; POST /api/v1/auth/otp/verify
;; ============================================

(defn verify-otp
  "Verificar OTP e retornar JWT.
   
   Body:
     {:phone '+5511999998888'
      :token '123456'}
   
   Response (sucesso):
     {:token 'jwt...'
      :client {:id '...'
               :phone '+5511999998888'
               :name nil
               :is-new-user true}}
   
   Se cliente não existe, cria automaticamente."
  [{:keys [ds]} request]
  (let [{:keys [phone token]} (:body-params request)]
    (cond
      ;; Validar campos obrigatórios
      (nil? phone)
      (response-bad-request "Phone number is required")

      (nil? token)
      (response-bad-request "Token is required")

      (not (valid-phone? phone))
      (response-bad-request "Invalid phone number format")

      (not= 6 (count (str token)))
      (response-bad-request "Token must be 6 digits")

      :else
      ;; Verificar OTP
      (let [result (otp/verify-otp-token ds phone (str token))]
        (if-not (:valid? result)
          (response-unauthorized (:error result))

          ;; OTP válido - buscar ou criar cliente
          (try
            (let [;; Buscar cliente existente
                  existing-client (db/execute-one! ds
                                                   {:select :*
                                                    :from :core.clients
                                                    :where [:= :phone phone]})
                  ;; Criar se não existir
                  client (or existing-client
                             (let [client-id (str (UUID/randomUUID))]
                               (db/execute-one! ds
                                                {:insert-into :core.clients
                                                 :values [{:id [:cast client-id :uuid]
                                                           :phone phone
                                                           :status "ACTIVE"}]
                                                 :returning :*})))
                  ;; Gerar JWT
                  jwt-token (auth/generate-client-token
                             (str (:id client))
                             phone)]

              (log/info "Client authenticated:" phone
                        "is-new-user:" (nil? existing-client))

              (response-ok
               {:token jwt-token
                :client {:id (str (:id client))
                         :phone (:phone client)
                         :name (:name client)
                         :email (:email client)
                         :avatar-url (:avatar-url client)
                         :is-new-user (nil? existing-client)}}))

            (catch Exception e
              (log/error e "Failed to create/get client for phone:" phone)
              (response-error "Authentication failed"))))))))

;; ============================================
;; GET /api/v1/auth/client/me
;; ============================================

(defn get-current-client
  "Retorna informações do cliente autenticado.
   
   Requer token de Client no header Authorization."
  [{:keys [ds]} request]
  (let [client-id (:client-id request)]
    (if-not client-id
      (response-unauthorized "Client authentication required")

      (try
        (let [client (db/execute-one! ds
                                      {:select [:id :phone :name :email :avatar-url
                                                :latitude :longitude :status
                                                :created-at :updated-at]
                                       :from :core.clients
                                       :where [:= :id [:cast client-id :uuid]]})
              ;; Fetch wallet info (clients use USER type wallet linked by client-id)
              wallet (db/execute-one! ds
                                      {:select [:id :balance-cents :pending-cents :updated-at]
                                       :from [:financial.wallets]
                                       :where [:and
                                               [:= :owner-id [:cast client-id :uuid]]
                                               [:= :owner-type "USER"]]})]
          (if client
            (response-ok {:client (update client :id str)
                          :wallet (when wallet
                                    {:id (str (:id wallet))
                                     :balance_cents (:balance-cents wallet)
                                     :pending_cents (:pending-cents wallet)
                                     :updated_at (:updated-at wallet)})})
            (response-unauthorized "Client not found")))

        (catch Exception e
          (log/error e "Failed to get client:" client-id)
          (response-error "Failed to get client info"))))))

;; ============================================
;; PUT /api/v1/auth/client/me
;; ============================================

(defn update-client-profile
  "Atualiza perfil do cliente autenticado.
   
   Body:
     {:name 'João Silva'
      :email 'joao@email.com'}"
  [{:keys [ds]} request]
  (let [client-id (:client-id request)
        {:keys [name email latitude longitude]} (:body-params request)]
    (if-not client-id
      (response-unauthorized "Client authentication required")

      (try
        (let [update-data (cond-> {}
                            name (assoc :name name)
                            email (assoc :email email)
                            latitude (assoc :latitude latitude)
                            longitude (assoc :longitude longitude))
              _ (when (seq update-data)
                  (db/execute! ds
                               {:update :core.clients
                                :set update-data
                                :where [:= :id [:cast client-id :uuid]]}))
              updated-client (db/execute-one! ds
                                              {:select [:id :phone :name :email
                                                        :avatar-url :latitude :longitude]
                                               :from :core.clients
                                               :where [:= :id [:cast client-id :uuid]]})]
          (response-ok {:client (update updated-client :id str)}))

        (catch Exception e
          (log/error e "Failed to update client:" client-id)
          (response-error "Failed to update profile"))))))
