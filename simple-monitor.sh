#!/bin/bash
# simple-monitor.sh - Simple database monitor (no tmux required)

echo "🐾 Petoo Backend Monitor"
echo "========================"
echo ""
echo "Press Ctrl+C to exit"
echo ""

# Loop infinito mostrando status
while true; do
  clear
  echo "🐾 Petoo Backend Monitor - $(date '+%H:%M:%S')"
  echo "=========================================="
  echo ""
  
  # Test API
  echo "📡 API Status:"
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "  ✅ Backend API is running"
  else
    echo "  ❌ Backend API is not responding"
  fi
  echo ""
  
  # Test using clj
  echo "📊 Database Status:"
  cd backend
  clj -M -e "(require '[next.jdbc :as jdbc]) \
             (let [ds (jdbc/get-datasource {:dbtype \"postgresql\" \
                                             :host \"localhost\" \
                                             :port 5432 \
                                             :dbname \"petoo_db\" \
                                             :user \"petoo\" \
                                             :password \"petoo_password\"})] \
               (println \"  Core Appointments:\") \
               (doseq [row (jdbc/execute! ds [\"SELECT status, COUNT(*) as total FROM core.appointments GROUP BY status\"])] \
                 (println (str \"    \" (:appointments/status row) \": \" (:appointments/total row)))) \
               (println \"\") \
               (println \"  Recent Transactions:\") \
               (doseq [row (take 3 (jdbc/execute! ds [\"SELECT id, status FROM financial.transactions ORDER BY created_at DESC LIMIT 3\"]))] \
                 (println (str \"    \" (:transactions/id row) \" - \" (:transactions/status row)))) \
               (println \"\") \
               (println \"  Read Model (last 3):\") \
               (doseq [row (take 3 (jdbc/execute! ds [\"SELECT id, status FROM read_model.appointments_view ORDER BY updated_at DESC LIMIT 3\"]))] \
                 (println (str \"    \" (:appointments_view/id row) \" - \" (:appointments_view/status row)))))" 2>/dev/null
  cd ..
  echo ""
  echo "🔄 Refreshing in 3 seconds..."
  
  sleep 3
done
