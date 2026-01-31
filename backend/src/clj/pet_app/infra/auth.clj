(ns pet-app.infra.auth
  "Authentication and authorization utilities.
   
   Provides:
   - Password hashing and verification
   - JWT token generation and validation
   - User authentication helpers"
  (:require [buddy.hashers :as hashers]
            [buddy.sign.jwt :as jwt]
            [clojure.tools.logging :as log]
            [pet-app.infra.db :as db]
            [clj-time.core :as time]
            [clj-time.coerce :as time-coerce])
  (:import [java.util Date]))

;; ============================================
;; Password Hashing
;; ============================================

(defn hash-password
  "Hash a password using bcrypt.
   
   Args:
     password - Plain text password
   
   Returns:
     Hashed password string"
  [password]
  (hashers/derive password {:alg :bcrypt+sha512}))

(defn verify-password
  "Verify a password against a hash.
   
   Args:
     password - Plain text password
     hash     - Hashed password from database
   
   Returns:
     true if password matches, false otherwise"
  [password hash]
  (try
    (hashers/check password hash)
    (catch Exception e
      (log/warn "Password verification failed:" (.getMessage e))
      false)))

;; ============================================
;; JWT Configuration
;; ============================================

(def ^:private jwt-secret
  "JWT secret key. In production, use environment variable."
  (or (System/getenv "JWT_SECRET")
      "petoo-super-secret-key-change-in-production"))

(def ^:private jwt-algorithm
  "JWT signing algorithm."
  :hs512)

(def ^:private token-expiration-hours
  "Token expiration time in hours."
  24)

(defn- token-expiration-time
  "Calculate token expiration time."
  []
  (time-coerce/to-date
   (time/plus (time/now)
              (time/hours token-expiration-hours))))

;; ============================================
;; JWT Token Generation
;; ============================================

(defn generate-token
  "Generate a JWT token for a user (legacy - backward compatibility).
   
   Args:
     user-id    - User UUID string
     tenant-id  - Tenant/Enterprise UUID string
     phone      - User phone number
     role       - User role (CUSTOMER, ADMIN, STAFF)
   
   Returns:
     JWT token string"
  [user-id tenant-id phone role]
  (let [claims {:user-id user-id
                :tenant-id tenant-id
                :enterprise-id tenant-id  ;; Alias for new code
                :phone phone
                :role role
                :type "enterprise"  ;; Default to enterprise for backward compat
                :exp (token-expiration-time)
                :iat (Date.)}]
    (try
      (jwt/sign claims jwt-secret {:alg jwt-algorithm})
      (catch Exception e
        (log/error e "Failed to generate JWT token")
        (throw (ex-info "Token generation failed" {:error (.getMessage e)}))))))

(defn generate-client-token
  "Generate JWT for a Client (end user - pet owner).
   
   Clients authenticate via Phone + OTP.
   
   Claims:
     - client-id: UUID do cliente
     - phone: telefone do cliente
     - type: 'client'
     - exp: expiração
   
   Args:
     client-id - Client UUID string
     phone     - Client phone number
   
   Returns:
     JWT token string"
  [client-id phone]
  (let [claims {:client-id client-id
                :phone phone
                :type "client"
                :exp (token-expiration-time)
                :iat (Date.)}]
    (try
      (jwt/sign claims jwt-secret {:alg jwt-algorithm})
      (catch Exception e
        (log/error e "Failed to generate client JWT token")
        (throw (ex-info "Token generation failed" {:error (.getMessage e)}))))))

(defn generate-enterprise-token
  "Generate JWT for an Enterprise User (employee of a business).
   
   Enterprise users authenticate via Email + Password.
   
   Claims:
     - user-id: UUID do usuário
     - enterprise-id: UUID da enterprise
     - email: email do usuário
     - role: MASTER|ADMIN|EMPLOYEE
     - type: 'enterprise'
     - exp: expiração
   
   Args:
     user-id       - User UUID string
     enterprise-id - Enterprise UUID string
     email         - User email
     role          - User role (MASTER, ADMIN, EMPLOYEE)
   
   Returns:
     JWT token string"
  [user-id enterprise-id email role]
  (let [claims {:user-id user-id
                :enterprise-id enterprise-id
                :email email
                :role role
                :type "enterprise"
                :exp (token-expiration-time)
                :iat (Date.)}]
    (try
      (jwt/sign claims jwt-secret {:alg jwt-algorithm})
      (catch Exception e
        (log/error e "Failed to generate enterprise JWT token")
        (throw (ex-info "Token generation failed" {:error (.getMessage e)}))))))

;; ============================================
;; JWT Token Validation
;; ============================================

(defn verify-token
  "Verify and decode a JWT token.
   
   Args:
     token - JWT token string
   
   Returns:
     {:valid? true :claims {...}} or {:valid? false :error ...}"
  [token]
  (try
    (let [claims (jwt/unsign token jwt-secret {:alg jwt-algorithm})]
      {:valid? true :claims claims})
    (catch Exception e
      (log/warn "Token verification failed:" (.getMessage e))
      {:valid? false :error (.getMessage e)})))

(defn extract-user-info
  "Extract user information from a valid token.
   
   Args:
     token - JWT token string
   
   Returns:
     {:user-id ... :tenant-id ... :email ... :role ...} or nil"
  [token]
  (let [result (verify-token token)]
    (when (:valid? result)
      (:claims result))))

;; ============================================
;; Authentication Helpers
;; ============================================

(defn authenticate-user
  "Authenticate a user by email and password.
   
   Args:
     ds       - DataSource
     email    - User email
     password - Plain text password
   
   Returns:
     User map with :id, :tenant-id, :email, :role if authenticated,
     nil otherwise"
  [ds email password]
  (try
    (let [user (db/execute-one! ds
                                {:select [:id :enterprise-id :email :phone :password-hash :name :role :status]
                                 :from [:core.users]
                                 :where [:and
                                         [:= :email email]
                                         [:= :status "ACTIVE"]]})]
      (when (and user
                 (verify-password password (:password-hash user)))
        (dissoc user :password-hash)))
    (catch Exception e
      (log/error e "Authentication failed for email:" email)
      nil)))

(defn authenticate-user-by-phone
  "Authenticate a user by phone number and password.
   
   Args:
     ds       - DataSource
     phone    - User phone number
     password - Plain text password
   
   Returns:
     User map with :id, :tenant-id, :phone, :role if authenticated,
     nil otherwise"
  [ds phone password]
  (try
    (let [user (db/execute-one! ds
                                {:select [:id :enterprise-id :email :phone :password-hash :name :role :status]
                                 :from [:core.users]
                                 :where [:and
                                         [:= :phone phone]
                                         [:= :status "ACTIVE"]]})]
      (when (and user
                 (verify-password password (:password-hash user)))
        (dissoc user :password-hash)))
    (catch Exception e
      (log/error e "Authentication failed for phone:" phone)
      nil)))

(defn get-user-by-id
  "Get user by ID (for authorization checks).
   
   Args:
     ds     - DataSource
     user-id - User UUID string
   
   Returns:
     User map or nil"
  [ds user-id]
  (try
    (db/execute-one! ds
                     {:select [:id :enterprise-id :email :name :role :status]
                      :from [:core.users]
                      :where [:and
                              [:= :id [:cast user-id :uuid]]
                              [:= :status "ACTIVE"]]})
    (catch Exception e
      (log/error e "Failed to get user by ID:" user-id)
      nil)))

