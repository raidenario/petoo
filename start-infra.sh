#!/bin/bash
# Start Petoo Infrastructure

echo "🐾 Starting Petoo Infrastructure..."

cd "$(dirname "$0")"

docker-compose up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 5

docker-compose ps

echo ""
echo "✅ Infrastructure ready!"
echo ""
echo "Services:"
echo "  - PostgreSQL: localhost:5432"
echo "  - Kafka:      localhost:9092"
echo "  - Kafka UI:   http://localhost:8080"
echo ""
echo "Next: cd backend && clj -M:dev"
