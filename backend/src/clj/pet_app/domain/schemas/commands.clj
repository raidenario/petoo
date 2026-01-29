(ns pet-app.domain.schemas.commands
  "Schemas for API requests (commands)."
  (:require [pet-app.domain.schemas.common :as common]
            [pet-app.domain.schemas.enums :as enums]))

(def CreateAppointment
  "Schema for POST /api/v1/appointments"
  [:map
   [:tenant-id common/uuid-string]
   [:user-id common/uuid-string]
   [:pet-id common/uuid-string]
   [:professional-id common/uuid-string]
   [:service-id common/uuid-string]
   [:start-time common/timestamp]
   [:notes {:optional true} :string]])

(def CreateUser
  "Schema for POST /api/v1/users"
  [:map
   [:email common/email]
   [:password [:string {:min 8}]]
   [:name common/non-empty-string]
   [:phone {:optional true} common/phone]
   [:role {:optional true} enums/UserRole]])

(def CreatePet
  "Schema for POST /api/v1/pets"
  [:map
   [:user-id common/uuid-string]
   [:name common/non-empty-string]
   [:species {:optional true} enums/PetSpecies]
   [:breed {:optional true} [:string {:max 100}]]
   [:size {:optional true} enums/PetSize]
   [:birth-date {:optional true} :string]
   [:weight-kg {:optional true} [:double {:min 0 :max 200}]]
   [:notes {:optional true} entities/PetNotes]
   [:medical-notes {:optional true} entities/PetMedicalNotes]])
