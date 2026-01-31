(ns pet-app.api.queries
  "Aggregator namespace for Query API handlers."
  (:require [pet-app.api.queries.appointments :as appointments]
            [pet-app.api.queries.schedule :as schedule]
            [pet-app.api.queries.services :as services]
            [pet-app.api.queries.professionals :as professionals]
            [pet-app.api.queries.enterprises :as enterprises]))

;; Re-export handlers
(def list-appointments appointments/list-appointments)
(def get-appointment appointments/get-appointment)
(def get-professional-schedule schedule/get-professional-schedule)
(def list-services services/list-services)
(def list-professionals professionals/list-professionals)
(def get-enterprise-by-slug enterprises/get-enterprise-by-slug)
