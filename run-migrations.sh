#!/bin/bash
# Execute database migrations and setup

echo "🚀 Iniciando setup do Banco de Dados..."

cd "$(dirname "$0")"

# 1. Criar Schemas e Extensões
echo "📂 Criando schemas e extensões..."
docker exec -i petoo-postgres psql -U petoo -d petoo_db < backend/resources/db/init/00_create_schemas.sql

# 2. Criar Tabelas (Core, Financial, Read Model)
echo "🏗️  Criando tabelas de todos os módulos..."
docker exec -i petoo-postgres psql -U petoo -d petoo_db < backend/resources/db/create-tables.sql

# 3. Executar migrations via Clojure (opcional, para registrar versão)
echo "🔍 Verificando migrations via Clojure..."
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

