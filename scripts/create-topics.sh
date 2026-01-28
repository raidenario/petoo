#!/bin/bash
# Create Kafka topics for PetAgita

echo "Creating Kafka topics..."

KAFKA_CONTAINER="petoo-kafka"

# Topics list
TOPICS=(
    "appointment.created"
    "slot.reserved"
    "slot.conflict"
    "payment.requested"
    "payment.success"
    "payment.failed"
)

for TOPIC in "${TOPICS[@]}"; do
    echo "Creating topic: $TOPIC"
    docker exec $KAFKA_CONTAINER /bin/kafka-topics \
        --create \
        --if-not-exists \
        --bootstrap-server localhost:9092 \
        --topic $TOPIC \
        --partitions 3 \
        --replication-factor 1
done

echo ""
echo "Listing all topics:"
docker exec $KAFKA_CONTAINER /bin/kafka-topics \
    --list \
    --bootstrap-server localhost:9092

echo ""
echo "✅ Kafka topics created successfully!"
