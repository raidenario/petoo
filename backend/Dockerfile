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

# Download dependencies
RUN clojure -P

# Copy source code
COPY src/ src/
COPY resources/ resources/
# COPY dev/ dev/

# Build uberjar
RUN clojure -T:build uber

# ============================================
# Stage 2: Runtime
# ============================================
FROM eclipse-temurin:17-jre-alpine AS runtime

WORKDIR /app

# Install utilities for health checks and wait scripts
RUN apk add --no-cache bash curl netcat-openbsd

# Copy uberjar from builder
COPY --from=builder /app/target/petoo-backend.jar ./petoo-backend.jar

# Copy resources (migrations, config)
COPY --from=builder /app/resources/ ./resources/

# Copy entrypoint script and convert line endings (CRLF -> LF)
COPY entrypoint.sh ./
RUN sed -i 's/\r$//' entrypoint.sh && chmod +x entrypoint.sh

# Create uploads directory
RUN mkdir -p /app/uploads

# Environment variables
ENV PORT=3000
ENV DB_HOST=postgres
ENV DB_PORT=5432
ENV DB_NAME=petoo_db
ENV DB_USER=petoo
ENV DB_PASSWORD=petoo_secret
ENV KAFKA_BOOTSTRAP_SERVERS=kafka:29092

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Entrypoint
ENTRYPOINT ["./entrypoint.sh"]
