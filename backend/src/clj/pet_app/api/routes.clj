(ns pet-app.api.routes
  "API routes using Reitit.
   
   Defines both Command API (write operations) and Query API (read operations)."
  (:require [reitit.ring :as ring]
            [reitit.coercion.malli :as malli-coercion]
            [reitit.ring.coercion :as coercion]
            [reitit.ring.middleware.muuntaja :as muuntaja]
            [reitit.ring.middleware.parameters :as parameters]
            [muuntaja.core :as m]
            [ring.middleware.cors :refer [wrap-cors]]
            [ring.middleware.multipart-params :refer [wrap-multipart-params]]
            [clojure.tools.logging :as log]
            [pet-app.api.commands :as commands]
            [pet-app.api.commands.clients :as client-commands]
            [pet-app.api.queries :as queries]
            [pet-app.api.queries.client-queries :as client-queries]
            [pet-app.api.queries.enterprise-queries :as enterprise-queries]
            [pet-app.api.queries.pet-queries :as pet-queries]
            [pet-app.api.auth :as auth]
            [pet-app.api.auth.otp-auth :as otp-auth]
            [pet-app.api.auth.enterprise-auth :as enterprise-auth]
            [pet-app.api.middleware :as middleware]
            [pet-app.api.commands.wallet-commands :as wallet-commands]
            [pet-app.api.queries.wallet-queries :as wallet-queries]))

;; ============================================
;; Health & Utility Handlers
;; ============================================

