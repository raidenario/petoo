(ns pet-app.api.commands
  "Aggregator namespace for Command API handlers."
  (:require [pet-app.api.commands.appointments :as appointments]
            [pet-app.api.commands.users :as users]
            [pet-app.api.commands.pets :as pets]
            [pet-app.api.commands.services :as services]
            [pet-app.api.commands.professionals :as professionals]
            [pet-app.api.commands.enterprises :as enterprises]))

;; ============================================
;; Appointments
;; ============================================
(def create-appointment appointments/create-appointment)
(def enterprise-cancel-appointment appointments/enterprise-cancel-appointment)
(def enterprise-reschedule-appointment appointments/enterprise-reschedule-appointment)

;; ============================================
;; Users
;; ============================================
(def create-user users/create-user)

;; ============================================
;; Pets
;; ============================================
(def create-pet pets/create-pet)
(def update-pet-photo pets/update-pet-photo)

;; ============================================
;; Services
;; ============================================
(def create-service services/create-service)
(def update-service services/update-service)
(def disable-service services/disable-service)

;; ============================================
;; Professionals
;; ============================================
(def create-professional professionals/create-professional)
(def update-professional professionals/update-professional)
(def deactivate-professional professionals/deactivate-professional)
(def update-professional-avatar professionals/update-professional-avatar)

;; ============================================
;; Enterprises
;; ============================================
(def create-enterprise enterprises/create-enterprise)
(def update-enterprise-profile enterprises/update-enterprise-profile)
(def update-enterprise-logo enterprises/update-enterprise-logo)
