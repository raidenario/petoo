(ns pet-app.api.middleware
  "Authentication and authorization middleware for Ring handlers."
  (:require [pet-app.infra.auth :as auth]
            [clojure.tools.logging :as log]
            [clojure.string :as str]
            [ring.util.response :as response]))

;; ============================================
;; Authentication Middleware
;; ============================================

(defn wrap-authentication
  "Middleware to extract and validate JWT token from Authorization header.
   
   Adds :user key to request with user information if token is valid.
   If token is invalid or missing, request continues without :user key."
  [handler]
  (fn [request]
    (let [headers (:headers request)
          ;; Ring/Jetty normalizes headers to lowercase, but check multiple variations
          auth-header (or (get headers "authorization")
                         (get headers "Authorization")
                         (some (fn [[k v]]
                                 (when (= (str/lower-case k) "authorization")
                                   v))
                               headers))
          token (when auth-header
                  (let [header-str (str auth-header)]
                    (when-let [match (re-find #"(?i)^Bearer\s+(.+)$" header-str)]
                      (second match))))
          user-info (when token
                      (try
                        (auth/extract-user-info token)
                        (catch Exception e
                          (log/warn "Error extracting user info from token:" (.getMessage e))
                          nil)))]
      
      ;; Debug logging
      (when auth-header
        (log/debug "Authorization header found, token present:" (boolean token)))
      (when (and token (not user-info))
        (log/warn "Token validation failed - token length:" (count token)))
      
      (if (and token (not user-info))
        ;; Token provided but invalid
        (do
          (log/warn "Invalid token provided")
          {:status 401
           :body {:error "Invalid or expired token"}})
        
        ;; Valid token or no token - continue
        (handler (assoc request :user user-info))))))

(defn require-authentication
  "Middleware that requires authentication.
   
   Returns 401 if user is not authenticated."
  [handler]
  (fn [request]
    (let [headers (:headers request)
          auth-header (or (get headers "authorization")
                         (get headers "Authorization"))]
      (if (:user request)
        (handler request)
        (do
          (log/warn "Authentication required but not provided. Headers keys:" (keys headers))
          (log/warn "Authorization header present:" (boolean auth-header))
          {:status 401
           :body {:error "Authentication required"
                  :message "Please provide a valid Bearer token in the Authorization header"}})))))

(defn require-role
  "Middleware that requires a specific role.
   
   Args:
     allowed-roles - Set of allowed roles (e.g., #{:ADMIN :STAFF})
   
   Returns 403 if user doesn't have required role."
  [handler allowed-roles]
  (fn [request]
    (let [user-role (:role (:user request))]
      (if (contains? allowed-roles user-role)
        (handler request)
        (response/response
         {:status 403
          :body {:error "Insufficient permissions"
                 :required-roles (vec allowed-roles)
                 :user-role user-role}})))))

