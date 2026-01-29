(ns pet-app.domain.schemas.entities
  "Schemas for domain entities."
  (:require [pet-app.domain.schemas.common :as common]
            [pet-app.domain.schemas.enums :as enums]))

(def Tenant
  [:map
   [:id {:optional true} common/uuid-string]
   [:name common/non-empty-string]
   [:slug [:re #"^[a-z0-9-]+$"]]
   [:theme-config {:optional true} [:map-of :keyword :any]]
   [:commission-rate {:optional true} [:double {:min 0 :max 1}]]
   [:contact-email {:optional true} common/email]
   [:contact-phone {:optional true} common/phone]
   [:status {:optional true} [:enum "ACTIVE" "INACTIVE"]]])

(def User
  [:map
   [:id {:optional true} common/uuid-string]
   [:email common/email]
   [:password {:optional true} [:string {:min 8}]]
   [:name common/non-empty-string]
   [:phone {:optional true} common/phone]
   [:role {:optional true} enums/UserRole]
   [:avatar-url {:optional true} :string]
   [:status {:optional true} [:enum "ACTIVE" "INACTIVE"]]])

(def PetNotes
  [:map
   [:sedentary {:optional true} :boolean]
   [:walk-times {:optional true} :string]
   [:alimentation {:optional true} :string]
   [:castrated {:optional true} :boolean]
   [:objects {:optional true} :string]
   [:others {:optional true} :string]])

(def PetMedicalNotes
  [:map
   [:mastigation {:optional true} [:enum "slow" "medium" "fast" "idk"]]
   [:bowel-movement-frequency {:optional true} :string]
   [:vaccines {:optional true} :string]
   [:patology {:optional true} :boolean]
   [:patology-description {:optional true} :string]])

(def Pet
  [:map
   [:id {:optional true} common/uuid-string]
   [:user-id common/uuid-string]
   [:name common/non-empty-string]
   [:species {:optional true} enums/PetSpecies]
   [:breed {:optional true} [:string {:max 100}]]
   [:size {:optional true} enums/PetSize]
   [:birth-date {:optional true} :string]
   [:weight-kg {:optional true} [:double {:min 0 :max 200}]]
   [:photo-url {:optional true} :string]
   [:notes {:optional true} PetNotes]
   [:medical-notes {:optional true} PetMedicalNotes]])

(def Professional
  [:map
   [:id {:optional true} common/uuid-string]
   [:tenant-id common/uuid-string]
   [:user-id common/uuid-string]
   [:name common/non-empty-string]
   [:specialty {:optional true} common/non-empty-string]
   [:availability {:optional true} [:map-of :keyword :any]]
   [:active {:optional true} :boolean]])

(def Service
  [:map
   [:id {:optional true} common/uuid-string]
   [:tenant-id common/uuid-string]
   [:name common/non-empty-string]
   [:description {:optional true} :string]
   [:category {:optional true} common/non-empty-string]
   [:price-cents common/positive-int]
   [:duration-minutes common/positive-int]
   [:active {:optional true} :boolean]])
