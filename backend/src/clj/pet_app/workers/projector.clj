(ns pet-app.workers.projector
  "Projector Worker - Atualiza Read Models.
   
   Consome: TODOS os eventos
   Produz: Nada (apenas atualiza DB)
   
   Lógica:
   1. Escuta todos os eventos do sistema
   2. Atualiza tabelas desnormalizadas no read_model schema
   3. Mantém views otimizadas para consultas rápidas"
  (:require [pet-app.workers.base :as base]
            [pet-app.infra.db :as db]
            [clojure.tools.logging :as log]
            [clojure.data.json :as json])
  (:import [java.util UUID]))


(defn fetch-appointment-data
  "Fetch all related data for an appointment."
  [ds appointment-id]
  (db/execute-one! ds
                   {:select [[:a.id :appointment-id]
                             [:a.tenant-id :tenant-id]
                             [:a.start-time :start-time]
                             [:a.end-time :end-time]
                             [:a.status :status]
                             [:a.notes :appointment-notes]
                             [:a.transaction-id :transaction-id]
                             [:t.name :tenant-name]
                             [:t.slug :tenant-slug]
                             [:t.theme-config :tenant-theme]
                             [:u.id :user-id]
                             [:u.name :user-name]
                             [:u.email :user-email]
                             [:u.phone :user-phone]
                             [:u.avatar-url :user-avatar-url]
                             [:p.id :pet-id]
                             [:p.name :pet-name]
                             [:p.species :pet-species]
                             [:p.breed :pet-breed]
                             [:p.photo-url :pet-photo-url]
                             [:p.notes :pet-notes]
                             [:p.medical-notes :pet-medical-notes]
                             [:pr.id :professional-id]
                             [:pr.name :professional-name]
                             [:s.id :service-id]
                             [:s.name :service-name]
                             [:s.price-cents :service-price-cents]
                             [:s.duration-minutes :service-duration-minutes]]
                    :from [[:core.appointments :a]]
                    :left-join [[:core.tenants :t] [:= :a.tenant-id :t.id]
                                [:core.users :u] [:= :a.user-id :u.id]
                                [:core.pets :p] [:= :a.pet-id :p.id]
                                [:core.professionals :pr] [:= :a.professional-id :pr.id]
                                [:core.services :s] [:= :a.service-id :s.id]]
                    :where [:= :a.id [:cast appointment-id :uuid]]}))

(defn build-appointment-json
  "Build JSONB structure for appointments_view."
  [data tx-info]
  {:appointment {:id (str (:appointment-id data))
                 :startTime (str (:start-time data))
                 :endTime (str (:end-time data))
                 :status (:status data)
                 :notes (:appointment-notes data)}
   :tenant {:id (str (:tenant-id data))
            :name (:tenant-name data)
            :slug (:tenant-slug data)
            :logo (get-in (:tenant-theme data) [:logo])}
   :user {:id (str (:user-id data))
          :name (:user-name data)
          :email (:user-email data)
          :phone (:user-phone data)
          :avatarUrl (:user-avatar-url data)}
   :pet {:id (str (:pet-id data))
         :name (:pet-name data)
         :species (:pet-species data)
         :breed (:pet-breed data)
         :photoUrl (:pet-photo-url data)
         :notes (:pet-notes data)
         :medicalNotes (:pet-medical-notes data)}
   :professional {:id (str (:professional-id data))
                  :name (:professional-name data)}
   :service {:id (str (:service-id data))
             :name (:service-name data)
             :priceCents (:service-price-cents data)
             :durationMinutes (:service-duration-minutes data)}
   :payment (when tx-info
              {:transactionId (str (:transaction-id tx-info))
               :status (:status tx-info)
               :amountCents (:amount-cents tx-info)})})

(defn upsert-appointment-view!
  "Insert or update appointment in read_model.appointments_view."
  [ds appointment-id]
  (let [data (fetch-appointment-data ds appointment-id)]
    (when data
      (let [tx-info (when (:transaction-id data)
                      (db/execute-one! ds
                                       {:select [:id :status :amount-cents]
                                        :from [:financial.transactions]
                                        :where [:= :id (:transaction-id data)]}))
            json-data (build-appointment-json data tx-info)]

        ;; Upsert into read model
        (log/infof "[DB: read_model.appointments_view] Upserting appointment: %s" appointment-id)
        (db/execute-one! ds
                         {:insert-into :read-model.appointments-view
                          :values [{:id [:cast appointment-id :uuid]
                                    :tenant-id [:cast (str (:tenant-id data)) :uuid]
                                    :data [:cast (json/write-str json-data) :jsonb]
                                    :status (:status data)
                                    :start-time (:start-time data)
                                    :end-time (:end-time data)
                                    :user-id [:cast (str (:user-id data)) :uuid]
                                    :pet-id [:cast (str (:pet-id data)) :uuid]
                                    :professional-id [:cast (str (:professional-id data)) :uuid]
                                    :service-id [:cast (str (:service-id data)) :uuid]
                                    :updated-at [:now]}]
                          :on-conflict [:id]
                          :do-update-set [:data :status :updated-at :version]
                          :returning [:id]})

        (log/debug "Updated appointments_view for:" appointment-id)))))


