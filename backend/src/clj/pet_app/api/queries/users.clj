(ns pet-app.api.queries.users
  "User related queries."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn get-current-user
  "Get current authenticated user info (Client or Enterprise)."
  [{:keys [ds]} request]
  (let [user (:user request)]
    (if-not user
      {:status 401 :body {:error "Not authenticated"}}

      (case (:type user)
        "client"
        (let [client (db/execute-one! ds
                                      {:select [:id :name :email :phone :avatar-url :created-at]
                                       :from :core.clients
                                       :where [:= :id [:cast (:client-id user) :uuid]]})]
          {:status 200
           :body {:type "client"
                  :user (update client :id str)}})

        "enterprise"
        (let [ent-user (db/execute-one! ds
                                        {:select [:u.id :u.name :u.email :u.phone :u.role
                                                  [:e.id :enterprise-id] [:e.name :enterprise-name] [:e.slug :enterprise-slug]]
                                         :from [[:core.users :u]]
                                         :left-join [[:core.enterprises :e] [:= :u.enterprise-id :e.id]]
                                         :where [:= :u.id [:cast (:user-id user) :uuid]]})]
          {:status 200
           :body {:type "enterprise"
                  :user {:id (str (:id ent-user))
                         :name (:name ent-user)
                         :email (:email ent-user)
                         :phone (:phone ent-user)
                         :role (:role ent-user)
                         :enterprise {:id (str (:enterprise-id ent-user))
                                      :name (:enterprise-name ent-user)
                                      :slug (:enterprise-slug ent-user)}}}})

        ;; Default/Fallback
        {:status 200
         :body {:type "unknown"
                :user user}}))))
