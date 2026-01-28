(ns pet-app.domain.schemas
  "Malli schemas for data validation.
   
   Defines schemas for all domain entities and API requests/responses."
  (:require [malli.core :as m]
            [malli.util :as mu]
            [malli.error :as me]
            [malli.transform :as mt]))

;; ============================================
;; Common Types
;; ============================================

(def non-empty-string
  [:string {:min 1, :max 255}])

(def uuid-string
  [:re #"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"])

(def email
  [:re #"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"])

(def phone
  [:re #"^\+?[0-9]{10,15}$"])

(def positive-int
  [:int {:min 1}])

(def non-negative-int
  [:int {:min 0}])

(def timestamp
  [:or :string inst?])

;; ============================================
;; Enums
;; ============================================

(def UserRole
  [:enum "CUSTOMER" "ADMIN" "STAFF"])

(def PetSize
  [:enum "SMALL" "MEDIUM" "LARGE" "EXTRA_LARGE"])

(def PetSpecies
  [:enum "DOG" "CAT" "BIRD" "RABBIT" "OTHER"])

(def AppointmentStatus
  [:enum "PENDING" "CONFIRMED" "CANCELLED" "COMPLETED" "NO_SHOW"])

(def TransactionStatus
  [:enum "CREATED" "PENDING" "PROCESSING" "PAID" "FAILED" "REFUNDED" "CANCELLED"])

(def PaymentMethod
  [:enum "CREDIT_CARD" "DEBIT_CARD" "PIX" "BOLETO"])

;; ============================================
;; Entity Schemas
;; ============================================

(def Tenant
  [:map
   [:id {:optional true} uuid-string]
   [:name non-empty-string]
   [:slug [:re #"^[a-z0-9-]+$"]]
   [:theme-config {:optional true} [:map-of :keyword :any]]
   [:commission-rate {:optional true} [:double {:min 0 :max 1}]]
   [:contact-email {:optional true} email]
   [:contact-phone {:optional true} phone]
   [:status {:optional true} [:enum "ACTIVE" "INACTIVE"]]])

(def User
  [:map
   [:id {:optional true} uuid-string]
   [:tenant-id uuid-string]
   [:email email]
   [:password {:optional true} [:string {:min 8}]]
   [:name non-empty-string]
   [:phone {:optional true} phone]
   [:role {:optional true} UserRole]
   [:status {:optional true} [:enum "ACTIVE" "INACTIVE"]]])

(def Pet
  [:map
   [:id {:optional true} uuid-string]
   [:tenant-id uuid-string]
   [:user-id uuid-string]
   [:name non-empty-string]
   [:species {:optional true} PetSpecies]
   [:breed {:optional true} [:string {:max 100}]]
   [:size {:optional true} PetSize]
   [:birth-date {:optional true} :string]
   [:weight-kg {:optional true} [:double {:min 0 :max 200}]]
   [:notes {:optional true} :string]])

(def Professional
  [:map
   [:id {:optional true} uuid-string]
   [:tenant-id uuid-string]
   [:name non-empty-string]
   [:specialty {:optional true} non-empty-string]
   [:availability {:optional true} [:map-of :keyword :any]]
   [:active {:optional true} :boolean]])

(def Service
  [:map
   [:id {:optional true} uuid-string]
   [:tenant-id uuid-string]
   [:name non-empty-string]
   [:description {:optional true} :string]
   [:category {:optional true} non-empty-string]
   [:price-cents positive-int]
   [:duration-minutes positive-int]
   [:active {:optional true} :boolean]])

;; ============================================
;; Command Schemas (API Requests)
;; ============================================

(def CreateAppointment
  "Schema for POST /api/v1/appointments"
  [:map
   [:tenant-id uuid-string]
   [:user-id uuid-string]
   [:pet-id uuid-string]
   [:professional-id uuid-string]
   [:service-id uuid-string]
   [:start-time timestamp]
   [:notes {:optional true} :string]])

(def CreateUser
  "Schema for POST /api/v1/users"
  [:map
   [:tenant-id uuid-string]
   [:email email]
   [:password [:string {:min 8}]]
   [:name non-empty-string]
   [:phone {:optional true} phone]
   [:role {:optional true} UserRole]])

(def CreatePet
  "Schema for POST /api/v1/pets"
  [:map
   [:tenant-id uuid-string]
   [:user-id uuid-string]
   [:name non-empty-string]
   [:species {:optional true} PetSpecies]
   [:breed {:optional true} [:string {:max 100}]]
   [:size {:optional true} PetSize]
   [:birth-date {:optional true} :string]
   [:weight-kg {:optional true} [:double {:min 0 :max 200}]]
   [:notes {:optional true} :string]])

;; ============================================
;; Event Schemas (Kafka)
;; ============================================

(def AppointmentCreatedEvent
  [:map
   [:event-type [:= "appointment.created"]]
   [:id uuid-string]
   [:timestamp pos-int?]
   [:payload
    [:map
     [:appointment-id uuid-string]
     [:tenant-id uuid-string]
     [:user-id uuid-string]
     [:pet-id uuid-string]
     [:professional-id uuid-string]
     [:service-id uuid-string]
     [:start-time timestamp]
     [:end-time timestamp]]]])

(def SlotReservedEvent
  [:map
   [:event-type [:= "slot.reserved"]]
   [:id uuid-string]
   [:timestamp pos-int?]
   [:payload
    [:map
     [:appointment-id uuid-string]
     [:professional-id uuid-string]
     [:start-time timestamp]
     [:end-time timestamp]]]])

(def PaymentSuccessEvent
  [:map
   [:event-type [:= "payment.success"]]
   [:id uuid-string]
   [:timestamp pos-int?]
   [:payload
    [:map
     [:transaction-id uuid-string]
     [:appointment-id uuid-string]
     [:amount-cents positive-int]]]])

;; ============================================
;; Validation Helpers
;; ============================================

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
