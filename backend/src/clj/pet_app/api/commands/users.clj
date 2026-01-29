(ns pet-app.api.commands.users
  "User command handlers."
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.domain.schemas :as schemas]
            [pet-app.infra.db :as db]
            [pet-app.infra.auth :as auth]
            [clojure.tools.logging :as log]))

(defn create-user
  "Create a new user."
  [{:keys [ds]} request]
  (let [body (:body-params request)
        validation (schemas/validate schemas/CreateUser body)]
    (if-not (:valid? validation)
      (h/response-bad-request (:errors validation))
      (try
        (let [user-id (h/uuid)
              password-hash (auth/hash-password (:password body))
              user {:id [:cast user-id :uuid]
                    :email (:email body)
                    :password-hash password-hash
                    :name (:name body)
                    :phone (:phone body)
                    :role (or (:role body) "CUSTOMER")
                    :status "ACTIVE"}
              _ (db/execute-one! ds
                                 {:insert-into :core.users
                                  :values [user]
                                  :returning [:id :email :name :role]})]
          {:status 201
           :body {:id user-id
                  :email (:email body)
                  :name (:name body)
                  :role (or (:role body) "CUSTOMER")}})
        (catch Exception e
          (log/error e "Failed to create user")
          (if (re-find #"duplicate key" (.getMessage e))
            (h/response-bad-request {:email "Email already exists"})
            (h/response-error (.getMessage e))))))))
