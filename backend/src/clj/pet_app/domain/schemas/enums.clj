(ns pet-app.domain.schemas.enums
  "Domain enums for the Petoo platform.")

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
