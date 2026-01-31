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
    (let [user-role (keyword (:role (:user request)))]
      (if (contains? allowed-roles user-role)
        (handler request)
        {:status 403
         :body {:error "Insufficient permissions"
                :required-roles (vec allowed-roles)
                :user-role user-role}}))))

;; ============================================
;; Enterprise Isolation Middleware
;; ============================================

(defn wrap-enterprise-isolation
  "Middleware que injeta enterprise-id nas queries.
   
   Apenas para rotas de Enterprise Users.
   Garante que usuários só acessem dados de sua Enterprise.
   
   Adiciona :enterprise-id ao request se usuário for do tipo 'enterprise'."
  [handler]
  (fn [request]
    (let [user (:user request)]
      (if (= (:type user) "enterprise")
        (handler (assoc request :enterprise-id (:enterprise-id user)))
        (handler request)))))

;; ============================================
;; Enterprise Role Authorization
;; ============================================

(defn require-enterprise-role
  "Middleware que verifica role específica para Enterprise Users.
   
   Requer que o usuário:
   1. Seja do tipo 'enterprise'
   2. Tenha uma das roles permitidas
   
   Args:
     allowed-roles - Set de roles permitidos (ex: #{:MASTER :ADMIN})
   
   Returns 403 se condições não forem atendidas."
  [handler allowed-roles]
  (fn [request]
    (let [user (:user request)
          user-type (:type user)
          user-role (keyword (:role user))]
      (cond
        ;; Não é usuário enterprise
        (not= user-type "enterprise")
        {:status 403
         :body {:error "This endpoint is for enterprise users only"
                :user-type user-type}}

        ;; Não tem role permitida
        (not (contains? allowed-roles user-role))
        {:status 403
         :body {:error "Insufficient permissions"
                :required-roles (vec allowed-roles)
                :user-role user-role}}

        ;; Autorizado!
        :else
        (handler request)))))

(defn require-master-or-admin
  "Convenience middleware: requer role MASTER ou ADMIN."
  [handler]
  (require-enterprise-role handler #{:MASTER :ADMIN}))

(defn require-master
  "Convenience middleware: requer role MASTER."
  [handler]
  (require-enterprise-role handler #{:MASTER}))

(defn require-platform-admin
  "Middleware que requer autenticação de Administrador da Plataforma (PETOO).
   
   Garante que apenas superusuários possam realizar operações globais
   (como criar novas enterprises)."
  [handler]
  (fn [request]
    (let [user (:user request)
          user-role (keyword (:role user))]
      (if (= user-role :PLATFORM)
        (handler request)
        {:status 403
         :body {:error "Access denied. Only Platform Administrators (PETOO) can perform this action."
                :user-role user-role}}))))

;; ============================================
;; Client Authorization
;; ============================================

(defn require-client-auth
  "Middleware que requer autenticação de Client.
   
   Verifica se o token é do tipo 'client'.
   
   Adiciona :client-id ao request para facilitar queries."
  [handler]
  (fn [request]
    (let [user (:user request)
          user-type (:type user)]
      (if (= user-type "client")
        (handler (assoc request :client-id (:client-id user)))
        {:status 403
         :body {:error "This endpoint is for clients only"
                :user-type user-type}}))))

;; ============================================
;; Combined Authorization
;; ============================================

(defn require-client-or-enterprise
  "Middleware que permite acesso para Clients ou Enterprise Users.
   
   Útil para endpoints compartilhados (ex: ver detalhes de um pet)."
  [handler]
  (fn [request]
    (let [user (:user request)
          user-type (:type user)]
      (if (contains? #{"client" "enterprise"} user-type)
        (handler (cond-> request
                   (= user-type "client")
                   (assoc :client-id (:client-id user))

                   (= user-type "enterprise")
                   (assoc :enterprise-id (:enterprise-id user))))
        {:status 403
         :body {:error "Authentication required (client or enterprise)"
                :user-type user-type}}))))
