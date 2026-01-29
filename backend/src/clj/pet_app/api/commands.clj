(ns pet-app.api.commands
  "Aggregator namespace for Command API handlers."
  (:require [pet-app.api.commands.appointments :as appointments]
            [pet-app.api.commands.users :as users]
            [pet-app.api.commands.pets :as pets]
            [pet-app.api.commands.services :as services]
            [pet-app.api.commands.professionals :as professionals]
            [pet-app.api.commands.tenants :as tenants]))

;; Re-export handlers
(def create-appointment appointments/create-appointment)
(def create-user users/create-user)
(def create-pet pets/create-pet)
(def update-pet-photo pets/update-pet-photo)
(def create-service services/create-service)
(def create-professional professionals/create-professional)
(def update-professional-avatar professionals/update-professional-avatar)
(def create-tenant tenants/create-tenant)
(def update-tenant-logo tenants/update-tenant-logo)
