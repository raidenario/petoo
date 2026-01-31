(ns pet-app.api.queries.enterprise-queries
  "Query helpers with automatic enterprise isolation.
   
   Provides utilities to ensure queries are always filtered by enterprise-id
   when the user is an Enterprise User."
  (:require [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]))

;; ============================================
;; Enterprise Filter Helper
;; ============================================

(defn with-enterprise-filter
  "Add enterprise_id filter to any HoneySQL query.
   
   Usage:
     (-> {:select :* :from :core.services}
         (with-enterprise-filter enterprise-id)
         (db/execute ds))
   
   Args:
     query         - HoneySQL query map
     enterprise-id - Enterprise UUID string (or nil to skip filter)
   
   Returns:
     Query with enterprise_id = ? added to WHERE clause"
  [query enterprise-id]
  (if enterprise-id
    (let [enterprise-filter [:= :enterprise-id [:cast enterprise-id :uuid]]]
      (update query :where
              (fn [existing-where]
                (if existing-where
                  [:and existing-where enterprise-filter]
                  enterprise-filter))))
    query))

;; ============================================
;; Common Enterprise Queries
;; ============================================

(defn list-enterprise-services
  "List services filtered by enterprise-id from request.
   
   Only returns services belonging to the user's enterprise."
  [{:keys [ds]} request]
  (let [enterprise-id (:enterprise-id request)]
    (if-not enterprise-id
      {:status 403
       :body {:error "Enterprise context required"}}

      (try
        (let [services (db/execute! ds
                                    (-> {:select :*
                                         :from :core.services
                                         :where [:= :active true]
                                         :order-by [[:name :asc]]}
                                        (with-enterprise-filter enterprise-id)))]
          {:status 200
           :body {:services services
                  :count (count services)}})
        (catch Exception e
          (log/error e "Failed to list enterprise services")
          {:status 500
           :body {:error "Failed to list services"}})))))

(defn list-enterprise-professionals
  "List professionals filtered by enterprise-id from request."
  [{:keys [ds]} request]
  (let [enterprise-id (:enterprise-id request)]
    (if-not enterprise-id
      {:status 403
       :body {:error "Enterprise context required"}}

      (try
        (let [professionals (db/execute! ds
                                         (-> {:select :*
                                              :from :core.professionals
                                              :where [:= :active true]
                                              :order-by [[:name :asc]]}
                                             (with-enterprise-filter enterprise-id)))]
          {:status 200
           :body {:professionals professionals
                  :count (count professionals)}})
        (catch Exception e
          (log/error e "Failed to list enterprise professionals")
          {:status 500
           :body {:error "Failed to list professionals"}})))))

(defn list-enterprise-appointments
  "List appointments filtered by enterprise-id from request."
  [{:keys [ds]} request]
  (let [enterprise-id (:enterprise-id request)
        {:keys [status from to]} (:query-params request)]
    (if-not enterprise-id
      {:status 403
       :body {:error "Enterprise context required"}}

      (try
        (let [base-query {:select [:a.*
                                   [:c.name :client-name]
                                   [:c.phone :client-phone]
                                   [:p.name :pet-name]
                                   [:s.name :service-name]
                                   [:pr.name :professional-name]]
                          :from [[:core.appointments :a]]
                          :left-join [[:core.clients :c] [:= :a.client-id :c.id]
                                      [:core.pets :p] [:= :a.pet-id :p.id]
                                      [:core.services :s] [:= :a.service-id :s.id]
                                      [:core.professionals :pr] [:= :a.professional-id :pr.id]]
                          :order-by [[:a.start-time :desc]]}

              filtered-query (cond-> (with-enterprise-filter base-query enterprise-id)
                               status (update :where #(if % [:and % [:= :a.status status]]
                                                          [:= :a.status status]))
                               from (update :where #(if % [:and % [:>= :a.start-time from]]
                                                        [:>= :a.start-time from]))
                               to (update :where #(if % [:and % [:<= :a.start-time to]]
                                                      [:<= :a.start-time to])))

              appointments (db/execute! ds filtered-query)]
          {:status 200
           :body {:appointments appointments
                  :count (count appointments)}})
        (catch Exception e
          (log/error e "Failed to list enterprise appointments")
          {:status 500
           :body {:error "Failed to list appointments"}})))))

(defn list-enterprise-users
  "List all users in the enterprise (for admin purposes)."
  [{:keys [ds]} request]
  (let [enterprise-id (:enterprise-id request)]
    (if-not enterprise-id
      {:status 403
       :body {:error "Enterprise context required"}}

      (try
        (let [users (db/execute! ds
                                 {:select [:id :email :name :phone :role :status
                                           :avatar-url :created-at :updated-at]
                                  :from :core.users
                                  :where [:= :enterprise-id [:cast enterprise-id :uuid]]
                                  :order-by [[:name :asc]]})]
          {:status 200
           :body {:users (mapv #(update % :id str) users)
                  :count (count users)}})
        (catch Exception e
          (log/error e "Failed to list enterprise users")
          {:status 500
           :body {:error "Failed to list users"}})))))
