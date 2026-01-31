#!/bin/bash
# run-diagnostics.sh - Multi-pane monitor for Petoo Workers

SESSION="petoo-diagnostics"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ Error: 'tmux' is not installed. Please install it (sudo apt install tmux)."
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t $SESSION 2>/dev/null

echo "🚀 Starting multi-terminal monitor..."
echo ""
echo "📊 This will show real-time database queries"
echo "🔄 Updates every 2 seconds"
echo ""
echo "Keys:"
echo "  - Ctrl+b, then Arrows → Switch between panes"
echo "  - Ctrl+b, then d → Detach (keep running in background)"
echo "  - Ctrl+c on this terminal → Exit monitor"
echo ""
sleep 2

# Create a new session with diagnostics using Clojure
# Pane 1: Core appointments status
tmux new-session -d -s $SESSION -n "Diagnostics" \
  "watch -n 2 'cd backend && clj -M -e \"(require (quote [pet-app.infra.db :as db]) (quote [next.jdbc :as jdbc])) (let [ds (jdbc/get-datasource {:dbtype \\\"postgresql\\\" :host \\\"localhost\\\" :port 5432 :dbname \\\"petoo_db\\\" :user \\\"petoo\\\" :password \\\"petoo_password\\\"})] (println \\\"=== CORE APPOINTMENTS ===\") (clojure.pprint/pprint (db/execute! ds {:select [[:status :status] [[:%count.* :total]]] :from [:core.appointments] :group-by [:status]})))\" 2>/dev/null || echo \"DB query failed\"'"

# Pane 2: Recent transactions
tmux split-window -h -t $SESSION:0 \
  "watch -n 2 'cd backend && clj -M -e \"(require (quote [pet-app.infra.db :as db]) (quote [next.jdbc :as jdbc])) (let [ds (jdbc/get-datasource {:dbtype \\\"postgresql\\\" :host \\\"localhost\\\" :port 5432 :dbname \\\"petoo_db\\\" :user \\\"petoo\\\" :password \\\"petoo_password\\\"})] (println \\\"=== RECENT TRANSACTIONS ===\") (clojure.pprint/pprint (take 5 (db/execute! ds {:select [:id :status :amount-cents :created-at] :from [:financial.transactions] :order-by [[:created-at :desc]]}))))\" 2>/dev/null || echo \"DB query failed\"'"

# Pane 3: Read model updates
tmux split-window -v -t $SESSION:0.1 \
  "watch -n 2 'cd backend && clj -M -e \"(require (quote [pet-app.infra.db :as db]) (quote [next.jdbc :as jdbc])) (let [ds (jdbc/get-datasource {:dbtype \\\"postgresql\\\" :host \\\"localhost\\\" :port 5432 :dbname \\\"petoo_db\\\" :user \\\"petoo\\\" :password \\\"petoo_password\\\"})] (println \\\"=== READ MODEL UPDATES ===\") (clojure.pprint/pprint (take 5 (db/execute! ds {:select [:id :status :updated-at] :from [:read-model.appointments-view] :order-by [[:updated-at :desc]]}))))\" 2>/dev/null || echo \"DB query failed\"'"

# Pane 4: System status
tmux split-window -v -t $SESSION:0.0 \
  "watch -n 2 'echo \"=== SYSTEM STATUS ===\"; echo \"\"; echo \"Backend API:\"; curl -s http://localhost:3000/health 2>/dev/null || echo \"  ❌ Not responding\"; echo \"\"; echo \"Database:\"; pg_isready -h localhost -p 5432 -U petoo 2>/dev/null || echo \"  ❌ Not connected\"; echo \"\"; echo \"Kafka:\"; nc -zv localhost 9092 2>&1 | grep -q succeeded && echo \"  ✅ Connected\" || echo \"  ❌ Not connected\"'"

# Arrange layout
tmux select-layout -t $SESSION:0 tiled

# Attach to session
tmux attach-session -t $SESSION
