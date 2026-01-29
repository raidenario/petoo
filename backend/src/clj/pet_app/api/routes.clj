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
            [pet-app.api.queries :as queries]
            [pet-app.api.auth :as auth]
            [pet-app.api.middleware :as middleware]))

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

     ["/tenants/:slug"
      {:get {:summary "Get tenant by slug (whitelabel config)"
             :handler (partial queries/get-tenant-by-slug query-deps)}}]

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
       ;; Authentication endpoints (public)
       ["/auth"
        ["/login"
         {:post {:summary "Login and get JWT token"
                 :handler (partial auth/login {:ds db})}}]
        ["/me"
         {:get {:summary "Get current user info"
                :handler (-> (fn [request]
                               (auth/get-current-user request nil))
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]]

       ;; Appointments - GET and POST combined (protected)
       ["/appointments"
        {:get {:summary "List appointments"
               :handler (-> (partial queries/list-appointments query-deps)
                            middleware/wrap-authentication)}
         :post {:summary "Create new appointment"
                :handler (-> (partial commands/create-appointment cmd-deps)
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ["/appointments/:id"
        {:get {:summary "Get appointment by ID"
               :handler (partial queries/get-appointment query-deps)}}]

       ;; Users - POST only (public for registration)
       ["/users"
        {:post {:summary "Create new user (registration)"
                :handler (partial commands/create-user cmd-deps)}}]

       ;; Pets - POST only (protected)
       ["/pets"
        {:post {:summary "Create new pet"
                :handler (-> (partial commands/create-pet cmd-deps)
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ["/pets/:id/photo"
        {:post {:summary "Upload pet photo"
                :handler (-> (partial commands/update-pet-photo cmd-deps)
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ;; Services - GET public, POST protected
       ["/services"
        {:get {:summary "List services"
               :handler (partial queries/list-services query-deps)}
         :post {:summary "Create new service"
                :handler (-> (partial commands/create-service cmd-deps)
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ;; Professionals - GET public, POST protected
       ["/professionals"
        {:get {:summary "List professionals"
               :handler (partial queries/list-professionals query-deps)}
         :post {:summary "Create new professional"
                :handler (-> (partial commands/create-professional cmd-deps)
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ["/professionals/:id/avatar"
        {:post {:summary "Upload professional avatar"
                :handler (-> (partial commands/update-professional-avatar cmd-deps)
                             middleware/require-authentication
                             middleware/wrap-authentication)}}]

       ;; Schedule - GET only
       ["/schedule/:professional-id"
        {:get {:summary "Get professional schedule"
               :handler (partial queries/get-professional-schedule query-deps)}}]

       ;; Tenants - GET by slug, POST to create
       ["/tenants"
        {:post {:summary "Create new tenant"
                :handler (partial commands/create-tenant cmd-deps)}}]

       ["/tenants/:id/logo"
        {:post {:summary "Upload tenant logo"
                :handler (partial commands/update-tenant-logo cmd-deps)}}]

       ["/tenants/:slug"
        {:get {:summary "Get tenant by slug (whitelabel config)"
               :handler (partial queries/get-tenant-by-slug query-deps)}}]]]

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
