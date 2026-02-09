(ns pet-app.api.auth
  "Authentication API handlers (LEGACY).
   
   DEPRECATED: These endpoints are kept for backward compatibility.
   New code should use pet-app.api.auth.otp-auth or pet-app.api.auth.enterprise-auth.
   
   Provides login endpoint and authentication middleware."
  (:require [pet-app.domain.schemas :as schemas]
            [pet-app.infra.auth :as auth]
            [pet-app.api.helpers :refer [ok unauthorized bad-request error]]
            [clojure.tools.logging :as log]))

;; ============================================
;; Schemas
;; ============================================

(def LoginRequest
  "Schema for POST /api/v1/auth/login"
  [:map
   [:phone [:re #"^\+?[1-9]\d{1,14}$"]]
   [:password [:string {:min 1}]]])

;; ============================================
;; POST /api/v1/auth/login
;; ============================================

(defn login
  "Authenticate user and return JWT token.
   
   Flow:
   1. Validate request body
   2. Find user by phone
   3. Verify password
   4. Generate JWT token
   5. Return token and user info"
  [{:keys [ds]} request]
  (let [body (:body-params request)
        validation (schemas/validate LoginRequest body)]

    (if-not (:valid? validation)
      (bad-request (:errors validation))

      (try
        (let [{:keys [phone password]} body
              user (auth/authenticate-user-by-phone ds phone password)]

          (if user
            (let [token (auth/generate-token
                         (:id user)
                         (:enterprise-id user)
                         (:phone user)
                         (:role user))]
              (ok
               {:token token
                :user {:id (:id user)
                       :email (:email user)
                       :phone (:phone user)
                       :name (:name user)
                       :role (:role user)
                       :enterprise-id (:enterprise-id user)}}))

            (unauthorized "Invalid phone or password")))

        (catch Exception e
          (log/error e "Login failed")
          (error (.getMessage e)))))))

;; ============================================
;; GET /api/v1/auth/me
;; ============================================

(defn get-current-user
  "Get current authenticated user info from token.
   
   Requires authentication middleware to extract user from request."
  [{:keys [user]} _request]
  (if user
    (ok {:user user})
    (unauthorized "Not authenticated")))


;; ============================================
;; TEMPORARY: DEV PLATFORM LOGIN
;; ============================================

(defn dev-login-platform
  "DEPRECATED/TEMPORARY: Retorna um token PLATFORM sem conferir senha.
   Apenas para uso em desenvolvimento."
  [_request]
  (try
    (let [token (auth/generate-enterprise-token
                 "00000000-0000-4000-a000-000000000000" ;; ID fixo da migration 011
                 nil                                  ;; Platform Admin não tem enterprise-id
                 "petoo@petoo.com.br"
                 "PLATFORM")]
      (ok
       {:token token
        :user {:id "00000000-0000-4000-a000-000000000000"
               :email "petoo@petoo.com.br"
               :name "PETOO Platform Admin"
               :role "PLATFORM"}}))
    (catch Exception e
      (error (.getMessage e)))))
