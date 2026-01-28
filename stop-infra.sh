#!/bin/bash
# Stop Petoo Infrastructure

echo "🛑 Stopping Petoo Infrastructure..."

cd "$(dirname "$0")"

docker-compose down

echo "✅ Infrastructure stopped!"
