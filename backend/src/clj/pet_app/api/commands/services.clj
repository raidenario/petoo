(ns pet-app.api.commands.services
  "Service command handlers.
   
   CRUD operations for enterprise services:
   - create-service  (POST)
   - update-service  (PUT)
   - disable-service (DELETE / soft-delete)"
  (:require [pet-app.api.commands.helpers :as h]
            [pet-app.api.helpers :refer [ok created bad-request not-found error]]
            [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

(defn create-service
  "Create a new service for an enterprise."
  [{:keys [ds]} request]
  (let [body (:body-params request)
        enterprise-id (:enterprise-id body)]
    (cond
      (nil? enterprise-id)
      (bad-request "enterprise-id is required")

      (nil? (:name body))
      (bad-request "name is required")

      (nil? (:price-cents body))
      (bad-request "price-cents is required")

      :else
      (try
        (let [service-id (h/uuid)
              service {:id [:cast service-id :uuid]
                       :enterprise-id [:cast enterprise-id :uuid]
                       :name (:name body)
                       :description (:description body)
                       :category (:category body)
                       :price-cents (:price-cents body)
                       :duration-minutes (or (:duration-minutes body) 60)
                       :active true}
              _ (db/execute-one! ds
                                 {:insert-into :core.services
                                  :values [service]
                                  :returning [:*]})]
          (created {:id service-id
                    :name (:name body)
                    :price-cents (:price-cents body)
                    :duration-minutes (or (:duration-minutes body) 60)}))
        (catch Exception e
          (log/error e "Failed to create service")
          (error (.getMessage e)))))))

(defn update-service
  "Update an existing service.
   
   Only MASTER/ADMIN of the enterprise can update.
   Supports partial updates (only fields provided will be changed)."
  [{:keys [ds]} request]
  (let [service-id (get-in request [:path-params :id])
        body (:body-params request)
        enterprise-id (get-in request [:user :enterprise-id])]
    (cond
      (nil? service-id)
      (bad-request "Service ID is required")

      (nil? enterprise-id)
      (bad-request "Enterprise context required")

      :else
      (try
        ;; Verify service belongs to this enterprise
        (let [existing (db/execute-one! ds
                                        {:select [:id :enterprise-id]
                                         :from [:core.services]
                                         :where [:and
                                                 [:= :id [:cast service-id :uuid]]
                                                 [:= :enterprise-id [:cast enterprise-id :uuid]]]})]
          (if-not existing
            (not-found "Service not found or does not belong to this enterprise")
            (let [update-data (cond-> {}
                                (:name body) (assoc :name (:name body))
                                (:description body) (assoc :description (:description body))
                                (:category body) (assoc :category (:category body))
                                (some? (:price-cents body)) (assoc :price-cents (:price-cents body))
                                (some? (:duration-minutes body)) (assoc :duration-minutes (:duration-minutes body)))]
              (if (empty? update-data)
                (bad-request "No fields provided to update")
                (let [updated (first (db/update! ds :core.services
                                                 update-data
                                                 [:= :id [:cast service-id :uuid]]))]
                  (ok {:id (str (:id updated))
                       :name (:name updated)
                       :description (:description updated)
                       :category (:category updated)
                       :price-cents (:price-cents updated)
                       :duration-minutes (:duration-minutes updated)
                       :active (:active updated)}))))))
        (catch Exception e
          (log/error e "Failed to update service" service-id)
          (error (.getMessage e)))))))

(defn disable-service
  "Soft-delete a service (set active = false).
   
   Services are not physically deleted to preserve appointment history."
  [{:keys [ds]} request]
  (let [service-id (get-in request [:path-params :id])
        enterprise-id (get-in request [:user :enterprise-id])]
    (cond
      (nil? service-id)
      (bad-request "Service ID is required")

      (nil? enterprise-id)
      (bad-request "Enterprise context required")

      :else
      (try
        (let [existing (db/execute-one! ds
                                        {:select [:id]
                                         :from [:core.services]
                                         :where [:and
                                                 [:= :id [:cast service-id :uuid]]
                                                 [:= :enterprise-id [:cast enterprise-id :uuid]]]})]
          (if-not existing
            (not-found "Service not found or does not belong to this enterprise")
            (do
              (db/update! ds :core.services
                          {:active false}
                          [:= :id [:cast service-id :uuid]])
              (ok {:id service-id
                   :message "Service disabled successfully"}))))
        (catch Exception e
          (log/error e "Failed to disable service" service-id)
          (error (.getMessage e)))))))
