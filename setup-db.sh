#!/bin/bash
# Setup database tables directly (bypassing Migratus issues)

echo "🗄️  Criando tabelas diretamente no PostgreSQL..."

# Create tables
echo "Executando create-tables.sql..."
docker exec -i petoo-postgres psql -U petoo -d petoo_db < backend/resources/db/create-tables.sql

# Run seed data
echo ""
echo "Executando seed data..."
docker exec -i petoo-postgres psql -U petoo -d petoo_db < backend/resources/db/seed.sql

echo ""
echo "✅ Tabelas criadas com sucesso!"
echo ""
echo "Verificando tabelas criadas:"
docker exec petoo-postgres psql -U petoo -d petoo_db -c "\dt core.*"

