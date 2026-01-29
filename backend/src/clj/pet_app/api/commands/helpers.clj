(ns pet-app.api.commands.helpers
  "Helper functions for Command API handlers."
  (:import [java.util UUID]
           [java.time Instant Duration]))

(defn uuid []
  (str (UUID/randomUUID)))

(defn now []
  (str (Instant/now)))

(defn calculate-end-time
  "Calculate end time based on start time and duration."
  [start-time duration-minutes]
  (let [start (Instant/parse start-time)
        end (.plus start (Duration/ofMinutes duration-minutes))]
    (str end)))

(defn response-accepted
  "Return 202 Accepted with resource id."
  [id & {:keys [message]}]
  {:status 202
   :body {:accepted true
          :id id
          :message (or message "Request accepted for processing")}})

(defn response-bad-request
  "Return 400 Bad Request with validation errors."
  [errors]
  {:status 400
   :body {:error "Validation failed"
          :details errors}})

(defn response-error
  "Return 500 Internal Server Error."
  [message]
  {:status 500
   :body {:error "Internal server error"
          :message message}})
