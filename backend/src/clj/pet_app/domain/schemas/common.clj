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

;; ============================================
;; Validation Logic (CPF/CNPJ)
;; ============================================

(defn- parse-digits [s]
  (->> s (re-seq #"\d") (map #(Integer/parseInt %))))

(defn- calc-digit [digits weights]
  (let [sum (apply + (map * digits weights))
        rem (mod sum 11)]
    (if (< rem 2) 0 (- 11 rem))))

(defn validate-cpf [cpf]
  (let [digits (parse-digits cpf)]
    (if (not= 11 (count digits))
      false
      (let [base (take 9 digits)
            d1 (calc-digit base (range 10 1 -1))
            d2 (calc-digit (concat base [d1]) (range 11 1 -1))]
        (= (take-last 2 digits) [d1 d2])))))

(defn validate-cnpj [cnpj]
  (let [digits (parse-digits cnpj)]
    (if (not= 14 (count digits))
      false
      (let [base (take 12 digits)
            w1 [5 4 3 2 9 8 7 6 5 4 3 2]
            w2 [6 5 4 3 2 9 8 7 6 5 4 3 2]
            d1 (calc-digit base w1)
            d2 (calc-digit (concat base [d1]) w2)]
        (= (take-last 2 digits) [d1 d2])))))

(def cpf
  [:and
   [:string {:min 11 :max 14}] ;; Aceita com ou sem formatação
   [:fn {:error/message "Invalid CPF"} validate-cpf]])

(def cnpj
  [:and
   [:string {:min 14 :max 18}] ;; Aceita com ou sem formatação
   [:fn {:error/message "Invalid CNPJ"} validate-cnpj]])
