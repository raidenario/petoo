(ns pet-app.api.auth.invite-auth
  (:require [pet-app.infra.db :as db]
            [pet-app.api.helpers :refer [ok bad-request not-found]]
            [clojure.string :as str]
            [clojure.tools.logging :as log]
            [crypto.random :refer [hex]]))

;; ============================================
;; Handlers
;; ============================================

(defn request-invite
  "Cria uma nova solicitação de convite para uma empresa."
  [{:keys [ds]} request]
  (let [params (:body-params request)
        phone (:phone params)
        email (:email params)]
    (if (and phone email)
      (try
        (db/execute-one! ds
          {:insert-into :core.invite_requests
           :values [{:phone phone
                     :email email
                     :status "PENDING"}]})
        (log/info "Nova solicitação de convite recebida - Telefone:" phone "Email:" email)
        (ok {:message "Solicitação de convite enviada com sucesso! Aguarde a aprovação do consultor."})
        (catch Exception e
          (log/error "Erro ao solicitar convite:" (.getMessage e))
          (bad-request {:error "Erro ao processar solicitação. Verifique se o telefone já foi solicitado."})))
      (bad-request {:error "Telefone e e-mail são obrigatórios."}))))

(defn list-pending-invites
  "Lista todas as solicitações de convite pendentes (Apenas Master)."
  [{:keys [ds]} request]
  (try
    (let [pending (db/execute! ds
                    {:select [:*]
                     :from [:core.invite_requests]
                     :where [:= :status "PENDING"]
                     :order-by [[:created_at :desc]]})]
      (ok {:invites pending}))
    (catch Exception e
      (log/error "Erro ao listar convites pendentes:" (.getMessage e))
      (bad-request {:error "Erro ao carregar solicitações."}))))

(defn approve-invite
  "Aprova uma solicitação de convite e gera um código."
  [{:keys [ds]} request]
  (let [id (get-in request [:path-params :id])
        user-id (or (get-in request [:identity :id])
                    (get-in request [:identity :user-id])) ; ID do MASTER logado
        invite-code (str "PETOO-" (hex 4))] ; Gera código tipo PETOO-a1b2c3d4
    (try
      (let [result (db/execute-one! ds
                     {:update :core.invite_requests
                      :set {:status "APPROVED"
                            :invite_code (str/upper-case invite-code)
                            :approved_by [:cast user-id :uuid]
                            :approved_at [:now]}
                      :where [:= :id [:cast id :uuid]]})]
        (if result
          (do
            (log/info "Solicitação de convite" id "aprovada pelo MASTER" user-id "- Código:" invite-code)
            (ok {:message "Convite aprovado com sucesso!"
                 :invite_code invite-code}))
          (not-found {:error "Solicitação não encontrada."})))
      (catch Exception e
        (log/error "Erro ao aprovar convite:" (.getMessage e))
        (bad-request {:error "Erro ao aprovar solicitação."})))))

(defn reject-invite
  "Rejeita uma solicitação de convite."
  [{:keys [ds]} request]
  (let [id (get-in request [:path-params :id])]
    (try
      (let [result (db/execute-one! ds
                     {:update :core.invite_requests
                      :set {:status "REJECTED"}
                      :where [:= :id [:cast id :uuid]]})]
        (if result
          (ok {:message "Solicitação rejeitada."})
          (not-found {:error "Solicitação não encontrada."})))
      (catch Exception e
        (log/error "Erro ao rejeitar convite:" (.getMessage e))
        (bad-request {:error "Erro ao rejeitar solicitação."})))))

(defn validate-invite-code
  "Valida se um código de convite é válido e está aprovado."
  [{:keys [ds]} request]
  (let [code (get-in request [:body-params :code])]
    (try
      (if (and code (not (str/blank? code)))
        (let [invite (db/execute-one! ds
                       {:select [:*]
                        :from [:core.invite_requests]
                        :where [:and 
                                [:= :invite_code (str/upper-case code)]
                                [:= :status "APPROVED"]]})]
          (if invite
            (ok {:valid true
                 :role "OWNER"
                 :email (:email invite)})
            (bad-request {:valid false :error "Código inválido ou não aprovado."})))
        (bad-request {:error "Código de convite é obrigatório."}))
      (catch Exception e
        (log/error "Erro ao validar código:" (.getMessage e))
        (bad-request {:error "Erro ao validar código."})))))
