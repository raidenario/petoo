(ns pet-app.domain.schemas.events
  "Schemas for Kafka events."
  (:require [pet-app.domain.schemas.common :as common]))

(def AppointmentCreatedEvent
  [:map
   [:event-type [:= "appointment.created"]]
   [:id common/uuid-string]
   [:timestamp pos-int?]
   [:payload
    [:map
     [:appointment-id common/uuid-string]
     [:tenant-id common/uuid-string]
     [:user-id common/uuid-string]
     [:pet-id common/uuid-string]
     [:professional-id common/uuid-string]
     [:service-id common/uuid-string]
     [:start-time common/timestamp]
     [:end-time common/timestamp]]]])

(def SlotReservedEvent
  [:map
   [:event-type [:= "slot.reserved"]]
   [:id common/uuid-string]
   [:timestamp pos-int?]
   [:payload
    [:map
     [:appointment-id common/uuid-string]
     [:professional-id common/uuid-string]
     [:start-time common/timestamp]
     [:end-time common/timestamp]]]])

(def PaymentSuccessEvent
  [:map
   [:event-type [:= "payment.success"]]
   [:id common/uuid-string]
   [:timestamp pos-int?]
   [:payload
    [:map
     [:transaction-id common/uuid-string]
     [:appointment-id common/uuid-string]
     [:amount-cents common/positive-int]]]])