(defn health-handler
  "Health check endpoint.
   Returns status of all system components."
  [{:keys [db kafka]}]
  (fn [_request]
    (let [db-status (try
                      (when db
                        (require '[next.jdbc :as jdbc])
                        ((resolve 'jdbc/execute-one!) db ["SELECT 1"])
                        "connected")
                      (catch Exception e
                        (log/warn "DB health check failed:" (.getMessage e))
                        "disconnected"))
          kafka-status (if (:producer kafka)
                         "connected"
                         (or (:error kafka) "disconnected"))]
      {:status 200
       :body {:status "ok"
              :service "petoo-backend"
              :version "0.1.0"
              :components {:database db-status
                           :kafka kafka-status}}})))

(defn ping-handler
  "Simple ping endpoint."
  [_request]
  {:status 200
   :body {:message "pong"
          :timestamp (System/currentTimeMillis)}})

;; ============================================
;; Command API Routes (Escrita)
;; ============================================

(defn command-routes
  "Routes for write operations (POST, PUT, DELETE).
   Commands are validated, persisted, and events are published to Kafka."
  [{:keys [db kafka config]}]
  (let [cmd-deps {:ds db
                  :kafka-producer (:producer kafka)
                  :topics (:topics config)}]
    [["/appointments"
      {:post {:summary "Create new appointment"
              :handler (partial commands/create-appointment cmd-deps)}}]

     ["/users"
      {:post {:summary "Create new user"
              :handler (partial commands/create-user cmd-deps)}}]

     ["/pets"
      {:post {:summary "Create new pet"
              :handler (partial commands/create-pet cmd-deps)}}]

     ["/services"
      {:post {:summary "Create new service"
              :handler (partial commands/create-service cmd-deps)}}]

     ["/professionals"
      {:post {:summary "Create new professional"
              :handler (partial commands/create-professional cmd-deps)}}]]))

;; ============================================
;; Query API Routes (Leitura)
;; ============================================

(defn query-routes
  "Routes for read operations (GET).
   Queries read from denormalized read models for fast responses."
  [{:keys [db]}]
  (let [query-deps {:ds db}]
    [["/appointments"
      {:get {:summary "List appointments"
             :handler (partial queries/list-appointments query-deps)}}]

     ["/appointments/:id"
      {:get {:summary "Get appointment by ID"
             :handler (partial queries/get-appointment query-deps)}}]

     ["/schedule/:professional-id"
      {:get {:summary "Get professional schedule"
             :handler (partial queries/get-professional-schedule query-deps)}}]

     ["/enterprises/:slug"
      {:get {:summary "Get enterprise by slug (whitelabel config)"
             :handler (partial queries/get-enterprise-by-slug query-deps)}}]

     ["/services"
      {:get {:summary "List services"
             :handler (partial queries/list-services query-deps)}}]

     ["/professionals"
      {:get {:summary "List professionals"
             :handler (partial queries/list-professionals query-deps)}}]]))

;; ============================================
;; Router Factory
;; ============================================

(defn router
  "Creates Reitit router with all routes and middleware."
  [{:keys [db kafka config] :as deps}]
  (let [cmd-deps {:ds db
                  :kafka-producer (:producer kafka)
                  :topics (:topics config)}
        query-deps {:ds db}]
    (ring/router
     [;; Health & Utility
      ["/health" {:get {:summary "Health check"
                        :handler (health-handler deps)}}]
      ["/ping" {:get {:summary "Ping"
                      :handler ping-handler}}]
      ["/debug/headers" {:get {:summary "Debug endpoint to see headers"
                               :handler (fn [request]
                                          {:status 200
                                           :body {:headers (:headers request)
                                                  :authorization (get-in request [:headers "authorization"])
                                                  :Authorization (get-in request [:headers "Authorization"])
                                                  :user (:user request)}})}}]

      ;; API v1
      ["/api/v1"
       ;; ============================================
       ;; Authentication endpoints
       ;; ============================================
       ["/auth"
        ;; Legacy login (backward compatibility)
        ["/login"
         {:post {:summary "Login and get JWT token (legacy)"
                 :handler (partial auth/login {:ds db})}}]
        ["/dev-platform-login"
         {:get {:summary "TEMPORARY: Login as PLATFORM without password"
                :handler auth/dev-login-platform}}]
        ["/me"
         {:get {:summary "Get current user info (legacy)"
                :handler (-> (fn [request]
                               (auth/get-current-user request nil))
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

        ;; OTP Authentication (Clients - Phone based)
        ["/otp"
         ["/request"
          {:post {:summary "Request OTP for phone authentication"
                  :handler (partial otp-auth/request-otp {:ds db})}}]
         ["/verify"
          {:post {:summary "Verify OTP and get JWT token"
                  :handler (partial otp-auth/verify-otp {:ds db})}}]]

        ;; Client endpoints (authenticated)
        ["/client"
         ["/me"
          {:get {:summary "Get current client info"
                 :handler (-> (partial otp-auth/get-current-client {:ds db})
                              middleware/require-client-auth
                              middleware/require-authentication
                              middleware/wrap-authentication)}
           :put {:summary "Update client profile"
                 :handler (-> (partial otp-auth/update-client-profile {:ds db})
                              middleware/require-client-auth
                              middleware/require-authentication
                              middleware/wrap-authentication)}}]]

        ;; Enterprise Authentication (Email + Password)
        ["/enterprise"
         ["/login"
          {:post {:summary "Enterprise user login"
                  :handler (partial enterprise-auth/login {:ds db})}}]
         ["/register"
          {:post {:summary "Register new enterprise with master user"
                  :handler (-> (partial enterprise-auth/register-enterprise {:ds db})
                               middleware/require-platform-admin
                               middleware/require-authentication
                               middleware/wrap-authentication)}}]
         ["/me"
          {:get {:summary "Get current enterprise user info"
                 :handler (-> (partial enterprise-auth/get-current-user {:ds db})
                              middleware/require-authentication
                              middleware/wrap-authentication)}}]
         ["/users"
          {:post {:summary "Create new user in enterprise (MASTER/ADMIN only)"
                  :handler (-> (partial enterprise-auth/create-enterprise-user {:ds db})
                               middleware/wrap-enterprise-isolation
                               middleware/require-master-or-admin
                               middleware/require-authentication
                               middleware/wrap-authentication)}}]]]

       ;; ============================================
       ;; Wallet Routes
       ;; ============================================
       ["/wallet"
        ["/balance"
         {:get {:summary "Get current user's wallet balance"
                :handler (-> (partial wallet-queries/get-balance {:db db})
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]
        ["/transactions"
         {:get {:summary "Get user transaction history"
                :handler (-> (partial wallet-queries/get-transactions {:db db})
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]
        ["/deposit"
         {:post {:summary "Request a wallet deposit"
                 :handler (-> (partial wallet-commands/deposit-funds {:db db :kafka kafka :config config})
                              middleware/require-authentication
                              middleware/wrap-authentication)}}]
        ["/dev/add-balance"
         {:post {:summary "DEV ONLY: Manually add balance"
                 :handler (partial wallet-commands/add-balance-dev {:db db :config config})}}]]

       ["/enterprise/:enterprise-id/wallet"
        {:get {:summary "Get enterprise wallet balance (Admin only)"
               :handler (-> (partial wallet-queries/get-enterprise-wallet {:db db})
                            middleware/require-authentication
                            middleware/wrap-authentication)}}]

       ;; ============================================
       ;; User Pets (authenticated users)
       ;; ============================================

       ;; ============================================
       ;; User Pets (authenticated users)
       ;; ============================================
       ["/users/me/pets"
        {:get {:summary "List authenticated user's pets with status"
               :handler (-> (partial pet-queries/list-user-pets {:db db})
                            middleware/require-authentication
                            middleware/wrap-authentication)}}]

       ["/pets/:pet-id"
        {:get {:summary "Get pet details"
               :handler (-> (partial pet-queries/get-pet-by-id {:db db})
                            middleware/require-authentication
                            middleware/wrap-authentication)}}]

       ;; ============================================
       ;; Client Routes (for pet owners)
       ["/client"
        ;; Client's pets
        ["/pets"
         {:get {:summary "List client's pets"
                :handler (-> (partial client-queries/list-client-pets {:ds db})
                             middleware/require-client-auth
                             middleware/require-authentication
                             middleware/wrap-authentication)}
          :post {:summary "Create a new pet"
                 :handler (-> (partial client-commands/create-pet cmd-deps)
                              middleware/require-client-auth
                              middleware/require-authentication
                              middleware/wrap-authentication)}}]
        ["/pets/:id"
         {:get {:summary "Get pet details"
                :handler (-> (partial client-queries/get-client-pet {:ds db})
                             middleware/require-client-auth
                             middleware/require-authentication
                             middleware/wrap-authentication)}
          :put {:summary "Update pet"
                :handler (-> (partial client-commands/update-pet cmd-deps)
                             middleware/require-client-auth
                             middleware/require-authentication
                             middleware/wrap-authentication)}
          :delete {:summary "Delete pet"
                   :handler (-> (partial client-commands/delete-pet cmd-deps)
                                middleware/require-client-auth
                                middleware/require-authentication
                                middleware/wrap-authentication)}}]

        ;; Client's appointments
        ["/appointments"
         {:get {:summary "List client's appointments"
                :handler (-> (partial client-queries/list-client-appointments {:ds db})
                             middleware/require-client-auth
                             middleware/require-authentication
                             middleware/wrap-authentication)}
          :post {:summary "Book an appointment"
                 :handler (-> (partial client-commands/create-appointment cmd-deps)
                              middleware/require-client-auth
                              middleware/require-authentication
                              middleware/wrap-authentication)}}]
        ["/appointments/:id/cancel"
         {:post {:summary "Cancel an appointment"
                 :handler (-> (partial client-commands/cancel-appointment cmd-deps)
                              middleware/require-client-auth
                              middleware/require-authentication
                              middleware/wrap-authentication)}}]

        ;; Enterprise discovery
        ["/discover"
         ["/nearby"
          {:get {:summary "Find nearby enterprises (by geolocation)"
                 :handler (-> (partial client-queries/list-nearby-enterprises {:ds db})
                              middleware/require-client-auth
                              middleware/require-authentication
                              middleware/wrap-authentication)}}]]

        ;; View enterprise details (public for discovery)
        ["/enterprises/:enterprise-id"
         ["/services"
          {:get {:summary "List services of an enterprise"
                 :handler (partial client-queries/get-enterprise-services {:ds db})}}]
         ["/professionals"
          {:get {:summary "List professionals of an enterprise"
                 :handler (partial client-queries/get-enterprise-professionals {:ds db})}}]]]
       ["/appointments"
        {:get {:summary "List appointments"
               :handler (-> (partial queries/list-appointments query-deps)
                            middleware/wrap-authentication)}
         :post {:summary "Create new appointment"
                :handler (-> (partial commands/create-appointment cmd-deps)
                             (middleware/require-enterprise-role #{:MASTER :ADMIN :EMPLOYEE})
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ["/appointments/:id"
        {:get {:summary "Get appointment by ID"
               :handler (partial queries/get-appointment query-deps)}}]

       ;; Users - POST only (public for registration)
       ["/users"
        {:post {:summary "Create new user (registration)"
                :handler (partial commands/create-user cmd-deps)}}]

       ;; Who Am I - Unified endpoint for verifying identity
       ["/users/me"
        {:get {:summary "Get current user info (Client or Enterprise)"
               :handler (-> (partial queries/get-current-user query-deps)
                            middleware/require-authentication
                            middleware/wrap-authentication)}}]

       ;; Pets - POST only
       ["/pets"
        {:post {:summary "Create new pet"
                :handler (-> (partial commands/create-pet cmd-deps)
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ["/pets/:id/photo"
        {:post {:summary "Upload pet photo"
                :handler (-> (partial commands/update-pet-photo cmd-deps)
                             (middleware/require-enterprise-role #{:MASTER :ADMIN :EMPLOYEE})
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ;; Services - GET public, POST protected
       ["/services"
        {:get {:summary "List services"
               :handler (partial queries/list-services query-deps)}
         :post {:summary "Create new service"
                :handler (-> (partial commands/create-service cmd-deps)
                             middleware/require-master-or-admin
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ;; Professionals - GET public, POST protected
       ["/professionals"
        {:get {:summary "List professionals"
               :handler (partial queries/list-professionals query-deps)}
         :post {:summary "Create new professional"
                :handler (-> (partial commands/create-professional cmd-deps)
                             middleware/require-master-or-admin
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ["/professionals/:id/avatar"
        {:post {:summary "Upload professional avatar"
                :handler (-> (partial commands/update-professional-avatar cmd-deps)
                             middleware/require-master-or-admin
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ;; Schedule - GET only
       ["/schedule/:professional-id"
        {:get {:summary "Get professional schedule"
               :handler (partial queries/get-professional-schedule query-deps)}}]

       ;; Enterprises - GET by slug, POST to create (PLATFORM ONLY)
       ["/enterprises"
        {:get {:summary "List all active enterprises (public)"
               :handler (partial enterprise-queries/list-all-enterprises {:db db})}
         :post {:summary "Create new enterprise"
                :handler (-> (partial commands/create-enterprise cmd-deps)
                             middleware/require-platform-admin
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ["/enterprises/:id/logo"
        {:post {:summary "Upload enterprise logo"
                :handler (-> (partial commands/update-enterprise-logo cmd-deps)
                             middleware/require-master-or-admin
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ["/enterprises/:slug"
        {:get {:summary "Get enterprise by slug with details (public)"
               :handler (partial enterprise-queries/get-enterprise-by-slug {:db db})}}]]]

     {:data {:coercion malli-coercion/coercion
             :muuntaja m/instance
             :middleware [parameters/parameters-middleware
                          wrap-multipart-params
                          muuntaja/format-negotiate-middleware
                          muuntaja/format-response-middleware
                          muuntaja/format-request-middleware
                          coercion/coerce-request-middleware
                          coercion/coerce-response-middleware]}})))

;; ============================================
;; Ring Handler Factory
;; ============================================

(defn handler
  "Creates Ring handler from router with CORS and default handlers."
  [router]
  (-> (ring/ring-handler
       router
       (ring/routes

        (ring/create-resource-handler {:path "/" :root "public"})
        (ring/create-default-handler
         {:not-found (constantly {:status 404
                                  :body {:error "Not found"}})
          :method-not-allowed (constantly {:status 405
                                           :body {:error "Method not allowed"}})})))
      (wrap-cors :access-control-allow-origin [#".*"]
                 :access-control-allow-methods [:get :post :put :delete :options]
                 :access-control-allow-headers [:content-type :authorization])))
