(ns pet-app.api.commands.helpers
  "Utility functions for Command API handlers.
   
   For response helpers (ok, bad-request, error, etc.), use pet-app.api.helpers."
  (:require [clojure.data.json :as json]
            [pet-app.api.helpers :as resp])
  (:import [java.util UUID]
           [java.time Instant Duration]))

;; ============================================
;; Utility Functions
;; ============================================

(defn ->json
  "Serialize data to JSON string."
  [data]
  (json/write-str data))

(defn uuid
  "Generate a random UUID string."
  []
  (str (UUID/randomUUID)))

(defn now
  "Current ISO-8601 timestamp string."
  []
  (str (Instant/now)))

(defn calculate-end-time
  "Calculate end time based on start time and duration."
  [start-time duration-minutes]
  (let [start (Instant/parse start-time)
        end (.plus start (Duration/ofMinutes duration-minutes))]
    (str end)))

;; ============================================
;; Response Aliases (backward compat, prefer pet-app.api.helpers)
;; ============================================

(def response-accepted resp/accepted)
(def response-bad-request resp/bad-request)
(def response-error resp/error)
