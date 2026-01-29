(ns pet-app.domain.schemas.common
  "Common Malli types used across the domain.")

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
