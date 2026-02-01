(ns pet-app.api.auth.profile-selection
  "Profile selection after OTP verification for multi-profile users."
  (:require [pet-app.infra.db :as db]
            [pet-app.infra.auth :as auth]
            [clojure.tools.logging :as log]))

;; ============================================
;; Response Helpers
;; ============================================

(defn- ok [data]
  {:status 200 :body data})

(defn- bad-request [data]
  {:status 400 :body data})

(defn- not-found [data]
  {:status 404 :body data})

;; ============================================
;; POST /api/v1/auth/select-profile
;; ============================================

(defn select-profile
  "Seleciona um perfil apos verificacao OTP.
   
   Body:
     {:phone '+5511999998888'
      :profile-type 'CLIENT' | 'ENTERPRISE_ADMIN'
      :enterprise-id 'uuid' (opcional, necessario para ENTERPRISE_ADMIN)}
   
   Response:
     {:token 'jwt...'
      :profile {:type '...' :id '...' :name '...'}}"
  [{:keys [ds]} request]
  (let [{:keys [phone profile-type enterprise-id]} (:body-params request)]
    (cond
      (nil? phone)
      (bad-request {:error "Phone number is required"})

      (nil? profile-type)
      (bad-request {:error "Profile type is required"})

      (and (= profile-type "ENTERPRISE_ADMIN") (nil? enterprise-id))
      (bad-request {:error "Enterprise ID is required for ENTERPRISE_ADMIN profile"})

      :else
      (try
        (case profile-type
          "CLIENT"
          (let [client (db/execute-one! ds
                         {:select [:id :phone :name :email :avatar-url]
                          :from :core.clients
                          :where [:= :phone phone]})]
            (if client
              (let [token (auth/generate-client-token
                           (str (:id client))
                           phone)]
                (log/info "Client profile selected for phone:" phone)
                (ok {:token token
                     :profile {:type "CLIENT"
                               :id (str (:id client))
                               :name (:name client)
                               :email (:email client)
                               :avatar-url (:avatar-url client)}}))
              (not-found {:error "Client profile not found"})))

          "ENTERPRISE_ADMIN"
          (let [user (db/execute-one! ds
                       {:select [:u.id :u.name :u.email :u.enterprise-id
                                 [:e.name :enterprise-name]
                                 [:e.slug :enterprise-slug]]
                        :from [[:core.users :u]]
                        :join [[:core.enterprises :e] [:= :u.enterprise-id :e.id]]
                        :where [:and
                                [:= :u.phone phone]
                                [:= :u.enterprise-id [:cast enterprise-id :uuid]]
                                [:= :u.role "ENTERPRISE_ADMIN"]]})]
            (if user
              (let [token (auth/generate-enterprise-token
                           (str (:id user))
                           (:email user)
                           "ENTERPRISE_ADMIN"
                           (str (:enterprise-id user)))]
                (log/info "Enterprise admin profile selected for phone:" phone 
                          "enterprise:" (:enterprise-name user))
                (ok {:token token
                     :profile {:type "ENTERPRISE_ADMIN"
                               :id (str (:id user))
                               :enterprise-id (str (:enterprise-id user))
                               :enterprise-name (:enterprise-name user)
                               :enterprise-slug (:enterprise-slug user)
                               :name (:name user)
                               :email (:email user)}}))
              (not-found {:error "Enterprise admin profile not found"})))

          ;; Default case
          (bad-request {:error "Invalid profile type"}))

        (catch Exception e
          (log/error e "Failed to select profile for phone:" phone)
          {:status 500 :body {:error "Failed to select profile"}})))))

;; ============================================
;; POST /api/v1/auth/create-client
;; ============================================

(defn create-client-profile
  "Cria um novo perfil de cliente para um telefone.
   
   Body:
     {:phone '+5511999998888'
      :name 'Joao Silva' (opcional)
      :email 'joao@email.com' (opcional)}
   
   Response:
     {:token 'jwt...'
      :client {:id '...' :phone '...' :name '...'}}"
  [{:keys [ds]} request]
  (let [{:keys [phone name email]} (:body-params request)]
    (if (nil? phone)
      (bad-request {:error "Phone number is required"})

      (try
        (let [client-id (str (java.util.UUID/randomUUID))
              client (db/execute-one! ds
                       {:insert-into :core.clients
                        :values [{:id [:cast client-id :uuid]
                                  :phone phone
                                  :name name
                                  :email email
                                  :status "ACTIVE"}]
                        :returning [:id :phone :name :email :avatar-url]})
              token (auth/generate-client-token
                     (str (:id client))
                     phone)]

          (log/info "New client profile created for phone:" phone)
          (ok {:token token
               :client {:id (str (:id client))
                        :phone (:phone client)
                        :name (:name client)
                        :email (:email client)
                        :avatar-url (:avatar-url client)
                        :is-new-user true}}))

        (catch Exception e
          (log/error e "Failed to create client profile for phone:" phone)
          {:status 500 :body {:error "Failed to create client profile"}})))))
