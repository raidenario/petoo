# 🐾 Petoo Backend

<p align="center">
  <img src="https://img.shields.io/badge/Clojure-5881D8?style=flat-square&logo=clojure&logoColor=white" alt="Clojure">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Apache_Kafka-231F20?style=flat-square&logo=apache-kafka&logoColor=white" alt="Kafka">
</p>

Backend da aplicação Petoo - API REST com arquitetura CQRS e Event Sourcing.

## 🚀 Quick Start com Docker

```bash
# Na raiz do projeto
docker-compose up --build
```

Isso irá:
- ✅ Iniciar PostgreSQL + Zookeeper + Kafka
- ✅ Buildar a aplicação Clojure
- ✅ Rodar migrations automáticas
- ✅ Iniciar o servidor na porta 3000

### Verificar se está funcionando

```bash
curl http://localhost:3000/health
# {"status":"ok","database":"ok","kafka":"ok"}
```

### Serviços

| Serviço | URL |
|---------|-----|
| **API** | http://localhost:3000 |
| **Kafka UI** | http://localhost:8080 |
| **PostgreSQL** | localhost:5432 |

---

## 📋 Autenticação

### Clientes (OTP via SMS)

```bash
# 1. Solicitar OTP
POST /api/v1/auth/otp/request
{"phone": "+5511999998888"}

# 2. Verificar OTP
POST /api/v1/auth/otp/verify
{"phone": "+5511999998888", "token": "123456"}

# 3. Selecionar perfil (se múltiplos)
POST /api/v1/auth/select-profile
{"phone": "+5511999998888", "profile-type": "CLIENT"}
```

### Empresas (Email + Senha)

```bash
# Login
POST /api/v1/auth/enterprise/login
{"email": "admin@empresa.com", "password": "senha123"}
```

---

## 🔧 Desenvolvimento Local

### Pré-requisitos
- Java 17+
- Clojure CLI
- PostgreSQL + Kafka rodando

### REPL

```bash
clojure -M:dev:nrepl
```

```clojure
(require '[user :refer [go halt restart]])
(go)       ; Inicia
(halt)     ; Para
(restart)  ; Reinicia
```

### Migrations

```bash
clojure -M:migrate migrate
```

---

## 🏗️ Build

```bash
# Criar uberjar
clojure -T:build uber

# Executar
java -jar target/petoo-backend.jar
```

---

## 🛡️ Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `PORT` | Porta do servidor | 3000 |
| `DB_HOST` | Host PostgreSQL | localhost |
| `DB_PORT` | Porta PostgreSQL | 5432 |
| `DB_NAME` | Nome do banco | petoo_db |
| `DB_USER` | Usuário | petoo |
| `DB_PASSWORD` | Senha | petoo_secret |
| `KAFKA_BOOTSTRAP_SERVERS` | Endereço Kafka | localhost:9092 |
| `JWT_SECRET` | Chave JWT | (definir em prod) |
| `ENV` | Ambiente | dev |

---

## 📁 Estrutura

```
src/clj/pet_app/
├── core.clj              # Entry point
├── system.clj            # Integrant system
├── api/
│   ├── routes.clj        # Definição de rotas
│   ├── middleware.clj    # Auth middleware
│   ├── auth/             # Autenticação
│   ├── commands/         # Write operations
│   └── queries/          # Read operations
├── domain/               # Schemas & business logic
├── infra/                # DB, Kafka, Auth
└── workers/              # Kafka consumers
```

---

## 🐛 Troubleshooting

```bash
# Ver logs
docker logs -f petoo-api

# Reconstruir
docker-compose down -v && docker-compose up --build

# Conectar no banco
docker exec -it petoo-postgres psql -U petoo -d petoo_db
```

---

Veja o [README principal](../README.md) para mais informações.
