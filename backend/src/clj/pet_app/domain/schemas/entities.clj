(ns pet-app.domain.schemas.entities
  "Schemas for domain entities."
  (:require [pet-app.domain.schemas.common :as common]
            [pet-app.domain.schemas.enums :as enums]))

;; ============================================
;; Enterprise (antiga Tenant)
;; ============================================
(def Enterprise
  [:map
   [:id {:optional true} common/uuid-string]
   [:name common/non-empty-string]
   [:slug [:re #"^[a-z0-9-]+$"]]
   [:cnpj {:optional true} common/cnpj]
   [:service-type {:optional true} enums/ServiceType]
   [:description {:optional true} :string]
   [:availability {:optional true} [:map-of :keyword :any]]
   [:theme-config {:optional true} [:map-of :keyword :any]]
   [:commission-rate {:optional true} [:double {:min 0 :max 1}]]
   [:contact-email {:optional true} common/email]
   [:contact-phone {:optional true} common/phone]
   [:address {:optional true} :string]
   [:logo-url {:optional true} :string]
   [:latitude {:optional true} :double]
   [:longitude {:optional true} :double]
   [:registration-date {:optional true} common/timestamp]
   [:status {:optional true} [:enum "ACTIVE" "INACTIVE"]]])

;; Alias para backward compatibility
(def Tenant Enterprise)

;; ============================================
;; Client (usuário final - dono de pets)
;; Autenticação via Phone + OTP
;; ============================================
(def Client
  [:map
   [:id {:optional true} common/uuid-string]
   [:phone common/phone]
   [:name {:optional true} common/non-empty-string]
   [:email {:optional true} common/email]
   [:avatar-url {:optional true} :string]
   [:latitude {:optional true} :double]
   [:longitude {:optional true} :double]
   [:registration-date {:optional true} common/timestamp]
   [:status {:optional true} [:enum "ACTIVE" "INACTIVE"]]])

;; ============================================
;; OTP Token (One-Time Password)
;; ============================================
(def OTPToken
  [:map
   [:id {:optional true} common/uuid-string]
   [:phone common/phone]
   [:token [:string {:min 6 :max 6}]]
   [:expires-at inst?]
   [:attempts {:optional true} [:int {:min 0 :max 5}]]
   [:verified {:optional true} :boolean]])

;; ============================================
;; EnterpriseUser (funcionários da Enterprise)
;; Autenticação via Email + Senha
;; ============================================
(def EnterpriseUser
  [:map
   [:id {:optional true} common/uuid-string]
   [:enterprise-id {:optional true} common/uuid-string]
   [:email common/email]
   [:cpf {:optional true} common/cpf]
   [:password {:optional true} [:string {:min 8}]]
   [:name common/non-empty-string]
   [:job-title {:optional true} [:string {:max 100}]]
   [:phone {:optional true} common/phone]
   [:hiring-date {:optional true} common/timestamp]
   [:role {:optional true} enums/EnterpriseUserRole]
   [:employee-status {:optional true} enums/EmployeeStatus]
   [:avatar-url {:optional true} :string]
   [:status {:optional true} [:enum "ACTIVE" "INACTIVE"]]])

;; Alias para backward compatibility
(def User EnterpriseUser)

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
   [:client-id {:optional true} common/uuid-string]  ;; Owner (Client)
   [:user-id {:optional true} common/uuid-string]    ;; Legacy support
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
   [:enterprise-id common/uuid-string]  ;; Enterprise this professional belongs to
   [:user-id {:optional true} common/uuid-string]
   [:name common/non-empty-string]
   [:specialty {:optional true} common/non-empty-string]
   [:availability {:optional true} [:map-of :keyword :any]]
   [:active {:optional true} :boolean]])

(def Service
  [:map
   [:id {:optional true} common/uuid-string]
   [:enterprise-id common/uuid-string]  ;; Enterprise offering this service
   [:name common/non-empty-string]
   [:description {:optional true} :string]
   [:category {:optional true} common/non-empty-string]
   [:price-cents common/positive-int]
   [:duration-minutes common/positive-int]
   [:active {:optional true} :boolean]])
