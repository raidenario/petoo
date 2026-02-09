(ns pet-app.api.auth.enterprise-auth
  "Enterprise User Authentication handlers.
   
   Provides endpoints for email+password authentication:
   - POST /api/v1/auth/enterprise/login    - Login
   - POST /api/v1/auth/enterprise/register - Register new enterprise + master user
   - GET  /api/v1/auth/enterprise/me       - Get current user info"
  (:require [pet-app.infra.auth :as auth]
            [pet-app.infra.db :as db]
            [pet-app.api.helpers :refer [ok created bad-request unauthorized error]]
            [clojure.string :as str]
            [clojure.tools.logging :as log])
  (:import [java.util UUID]))

;; ============================================
;; Validation Helpers
;; ============================================

(def ^:private email-regex #"^[^\s@]+@[^\s@]+\.[^\s@]+$")

(defn- valid-email? [email]
  (and (string? email)
       (re-matches email-regex email)))

(defn- valid-password? [password]
  (and (string? password)
       (>= (count password) 8)))

(defn- valid-slug? [slug]
  (and (string? slug)
       (re-matches #"^[a-z0-9-]+$" slug)))

;; ============================================
;; POST /api/v1/auth/enterprise/login
;; ============================================

(defn login
  "Autenticar Enterprise User via email e senha.
   
   Body:
     {:email 'admin@petshop.com'
      :password 'senha123'}
   
   Response:
     {:token 'jwt...'
      :user {:id '...'
             :email '...'
             :name '...'
             :role 'ADMIN'
             :enterprise-id '...'}}"
  [{:keys [ds]} request]
  (let [{:keys [email password]} (:body-params request)]
    (cond
      (nil? email)
      (bad-request "Email is required")

      (nil? password)
      (bad-request "Password is required")

      (not (valid-email? email))
      (bad-request "Invalid email format")

      :else
      (try
        ;; Buscar usuário por email
        (let [user (db/execute-one! ds
                                    {:select [:id :enterprise-id :email :phone
                                              :password-hash :name :role :status]
                                     :from :core.users
                                     :where [:and
                                             [:= :email email]
                                             [:= :status "ACTIVE"]]})]
          (cond
            ;; Usuário não encontrado
            (nil? user)
            (unauthorized "Invalid email or password")

            ;; Senha incorreta
            (not (auth/verify-password password (:password-hash user)))
            (unauthorized "Invalid email or password")

            ;; Sucesso!
            :else
            (let [jwt-token (auth/generate-enterprise-token
                             (str (:id user))
                             (str (:enterprise-id user))
                             (:email user)
                             (:role user))]
              (log/info "Enterprise user logged in:" email "role:" (:role user))

              (ok
               {:token jwt-token
                :user {:id (str (:id user))
                       :email (:email user)
                       :phone (:phone user)
                       :name (:name user)
                       :role (:role user)
                       :enterprise-id (str (:enterprise-id user))}}))))

        (catch Exception e
          (log/error e "Login failed for email:" email)
          (error "Authentication failed"))))))

;; ============================================
;; POST /api/v1/auth/enterprise/register
;; ============================================

(defn register-enterprise
  "Registrar nova Enterprise e usuário MASTER.
   
   Body:
     {:enterprise {:name 'Pet Shop ABC'
                   :slug 'petshop-abc'
                   :contact-email 'contato@petshop.com'
                   :contact-phone '+5511999998888'}
      :user {:email 'owner@petshop.com'
             :password 'senha123'
             :name 'João Silva'}}
   
   Response:
     {:token 'jwt...'
      :enterprise {...}
      :user {...}}"
  [{:keys [ds]} request]
  (let [{:keys [enterprise user]} (:body-params request)]
    (cond
      ;; Validar enterprise
      (nil? (:name enterprise))
      (bad-request "Enterprise name is required")

      (nil? (:slug enterprise))
      (bad-request "Enterprise slug is required")

      (not (valid-slug? (:slug enterprise)))
      (bad-request "Invalid slug format (use lowercase letters, numbers, and hyphens)")

      ;; Validar user
      (nil? (:email user))
      (bad-request "User email is required")

      (not (valid-email? (:email user)))
      (bad-request "Invalid email format")

      (nil? (:name user))
      (bad-request "User name is required")

      :else
      (try
        ;; Verificar se slug já existe
        (let [existing-enterprise (db/execute-one! ds
                                                   {:select [:id]
                                                    :from :core.enterprises
                                                    :where [:= :slug (:slug enterprise)]})]
          (if existing-enterprise
            (bad-request "Enterprise slug already exists")

            ;; Criar enterprise e usuário em transação
            (let [enterprise-id (str (UUID/randomUUID))
                  user-id (str (UUID/randomUUID))
                  password (:password user)
                  password-hash (when-not (str/blank? password)
                                  (auth/hash-password password))

                  ;; Build enterprise record with only existing columns
                  enterprise-record (cond-> {:id [:cast enterprise-id :uuid]
                                             :name (:name enterprise)
                                             :slug (:slug enterprise)
                                             :status "ACTIVE"}
                                      (or (:contact-email enterprise) (:contactEmail enterprise)) 
                                      (assoc :contact-email (or (:contact-email enterprise) (:contactEmail enterprise)))
                                      
                                      (or (:contact-phone enterprise) (:contactPhone enterprise)) 
                                      (assoc :contact-phone (or (:contact-phone enterprise) (:contactPhone enterprise)))
                                      
                                      (:address enterprise) (assoc :address (:address enterprise))
                                      (:logo-url enterprise) (assoc :logo-url (:logo-url enterprise))
                                      (:latitude enterprise) (assoc :latitude (:latitude enterprise))
                                      (:longitude enterprise) (assoc :longitude (:longitude enterprise))
                                      
                                      (or (:cnpj enterprise) (:document enterprise))
                                      (assoc :cnpj (or (:cnpj enterprise) (:document enterprise)))
                                      
                                      (or (:service-type enterprise) (:serviceType enterprise))
                                      (assoc :service-type (or (:service-type enterprise) (:serviceType enterprise))))

                  ;; Criar enterprise
                  _ (db/execute-one! ds
                                     {:insert-into :core.enterprises
                                      :values [enterprise-record]})

                  ;; Build user record with only existing columns
                  user-record (cond-> {:id [:cast user-id :uuid]
                                       :enterprise-id [:cast enterprise-id :uuid]
                                       :email (:email user)
                                       :password-hash password-hash
                                       :name (:name user)
                                       :role "MASTER"
                                       :status "ACTIVE"}
                                (:phone user) (assoc :phone (:phone user)))

                  ;; Criar usuário MASTER
                  _ (db/execute-one! ds
                                     {:insert-into :core.users
                                      :values [user-record]})

                  ;; Gerar token
                  jwt-token (auth/generate-enterprise-token
                             user-id
                             enterprise-id
                             (:email user)
                             "MASTER")]

              (log/info "New enterprise registered:" (:slug enterprise)
                        "master:" (:email user))

              (created
               {:token jwt-token
                :enterprise {:id enterprise-id
                             :name (:name enterprise)
                             :slug (:slug enterprise)}
                :user {:id user-id
                       :email (:email user)
                       :name (:name user)
                       :role "MASTER"
                       :enterprise-id enterprise-id}}))))

        (catch Exception e
          (log/error e "Failed to register enterprise")
          (if (re-find #"duplicate key" (str (.getMessage e)))
            (bad-request "Email already registered")
            (error "Registration failed")))))))

;; ============================================
;; GET /api/v1/auth/enterprise/me
;; ============================================

(defn get-current-user
  "Retorna informações do Enterprise User autenticado."
  [{:keys [ds]} request]
  (let [user-id (get-in request [:user :user-id])
        enterprise-id (get-in request [:user :enterprise-id])]
    (if-not user-id
      (unauthorized "Enterprise authentication required")

      (try
        (let [user (db/execute-one! ds
                                    {:select [:u.id :u.enterprise-id :u.email :u.phone
                                              :u.name :u.role :u.avatar-url :u.status
                                              :u.created-at :u.updated-at
                                              [:e.name :enterprise-name]
                                              [:e.slug :enterprise-slug]]
                                     :from [[:core.users :u]]
                                     :join [[:core.enterprises :e]
                                            [:= :u.enterprise-id :e.id]]
                                     :where [:= :u.id [:cast user-id :uuid]]})
              ;; Fetch wallet info
              wallet (db/execute-one! ds
                                      {:select [:id :balance-cents :pending-cents :updated-at]
                                       :from [:financial.wallets]
                                       :where [:and
                                               [:= :owner-id [:cast user-id :uuid]]
                                               [:= :owner-type "USER"]]})]
          (if user
            (ok {:user (-> user
                                    (update :id str)
                                    (update :enterprise-id str))
                          :wallet (when wallet
                                    {:id (str (:id wallet))
                                     :balance_cents (:balance-cents wallet)
                                     :pending_cents (:pending-cents wallet)
                                     :updated_at (:updated-at wallet)})})
            (unauthorized "User not found")))

        (catch Exception e
          (log/error e "Failed to get enterprise user:" user-id)
          (error "Failed to get user info"))))))

;; ============================================
;; POST /api/v1/auth/enterprise/users
;; (Criar novo usuário na Enterprise - apenas MASTER/ADMIN)
;; ============================================

(defn create-enterprise-user
  "Criar novo usuário na Enterprise.
   
   Apenas MASTER pode criar ADMIN.
   MASTER e ADMIN podem criar EMPLOYEE.
   
   Body:
     {:email 'func@petshop.com'
      :password 'senha123'
      :name 'Maria'
      :role 'EMPLOYEE'}"
  [{:keys [ds]} request]
  (let [creator-role (keyword (get-in request [:user :role]))
        enterprise-id (:enterprise-id request)
        {:keys [email password name role phone cpf job-title hiring-date]} (:body-params request)
        requested-role (or role "EMPLOYEE")]
    (cond
      (nil? enterprise-id)
      (unauthorized "Enterprise context required")

      (nil? email)
      (bad-request "Email is required")

      (not (valid-email? email))
      (bad-request "Invalid email format")

      (nil? name)
      (bad-request "Name is required")

      ;; Validar permissão para criar role
      (and (= requested-role "MASTER")
           (not= creator-role :MASTER))
      (bad-request "Only MASTER can create MASTER users")

      (and (= requested-role "ADMIN")
           (not= creator-role :MASTER))
      (bad-request "Only MASTER can create ADMIN users")

      :else
      (try
        (let [user-id (str (UUID/randomUUID))
              password-hash (when-not (str/blank? password)
                              (auth/hash-password password))
              _ (db/execute-one! ds
                                 {:insert-into :core.users
                                  :values [{:id [:cast user-id :uuid]
                                            :enterprise-id [:cast enterprise-id :uuid]
                                            :email email
                                            :password-hash password-hash
                                            :name name
                                            :phone phone
                                            :cpf cpf
                                            :job-title job-title
                                            :hiring-date (when hiring-date [:cast hiring-date :date])
                                            :role requested-role
                                            :status "ACTIVE"}]})
              new-user (db/execute-one! ds
                                        {:select [:id :email :name :role :phone]
                                         :from :core.users
                                         :where [:= :id [:cast user-id :uuid]]})]
          (log/info "Enterprise user created:" email "role:" requested-role
                    "by:" (get-in request [:user :email]))
          (created {:user (update new-user :id str)}))

        (catch Exception e
          (log/error e "Failed to create enterprise user")
          (if (re-find #"duplicate key" (str (.getMessage e)))
            (bad-request "Email already exists in this enterprise")
            (error "Failed to create user")))))))
