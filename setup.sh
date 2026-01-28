#!/bin/bash
# Setup completo do PetAgita Backend

set -e  # Exit on error

echo "╔═══════════════════════════════════════╗"
echo "║   PetAgita - Setup Completo           ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# 1. Subir infraestrutura Docker
echo "📦 [1/4] Subindo infraestrutura Docker..."
docker-compose up -d

echo ""
echo "⏳ Aguardando serviços ficarem prontos..."
sleep 10

# Verificar se os containers estão rodando
echo ""
echo "🔍 Status dos containers:"
docker-compose ps

# 2. Criar tópicos Kafka
echo ""
echo "📨 [2/4] Criando tópicos Kafka..."
chmod +x scripts/create-topics.sh
./scripts/create-topics.sh

# 3. Rodar migrations
echo ""
echo "🗄️  [3/4] Executando migrations do banco de dados..."
cd backend
clj -M:migrate migrate

# 4. Verificar schemas criados
echo ""
echo "✅ Verificando schemas PostgreSQL:"
docker exec petoo-postgres psql -U petoo -d petoo_db -c "\dn"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Setup Concluído! ✅                  ║"
echo "╚═══════════════════════════════════════╝"
echo ""
echo "Para iniciar o backend:"
echo "  cd backend"
echo "  clj -M:dev"
echo ""
echo "Endpoints disponíveis:"
echo "  - Health: http://localhost:3000/health"
echo "  - Kafka UI: http://localhost:8080"
echo ""
