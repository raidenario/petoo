#!/bin/bash
# ============================================
# Petoo Backend - Entrypoint Script
# Handles startup: wait for deps, migrate, run
# ============================================

set -e

echo "╔═══════════════════════════════════════╗"
echo "║   Petoo Backend - Container Start     ║"
echo "╚═══════════════════════════════════════╝"

# ============================================
# Wait for PostgreSQL
# ============================================
echo "⏳ Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."

MAX_RETRIES=30
RETRY_COUNT=0

while ! nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ PostgreSQL not available after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - PostgreSQL not ready, waiting..."
  sleep 2
done

echo "✅ PostgreSQL is available!"

# ============================================
# Wait for Kafka
# ============================================
echo "⏳ Waiting for Kafka at kafka:29092..."

RETRY_COUNT=0
KAFKA_HOST="${KAFKA_BOOTSTRAP_SERVERS%%:*}"
KAFKA_PORT="${KAFKA_BOOTSTRAP_SERVERS##*:}"
KAFKA_HOST="${KAFKA_HOST:-kafka}"
KAFKA_PORT="${KAFKA_PORT:-29092}"

while ! nc -z "$KAFKA_HOST" "$KAFKA_PORT" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "⚠️  Kafka not available after $MAX_RETRIES attempts. Continuing anyway..."
    break
  fi
  echo "   Attempt $RETRY_COUNT/$MAX_RETRIES - Kafka not ready, waiting..."
  sleep 2
done

if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
  echo "✅ Kafka is available!"
fi

# ============================================
# Run Database Migrations
# ============================================
echo "🔄 Running database migrations..."

# Use java to run migrations directly
java -cp petoo-backend.jar clojure.main -m pet-app.infra.migrations migrate || {
  echo "⚠️  Migration failed or already up to date"
}

echo "✅ Migrations complete!"

# ============================================
# Start Application
# ============================================
echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Starting Petoo Backend API...       ║"
echo "╚═══════════════════════════════════════╝"
echo ""

exec java -jar petoo-backend.jar "$@"
