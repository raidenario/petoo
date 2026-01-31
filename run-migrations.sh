#!/bin/bash
# Execute database migrations and setup

echo "🚀 Iniciando setup do Banco de Dados..."

cd "$(dirname "$0")"

# 1. Criar Schemas e Extensões
echo "📂 Criando schemas e extensões..."
docker exec -i petoo-postgres psql -U petoo -d petoo_db < backend/resources/db/init/00_create_schemas.sql

# 2. Executar migrations via Clojure (Migratus)
echo "🏗️  Executando migrations via Clojure (Migratus)..."
cd backend
clj -M:migrate migrate
cd ..

# 4. Executar seed data
echo "🌱 Populando dados iniciais (seed)..."
docker exec -i petoo-postgres psql -U petoo -d petoo_db < backend/resources/db/seed.sql

echo ""
echo "✅ Setup do banco de dados concluído com sucesso!"
echo ""
echo "Verificando tabelas criadas:"
docker exec petoo-postgres psql -U petoo -d petoo_db -c "\dt core.*"
docker exec petoo-postgres psql -U petoo -d petoo_db -c "\dt financial.*"
docker exec petoo-postgres psql -U petoo -d petoo_db -c "\dt read_model.*"

