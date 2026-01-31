(ns pet-app.domain.schemas.enums
  "Domain enums for the Petoo platform.")

;; ============================================
;; User Roles
;; ============================================

;; Roles para usuários Enterprise (funcionários da empresa)
(def EnterpriseUserRole
  [:enum "MASTER"    ;; Proprietário - controle total + promove outros a Admin
   "ADMIN"     ;; Administrador - controle operacional e configuração
   "EMPLOYEE"]) ;; Funcionário - acesso operacional limitado

;; Roles para Clients (clientes finais do app)
(def ClientRole
  [:enum "CLIENT"])  ;; Único role - acesso baseado em geolocalização

;; UserType para diferenciar tipo de autenticação no JWT
(def UserType
  [:enum "client" "enterprise"])

;; Mantém UserRole para backward compatibility
(def UserRole
  [:enum "CUSTOMER" "ADMIN" "STAFF" "MASTER" "EMPLOYEE" "CLIENT" "PLATFORM"])

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

(def EmployeeStatus
  [:enum "ACTIVE" "VACATION" "TERMINATED" "LEAVE"])

(def ServiceType
  [:enum "VET" "PETSHOP" "HOTEL" "TRAINING" "GROOMING" "OTHER"])
