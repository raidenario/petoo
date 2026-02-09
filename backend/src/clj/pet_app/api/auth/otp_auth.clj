(ns pet-app.api.auth.otp-auth
  "OTP Authentication handlers for Clients.
   
   Provides endpoints for phone-based authentication:
   - POST /api/v1/auth/otp/request - Request OTP
   - POST /api/v1/auth/otp/verify  - Verify OTP and get JWT"
  (:require [pet-app.infra.otp :as otp]
            [pet-app.infra.db :as db]
            [pet-app.api.helpers :refer [ok bad-request unauthorized error]]
            [clojure.tools.logging :as log]))

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
      (bad-request "Phone number is required")

      ;; Validar formato do telefone
      (not (valid-phone? phone))
      (bad-request "Invalid phone number format. Use E.164 format (e.g., +5511999998888)")

      :else
      (try
        ;; Criar token OTP
        (let [otp-result (otp/create-otp-token ds phone)
              _ (log/info "OTP generated for" phone ":" (:token otp-result))
              ;; Enviar SMS (mock em dev)
              sms-result (otp/send-otp-sms phone (:token otp-result))
              ;; Ambiente de desenvolvimento?
              is-dev? (not= (System/getenv "ENV") "production")]

          (ok
           (cond-> {:message "OTP sent successfully"
                    :expires-in-seconds 300}
             ;; Em dev, retornar token para facilitar testes
             is-dev? (assoc :debug {:token (:token otp-result)
                                    :provider (:provider sms-result)}))))

        (catch Exception e
          (log/error e "Failed to send OTP to" phone)
          (error "Failed to send OTP"))))))

;; ============================================
;; POST /api/v1/auth/otp/verify
;; ============================================

(defn verify-otp
  "Verificar OTP e retornar perfis disponíveis.
   
   Body:
     {:phone '+5511999998888'
      :token '123456'}
   
   Response (sucesso):
     {:profiles [{:type 'CLIENT' :id '...' :name '...'}
                 {:type 'ENTERPRISE_ADMIN' :enterprise-id '...' :enterprise-name '...'}]
      :needs-selection true/false}
   
   Se nenhum perfil existe, retorna lista vazia (frontend cria cliente)."
  [{:keys [ds]} request]
  (let [{:keys [phone token]} (:body-params request)]
    (cond
      ;; Validar campos obrigatórios
      (nil? phone)
      (bad-request "Phone number is required")

      (nil? token)
      (bad-request "Token is required")

      (not (valid-phone? phone))
      (bad-request "Invalid phone number format")

      (not= 6 (count (str token)))
      (bad-request "Token must be 6 digits")

      :else
      ;; Verificar OTP
      (let [result (otp/verify-otp-token ds phone (str token))]
        (if-not (:valid? result)
          (unauthorized (:error result))

          ;; OTP válido - buscar todos os perfis disponíveis
          (try
            (let [;; Buscar perfil Cliente
                  client-profile (db/execute-one! ds
                                   {:select [:id :phone :name :email :avatar-url]
                                    :from :core.clients
                                    :where [:= :phone phone]})
                  
                  ;; Buscar perfis Enterprise (usuários com role ENTERPRISE_ADMIN)
                  enterprise-profiles (db/execute! ds
                                        {:select [:u.id :u.name :u.email :u.enterprise-id
                                                  [:e.name :enterprise-name]
                                                  [:e.slug :enterprise-slug]]
                                         :from [[:core.users :u]]
                                         :join [[:core.enterprises :e] [:= :u.enterprise-id :e.id]]
                                         :where [:and
                                                 [:= :u.phone phone]
                                                 [:= :u.role "ENTERPRISE_ADMIN"]]})
                  
                  ;; Montar lista de perfis
                  profiles (concat
                            (when client-profile
                              [{:type "CLIENT"
                                :id (str (:id client-profile))
                                :name (:name client-profile)
                                :email (:email client-profile)
                                :avatar-url (:avatar-url client-profile)}])
                            (map (fn [ep]
                                   {:type "ENTERPRISE_ADMIN"
                                    :id (str (:id ep))
                                    :enterprise-id (str (:enterprise-id ep))
                                    :enterprise-name (:enterprise-name ep)
                                    :enterprise-slug (:enterprise-slug ep)
                                    :name (:name ep)
                                    :email (:email ep)})
                                 enterprise-profiles))]

              (log/info "OTP verified for phone:" phone 
                        "- Found" (count profiles) "profile(s)")

              (ok
               {:profiles (vec profiles)
                :needs-selection (> (count profiles) 1)
                :phone phone}))

            (catch Exception e
              (log/error e "Failed to fetch profiles for phone:" phone)
              (error "Authentication failed"))))))))

;; ============================================
;; GET /api/v1/auth/client/me
;; ============================================

(defn get-current-client
  "Retorna informações do cliente autenticado.
   
   Requer token de Client no header Authorization."
  [{:keys [ds]} request]
    (let [client-id (:client-id request)]
    (if-not client-id
      (unauthorized "Client authentication required")

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
            (ok {:client (update client :id str)
                 :wallet (when wallet
                           {:id (str (:id wallet))
                            :balance_cents (:balance-cents wallet)
                            :pending_cents (:pending-cents wallet)
                            :updated_at (:updated-at wallet)})})
            (unauthorized "Client not found")))

        (catch Exception e
          (log/error e "Failed to get client:" client-id)
          (error "Failed to get client info"))))))

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
      (unauthorized "Client authentication required")

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
          (ok {:client (update updated-client :id str)}))

        (catch Exception e
          (log/error e "Failed to update client:" client-id)
          (error "Failed to update profile"))))))
