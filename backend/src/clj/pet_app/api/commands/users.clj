(ns pet-app.api.commands.users
  "User command handlers."
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.domain.schemas :as schemas]
            [pet-app.infra.db :as db]
            [pet-app.infra.auth :as auth]
            [clojure.tools.logging :as log]))

(defn create-user
  "Create a new CUSTOMER user.
   
   This endpoint creates a customer (end user) account.
   Returns phone and credentials for login via POST /auth/login"
  [{:keys [ds]} request]
  (let [body (:body-params request)
        validation (schemas/validate schemas/CreateUser body)]
    (if-not (:valid? validation)
      (h/response-bad-request (:errors validation))
      (try
        (let [user-id (h/uuid)
              password (:password body)
              password-hash (auth/hash-password password)
              phone (:phone body)

              ;; Always force CUSTOMER role for this endpoint
              user {:id [:cast user-id :uuid]
                    :email (:email body)
                    :password-hash password-hash
                    :name (:name body)
                    :phone phone
                    :role "CUSTOMER"
                    :status "ACTIVE"}

              _ (db/execute-one! ds
                                 {:insert-into :core.users
                                  :values [user]
                                  :returning [:id :email :name :phone :role]})]

          {:status 201
           :body {:id user-id
                  :email (:email body)
                  :name (:name body)
                  :phone phone
                  :role "CUSTOMER"
                  :login_credentials {:phone phone
                                      :password password
                                      :message "Use these credentials at POST /api/v1/auth/login"}}})
        (catch Exception e
          (log/error e "Failed to create user")
          (if (re-find #"duplicate key" (.getMessage e))
            (h/response-bad-request {:email "Email already exists"})
            (h/response-error (.getMessage e))))))))

