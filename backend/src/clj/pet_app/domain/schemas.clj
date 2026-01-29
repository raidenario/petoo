(ns pet-app.domain.schemas
  "Aggregator namespace for all domain schemas."
  (:require [malli.core :as m]
            [malli.error :as me]
            [malli.transform :as mt]
            [pet-app.domain.schemas.common :as common]
            [pet-app.domain.schemas.enums :as enums]
            [pet-app.domain.schemas.entities :as entities]
            [pet-app.domain.schemas.commands :as commands]
            [pet-app.domain.schemas.events :as events]))

;; Re-export common types
(def non-empty-string common/non-empty-string)
(def uuid-string common/uuid-string)
(def email common/email)
(def phone common/phone)
(def positive-int common/positive-int)
(def non-negative-int common/non-negative-int)
(def timestamp common/timestamp)

;; Re-export enums
(def UserRole enums/UserRole)
(def PetSize enums/PetSize)
(def PetSpecies enums/PetSpecies)
(def AppointmentStatus enums/AppointmentStatus)
(def TransactionStatus enums/TransactionStatus)
(def PaymentMethod enums/PaymentMethod)

;; Re-export entities
(def Tenant entities/Tenant)
(def User entities/User)
(def Pet entities/Pet)
(def Professional entities/Professional)
(def Service entities/Service)

;; Re-export commands
(def CreateAppointment commands/CreateAppointment)
(def CreateUser commands/CreateUser)
(def CreatePet commands/CreatePet)

;; Re-export events
(def AppointmentCreatedEvent events/AppointmentCreatedEvent)
(def SlotReservedEvent events/SlotReservedEvent)
(def PaymentSuccessEvent events/PaymentSuccessEvent)

;; Validation Helpers
(defn validate
  "Validate data against a schema.
   Returns {:valid? true :data <data>} or {:valid? false :errors <errors>}"
  [schema data]
  (if (m/validate schema data)
    {:valid? true :data data}
    {:valid? false
     :errors (me/humanize (m/explain schema data))}))

(defn coerce
  "Coerce and validate data.
   Transforms string UUIDs, numbers, etc."
  [schema data]
  (let [decoded (m/decode schema data (mt/string-transformer))]
    (validate schema decoded)))

(defn valid?
  "Check if data is valid against schema."
  [schema data]
  (m/validate schema data))