(defn update-schedule-slot!
  "Update or create a schedule slot in read_model."
  [ds {:keys [tenant-id professional-id slot-date slot-time duration-minutes
              is-available appointment-id]}]
  (db/execute-one! ds
                   {:insert-into :read-model.schedule-slots-view
                    :values [{:tenant-id [:cast tenant-id :uuid]
                              :professional-id [:cast professional-id :uuid]
                              :slot-date slot-date
                              :slot-time slot-time
                              :duration-minutes duration-minutes
                              :is-available is-available
                              :appointment-id (when appointment-id [:cast appointment-id :uuid])
                              :updated-at [:now]}]
                    :on-conflict [:tenant-id :professional-id :slot-date :slot-time]
                    :do-update-set [:is-available :appointment-id :updated-at]}))


(defn handle-appointment-created
  "Project appointment.created to read models."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id]} payload]
    (log/info "Projecting appointment.created:" appointment-id)
    (upsert-appointment-view! ds appointment-id)))

(defn handle-slot-reserved
  "Project slot.reserved - mark slot as unavailable."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id tenant-id professional-id start-time]} payload]
    (log/info "Projecting slot.reserved:" appointment-id)

    ;; Update appointment view with CONFIRMED status
    (upsert-appointment-view! ds appointment-id)

    ;; Mark slot as unavailable
    (try
      (let [start-instant (java.time.Instant/parse start-time)]
        (update-schedule-slot! ds
                               {:tenant-id tenant-id
                                :professional-id professional-id
                                :slot-date (str (.toLocalDate (.atZone start-instant (java.time.ZoneId/of "America/Sao_Paulo"))))
                                :slot-time (str (.toLocalTime (.atZone start-instant (java.time.ZoneId/of "America/Sao_Paulo"))))
                                :duration-minutes 30
                                :is-available false
                                :appointment-id appointment-id}))
      (catch Exception e
        (log/warn "Could not update schedule slot:" (.getMessage e))))))

(defn handle-slot-conflict
  "Project slot.conflict - update appointment status."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id]} payload]
    (log/info "Projecting slot.conflict:" appointment-id)
    (upsert-appointment-view! ds appointment-id)))

(defn handle-payment-success
  "Project payment.success - update appointment with payment info."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id]} payload]
    (log/info "Projecting payment.success:" appointment-id)
    (upsert-appointment-view! ds appointment-id)))

(defn handle-payment-failed
  "Project payment.failed - update appointment status."
  [{:keys [deps value]}]
  (let [{:keys [ds]} deps
        payload (:payload value)
        {:keys [appointment-id]} payload]
    (log/info "Projecting payment.failed:" appointment-id)
    (upsert-appointment-view! ds appointment-id)))


(defn handle-event
  "Route event to appropriate projector."
  [{:keys [value] :as event}]
  (let [event-type (:event-type value)
        payload (:payload value)
        appointment-id (or (:appointment-id payload) (:id payload))]
    (log/infof "[IN: %s] Projecting data for appointment: %s" event-type appointment-id)
    (case event-type
      "appointment.created" (handle-appointment-created event)
      "slot.reserved" (handle-slot-reserved event)
      "slot.conflict" (handle-slot-conflict event)
      "payment.success" (handle-payment-success event)
      "payment.failed" (handle-payment-failed event)
      (log/warnf "[PROJECTOR] Unknown event type: %s" event-type))))

;; ============================================
;; Worker Startup
;; ============================================

(defn start
  "Start the projector worker."
  [kafka-config topics ds]
  (let [deps {:ds ds}
        subscribe-topics [(:appointment-created topics)
                          (:slot-reserved topics)
                          (:slot-conflict topics)
                          (:payment-success topics)
                          (:payment-failed topics)]]
    (base/run-worker "projector"
                     kafka-config
                     subscribe-topics
                     handle-event
                     deps)))

(defn stop
  "Stop the projector worker."
  [worker]
  (base/stop-worker worker))
