(ns pet-app.api.helpers
  "Common helper functions for API responses.
   
   This namespace provides standardized response helpers used across all API handlers.
   Use these functions instead of creating duplicate response helpers in individual namespaces.")

;; ============================================
;; Success Responses
;; ============================================

(defn ok
  "Return 200 OK with body."
  ([body]
   {:status 200
    :body body}))

(defn created
  "Return 201 Created with body."
  [body]
  {:status 201
   :body body})

(defn accepted
  "Return 202 Accepted with resource id."
  [id & {:keys [message]}]
  {:status 202
   :body {:accepted true
          :id id
          :message (or message "Request accepted for processing")}})

;; ============================================
;; Error Responses
;; ============================================

(defn bad-request
  "Return 400 Bad Request.
   
   Usage:
   (bad-request \"Error message\")
   (bad-request {:field \"Error message\"})
   (bad-request {:error \"Bad Request\" :message \"Details\"})"
  ([details]
   (if (string? details)
     {:status 400
      :body {:error "Bad Request"
             :message details}}
     {:status 400
      :body (if (contains? details :error)
               details
               {:error "Bad Request"
                :details details})})))

(defn unauthorized
  "Return 401 Unauthorized."
  ([message]
   {:status 401
    :body {:error "Unauthorized"
           :message message}}))

(defn forbidden
  "Return 403 Forbidden."
  ([message]
   {:status 403
    :body {:error "Forbidden"
           :message message}}))

(defn not-found
  "Return 404 Not Found."
  ([]
   {:status 404
    :body {:error "Not Found"}})
  ([message]
   {:status 404
    :body {:error "Not Found"
           :message message}}))

(defn error
  "Return error response with status and message.
   
   Usage:
   (error 500 \"Internal server error\")
   (error \"Internal server error\")  ; defaults to 500"
  ([status message]
   {:status status
    :body {:error (case status
                    400 "Bad Request"
                    401 "Unauthorized"
                    403 "Forbidden"
                    404 "Not Found"
                    500 "Internal Server Error"
                    "Error")
           :message message}})
  ([message]
   (error 500 message)))

;; ============================================
;; Legacy Aliases (for backward compatibility)
;; ============================================

(def response-ok ok)
(def response-created created)
(def response-accepted accepted)
(def response-bad-request bad-request)
(def response-unauthorized unauthorized)
(def response-forbidden forbidden)
(def response-not-found not-found)
(def response-error error)
