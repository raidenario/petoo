#!/bin/bash
# kafka-monitor.sh - Monitor Kafka workers (requires tmux)

SESSION="petoo-kafka"

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ Error: 'tmux' is not installed. Please install it (sudo apt install tmux)."
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t $SESSION 2>/dev/null

# Make sure logs directory exists
mkdir -p backend/logs

# Touch log files to ensure they exist
touch backend/logs/worker-availability.log
touch backend/logs/worker-financial.log
touch backend/logs/worker-projector.log

echo "🚀 Starting Kafka Workers Monitor..."
echo ""
echo "📊 This will show:"
echo "  - Top-left: Availability Worker (consumes: appointment.created → produces: slot.reserved)"
echo "  - Top-right: Financial Worker (consumes: slot.reserved → produces: payment.success)"
echo "  - Bottom: Projector Worker (consumes: ALL → writes to read_model)"
echo ""
echo "🔍 Look for:"
echo "  - [IN: topic-name] = Consuming event"
echo "  - [OUT: topic-name] = Publishing event"
echo "  - [DB: table-name] = Database operation"
echo ""
echo "Keys:"
echo "  - Ctrl+b, then Arrows → Switch between panes"
echo "  - Ctrl+b, then d → Detach (keep running)"
echo "  - Ctrl+c → Exit"
echo ""
sleep 3

# Pane 1: Availability Worker
tmux new-session -d -s $SESSION -n "Kafka-Workers" \
  "tail -f backend/logs/worker-availability.log"

# Pane 2: Financial Worker
tmux split-window -h -t $SESSION:0 \
  "tail -f backend/logs/worker-financial.log"

# Pane 3: Projector Worker (bottom, full width)
tmux split-window -v -t $SESSION:0 \
  "tail -f backend/logs/worker-projector.log"

# Resize to give projector more space (it handles all events)
tmux resize-pane -t $SESSION:0.2 -y 15

# Attach to session
tmux attach-session -t $SESSION
