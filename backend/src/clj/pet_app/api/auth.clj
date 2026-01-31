(ns pet-app.api.auth
  "Authentication API handlers.
   
   Provides login endpoint and authentication middleware."
  (:require [pet-app.domain.schemas :as schemas]
            [pet-app.infra.auth :as auth]
            [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

;; ============================================
;; Request/Response Helpers
;; ============================================

(defn- response-ok
  "Return 200 OK with data."
  [data]
  {:status 200
   :body data})

(defn- response-unauthorized
  "Return 401 Unauthorized."
  [message]
  {:status 401
   :body {:error "Unauthorized"
          :message message}})

(defn- response-bad-request
  "Return 400 Bad Request with validation errors."
  [errors]
  {:status 400
   :body {:error "Validation failed"
          :details errors}})

(defn- response-error
  "Return 500 Internal Server Error."
  [message]
  {:status 500
   :body {:error "Internal server error"
          :message message}})

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
      (response-bad-request (:errors validation))

      (try
        (let [{:keys [phone password]} body
              user (auth/authenticate-user-by-phone ds phone password)]

          (if user
            (let [token (auth/generate-token
                         (:id user)
                         (:tenant-id user)
                         (:phone user)
                         (:role user))]
              (response-ok
               {:token token
                :user {:id (:id user)
                       :email (:email user)
                       :phone (:phone user)
                       :name (:name user)
                       :role (:role user)
                       :tenant-id (:tenant-id user)}}))

            (response-unauthorized "Invalid phone or password")))

        (catch Exception e
          (log/error e "Login failed")
          (response-error (.getMessage e)))))))

;; ============================================
;; GET /api/v1/auth/me
;; ============================================

(defn get-current-user
  "Get current authenticated user info from token.
   
   Requires authentication middleware to extract user from request."
  [{:keys [user]} _request]
  (if user
    (response-ok {:user user})
    (response-unauthorized "Not authenticated")))

