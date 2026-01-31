# 🐾 Petoo Backend

Backend da aplicação Petoo - Sistema Multi-tenancy para Pet Shops.

## 🚀 Quick Start com Docker

### Pré-requisitos
- Docker e Docker Compose instalados
- (Opcional) Make instalado

### Rodar a Aplicação

**Um único comando para subir tudo:**

```bash
docker-compose up --build
```

Isso irá:
1. ✅ Iniciar o PostgreSQL
2. ✅ Iniciar o Zookeeper + Kafka
3. ✅ Buildar a aplicação Clojure
4. ✅ Rodar as migrations automáticas
5. ✅ Iniciar o servidor na porta 3000

### Verificar se está funcionando

```bash
# Health check
curl http://localhost:3000/health

# Ping
curl http://localhost:3000/ping
```

### Acessar os Serviços

| Serviço | URL |
|---------|-----|
| **API** | http://localhost:3000 |
| **Kafka UI** | http://localhost:8080 |
| **PostgreSQL** | localhost:5432 |

---

## 📋 Endpoints de Autenticação

### Clients (Donos de Pets) - OTP via SMS

```bash
# 1. Solicitar OTP (em dev, o token aparece no response)
curl -X POST http://localhost:3000/api/v1/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone": "+5511999998888"}'

# 2. Verificar OTP e obter JWT
curl -X POST http://localhost:3000/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone": "+5511999998888", "token": "123456"}'
```

### Enterprise Users - Email + Password

```bash
# Registrar nova Enterprise + Usuário Master
curl -X POST http://localhost:3000/api/v1/auth/enterprise/register \
  -H "Content-Type: application/json" \
  -d '{
    "enterprise": {
      "name": "Pet Shop ABC",
      "slug": "petshop-abc",
      "contact_email": "contato@petshop.com"
    },
    "user": {
      "email": "owner@petshop.com",
      "password": "minhasenha123",
      "name": "João Silva"
    }
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/enterprise/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@petshop.com", "password": "minhasenha123"}'
```

---

## 🔧 Desenvolvimento Local (sem Docker)

### Pré-requisitos
- Java 17+
- Clojure CLI (`brew install clojure/tools/clojure`)
- PostgreSQL rodando
- Kafka rodando

### Instalar dependências

```bash
cd backend
clojure -P  # Baixa todas as dependências
```

### Variáveis de ambiente (opcional)

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=petoo_db
export DB_USER=petoo
export DB_PASSWORD=petoo_secret
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export JWT_SECRET=minha-chave-secreta
```

### Rodar migrations

```bash
clojure -M:migrate migrate
```

### Iniciar o servidor

```bash
# Modo desenvolvimento
clojure -M:dev

# Ou usando o REPL
clojure -M:dev:nrepl
```

---

## 🏗️ Build para Produção

```bash
# Criar uberjar
clojure -T:build uber

# Rodar o jar
java -jar target/petoo-backend.jar
```

---

## 🛡️ Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `PORT` | Porta do servidor | 3000 |
| `DB_HOST` | Host do PostgreSQL | localhost |
| `DB_PORT` | Porta do PostgreSQL | 5432 |
| `DB_NAME` | Nome do banco | petoo_db |
| `DB_USER` | Usuário do banco | petoo |
| `DB_PASSWORD` | Senha do banco | petoo_secret |
| `KAFKA_BOOTSTRAP_SERVERS` | Endereço do Kafka | localhost:9092 |
| `JWT_SECRET` | Chave para assinar JWT | (deve ser definido em produção) |
| `ENV` | Ambiente (dev/production) | dev |

---

## 📁 Estrutura do Projeto

```
backend/
├── src/clj/pet_app/
│   ├── core.clj           # Entry point
│   ├── system.clj         # Integrant system
│   ├── api/
│   │   ├── routes.clj     # API routes
│   │   ├── middleware.clj # Auth middleware
│   │   ├── auth/
│   │   │   ├── otp_auth.clj        # OTP handlers
│   │   │   └── enterprise_auth.clj # Enterprise handlers
│   │   ├── commands/      # Write operations
│   │   └── queries/       # Read operations
│   ├── domain/schemas/    # Malli schemas
│   └── infra/
│       ├── db.clj         # Database connection
│       ├── kafka.clj      # Kafka producer
│       ├── auth.clj       # JWT & password
│       ├── otp.clj        # OTP service
│       └── migrations.clj # Migratus
├── resources/
│   ├── config.edn         # Application config
│   └── migrations/        # SQL migrations
├── deps.edn               # Dependencies
├── build.clj              # Build script
├── Dockerfile
└── entrypoint.sh
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs
docker-compose logs -f api

# Reconstruir do zero
docker-compose down -v
docker-compose up --build
```

### Erro de conexão com banco

```bash
# Verificar se PostgreSQL está rodando
docker-compose ps

# Conectar no banco
docker exec -it petoo-postgres psql -U petoo -d petoo_db
```

### Migrations não rodam

```bash
# Rodar manualmente dentro do container
docker exec -it petoo-api java -cp petoo-backend.jar clojure.main -m pet-app.infra.migrations migrate
```

---

## 📝 Licença

MIT
