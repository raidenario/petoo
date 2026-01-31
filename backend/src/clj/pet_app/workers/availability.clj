(ns pet-app.workers.availability
  "Availability Worker - Verifica conflitos de horário.
   
   Consome: appointment.created
   Produz: slot.reserved | slot.conflict
   
   Lógica:
   1. Recebe evento de agendamento criado
   2. Verifica se o horário está livre para o profissional
   3. Se livre: reserva o slot e emite slot.reserved
   4. Se ocupado: emite slot.conflict"
  (:require [pet-app.workers.base :as base]
            [pet-app.infra.db :as db]
            [pet-app.infra.kafka :as kafka]
            [clojure.tools.logging :as log])
  (:import [java.util UUID]))

;; ============================================
;; Slot Conflict Detection
;; ============================================

(defn check-slot-conflict
  "Check if there's a conflicting appointment for the professional.
   
   Returns conflicting appointment or nil if slot is free."
  [ds professional-id start-time end-time exclude-appointment-id]
  (log/debug "Checking conflict for professional:" professional-id
             "start:" start-time "end:" end-time
             "excluding:" exclude-appointment-id)
  (let [result (db/execute-one! ds
                                {:select [:id :start-time :end-time :status]
                                 :from [:core.appointments]
                                 :where [:and
                                         [:= :professional-id [:cast professional-id :uuid]]
                                         [:in :status ["PENDING" "CONFIRMED"]]
                                         [:!= :id [:cast exclude-appointment-id :uuid]]
                                         ;; Overlap check: start1 < end2 AND end1 > start2
                                         ;; Cast string timestamps to timestamptz for proper comparison
                                         [:< :start-time [:cast end-time :timestamptz]]
                                         [:> :end-time [:cast start-time :timestamptz]]]
                                 :limit 1})]
    (log/debug "Conflict check result:" result)
    result))

(defn update-appointment-status!
  "Update appointment status in database."
  [ds appointment-id new-status]
  (db/execute-one! ds
                   {:update :core.appointments
                    :set {:status new-status
                          :updated-at [:now]}
                    :where [:= :id [:cast appointment-id :uuid]]
                    :returning [:*]}))

;; ============================================
;; Event Handler
;; ============================================

(defn handle-appointment-created
  "Handle appointment.created event.
   
   Verifies slot availability and emits appropriate event."
  [{:keys [deps value] :as event}]
  (let [{:keys [ds kafka-producer topics]} deps
        payload (:payload value)
        {:keys [appointment-id professional-id start-time end-time]} payload]

    (log/infof "[IN: appointment.created] Processing appointment-id: %s" appointment-id)

    ;; Check for conflicts
    (let [conflict (check-slot-conflict ds professional-id start-time end-time appointment-id)]

      (if conflict
        ;; Slot is occupied - emit conflict event
        (do
          (log/warnf "[AVAILABILITY] Slot conflict detected for appointment: %s (conflicts with: %s)"
                     appointment-id (:id conflict))

          ;; Update status to CANCELLED
          (log/infof "[DB: core.appointments] Setting status to CANCELLED for: %s" appointment-id)
          (update-appointment-status! ds appointment-id "CANCELLED")

          ;; Emit slot.conflict event
          (when kafka-producer
            (log/infof "[OUT: slot.conflict] Emitting conflict for: %s" appointment-id)
            (let [conflict-event (kafka/make-event
                                  :slot.conflict
                                  {:appointment-id appointment-id
                                   :professional-id professional-id
                                   :start-time start-time
                                   :end-time end-time
                                   :conflicting-appointment-id (str (:id conflict))
                                   :reason "Time slot already reserved"})]
              (kafka/send-event! kafka-producer
                                 (:slot-conflict topics)
                                 appointment-id
                                 conflict-event))))

        ;; Slot is free - reserve it
        (do
          (log/infof "[AVAILABILITY] Slot available, reserving for: %s" appointment-id)

          ;; Update status to CONFIRMED
          (log/infof "[DB: core.appointments] Setting status to CONFIRMED for: %s" appointment-id)
          (update-appointment-status! ds appointment-id "CONFIRMED")

          ;; Emit slot.reserved event
          (when kafka-producer
            (log/infof "[OUT: slot.reserved] Emitting reservation for: %s" appointment-id)
            (let [reserved-event (kafka/make-event
                                  :slot.reserved
                                  (merge payload
                                         {:status "CONFIRMED"}))]
              (kafka/send-event! kafka-producer
                                 (:slot-reserved topics)
                                 appointment-id
                                 reserved-event)))

          (log/infof "[AVAILABILITY] Slot reserved successfully for: %s" appointment-id))))))

;; ============================================
;; Event Router
;; ============================================

(defn handle-event
  "Route event to appropriate handler based on event-type."
  [{:keys [value] :as event}]
  (let [event-type (:event-type value)]
    (case event-type
      "appointment.created" (handle-appointment-created event)
      (log/warn "Unknown event type:" event-type))))

;; ============================================
;; Worker Startup
;; ============================================

(defn start
  "Start the availability worker.
   
   Args:
     kafka-config - Kafka configuration
     topics       - Topics configuration map
     ds           - Database datasource
     producer     - Kafka producer
   
   Returns:
     Worker control map"
  [kafka-config topics ds producer]
  (let [deps {:ds ds
              :kafka-producer producer
              :topics topics}
        subscribe-topics [(:appointment-created topics)]]
    (base/run-worker "availability"
                     kafka-config
                     subscribe-topics
                     handle-event
                     deps)))

(defn stop
  "Stop the availability worker."
  [worker]
  (base/stop-worker worker))
