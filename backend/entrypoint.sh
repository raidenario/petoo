#!/bin/bash
# ============================================
# Petoo Backend - Entrypoint Script
# Handles startup: wait for deps, migrate, run
# ============================================

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                 🐾 Petoo Backend - Container Start            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "Environment: ${ENV:-development}"
echo "Database:    $DB_HOST:$DB_PORT/$DB_NAME"
echo "Kafka:       $KAFKA_BOOTSTRAP_SERVERS"
echo ""

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
echo "⏳ Waiting for Kafka..."

RETRY_COUNT=0
# Parse Kafka host and port from bootstrap servers
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
echo ""
echo "🔄 Running database migrations..."

# Run migrations using the jar
java $JAVA_OPTS -cp petoo-backend.jar clojure.main -m pet-app.infra.migrations migrate 2>&1 || {
  echo "⚠️  Migration command exited (may already be up to date)"
}

echo "✅ Migration step complete!"

# ============================================
# Start Application
# ============================================
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            🚀 Starting Petoo Backend API                      ║"
echo "║                                                               ║"
echo "║   API:        http://localhost:${PORT:-3000}                        ║"
echo "║   Health:     http://localhost:${PORT:-3000}/health                 ║"
echo "║   Ping:       http://localhost:${PORT:-3000}/ping                   ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Start the application with JAVA_OPTS
exec java $JAVA_OPTS -jar petoo-backend.jar "$@"
