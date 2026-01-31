# ============================================
# Petoo Backend - Dockerfile
# Multi-stage build for Clojure application
# ============================================

# ============================================
# Stage 1: Build
# ============================================
FROM clojure:temurin-17-tools-deps-1.11.1.1435-alpine AS builder

WORKDIR /app

# Copy dependency files first (better cache)
COPY deps.edn ./
COPY build.clj ./

# Download dependencies (this layer is cached until deps.edn changes)
RUN clojure -P && clojure -P -T:build

# Copy source code
COPY src/ src/
COPY resources/ resources/

# Build uberjar
RUN clojure -T:build uber

# Verify the jar was created
RUN ls -la target/ && test -f target/petoo-backend.jar

# ============================================
# Stage 2: Runtime
# ============================================
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app

# Install utilities for health checks and wait scripts
RUN apk add --no-cache bash curl netcat-openbsd

# Create non-root user for security
RUN addgroup -g 1001 petoo && \
    adduser -D -u 1001 -G petoo petoo

# Copy uberjar from builder
COPY --from=builder /app/target/petoo-backend.jar ./petoo-backend.jar

# Copy resources (migrations, config) - jar already contains them but useful for reference
COPY --from=builder /app/resources/ ./resources/

# Copy entrypoint script
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R petoo:petoo /app

# Switch to non-root user
USER petoo

# Environment variables (defaults, can be overridden in docker-compose)
ENV PORT=3000 \
    DB_HOST=postgres \
    DB_PORT=5432 \
    DB_NAME=petoo_db \
    DB_USER=petoo \
    DB_PASSWORD=petoo_secret \
    KAFKA_BOOTSTRAP_SERVERS=kafka:29092 \
    JWT_SECRET=petoo-super-secret-key-change-in-production \
    ENV=production \
    JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Entrypoint
ENTRYPOINT ["./entrypoint.sh"]
