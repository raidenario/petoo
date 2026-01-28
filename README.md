# Petoo - Petshop Super App

A white-label SaaS application for pet shops with CQRS architecture.

## Stack

- **Backend**: Clojure (Ring, Reitit, Integrant, next.jdbc)
- **Database**: PostgreSQL 15
- **Message Broker**: Apache Kafka
- **Frontend**: React Native (Expo) with TypeScript

## Quick Start 🚀

Para rodar o projeto completo (Banco, Kafka e API) com um único comando:

### 1. Pré-requisitos
- Docker & Docker Compose instalados.

### 2. Rodar Aplicação
```bash
# Sobe toda a infraestrutura e a API automaticamente
docker compose up -d --build
```

**O que acontece agora?**
- PostgreSQL iniciará e criará os schemas.
- Kafka iniciará e os tópicos serão criados.
- A API Clojure será compilada e as migrações de banco executadas.
- O servidor estará pronto em: http://localhost:3000

---

## 🛠 Para Desenvolvedores Frontend

Se você vai trabalhar apenas no frontend, você não precisa instalar Clojure ou Java. 
Basta dar o `docker compose up` acima e utilizar os seguintes recursos:

- **API Base URL**: `http://localhost:3000`
- **Documentação de Endpoints**: [docs/API.md](docs/API.md)
- **Modelos de Dados**: [docs/MODELS.md](docs/MODELS.md)
- **Kafka UI**: `http://localhost:8080` (Para ver mensagens e tópicos)

---

### Verificação de Saúde
```bash
# Verifique se tudo está ok
curl http://localhost:3000/health
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Mobile App    │────▶│  Command API    │──┐
│  (React Native) │     │ (POST/PUT/DEL)  │  │
└─────────────────┘     └─────────────────┘  │
        │                                     │
        │               ┌─────────────────┐  │
        │               │     Kafka       │◀─┘
        │               │  (Event Store)  │
        │               └────────┬────────┘
        │                        │
        │               ┌────────▼────────┐
        │               │    Workers      │
        │               │ (Availability,  │
        │               │  Financial,     │
        │               │  Projector)     │
        │               └────────┬────────┘
        │                        │
        ▼               ┌────────▼────────┐
┌─────────────────┐     │   Read Models   │
│   Query API     │◀────│  (Denormalized) │
│     (GET)       │     └─────────────────┘
└─────────────────┘
```

## Project Structure

```
petoo/
├── docker-compose.yml
├── backend/
│   ├── deps.edn
│   ├── src/clj/pet_app/
│   │   ├── core.clj          # Entry point
│   │   ├── system.clj        # Integrant config
│   │   ├── api/routes.clj    # HTTP routes
│   │   ├── domain/           # Business logic
│   │   ├── infra/            # DB & Kafka adapters
│   │   └── workers/          # Event consumers
│   └── resources/
│       ├── config.edn
│       └── migrations/
└── mobile/                   # Expo app
```

## Development

### REPL

```bash
cd backend
clj -M:nrepl
```

Then in your editor, connect to the nREPL and:

```clojure
(require '[user :refer [go halt restart]])
(go)       ; start
(halt)     ; stop
(restart)  ; restart
```

### Kafka UI

Access Kafka UI at http://localhost:8080 to view topics and messages.

## Testing the API

### Using Postman

1. Import `Petoo_API.postman_collection.json` into Postman
2. Import `Petoo_API_Environment.postman_environment.json` as environment
3. See `POSTMAN_SETUP.md` for detailed testing guide

### API Endpoints

**Authentication:**
- `POST /api/v1/auth/login` - Login and get JWT token
- `GET /api/v1/auth/me` - Get current user info (requires authentication)

**Commands (Write Operations):**
- `POST /api/v1/users` - Create user (public - registration)
- `POST /api/v1/pets` - Create pet (requires authentication)
- `POST /api/v1/services` - Create service (requires authentication)
- `POST /api/v1/professionals` - Create professional (requires authentication)
- `POST /api/v1/appointments` - Create appointment (requires authentication)

**Queries (Read Operations):**
- `GET /api/v1/appointments` - List appointments
- `GET /api/v1/appointments/:id` - Get appointment by ID
- `GET /api/v1/services` - List services (public)
- `GET /api/v1/professionals` - List professionals (public)
- `GET /api/v1/schedule/:professional-id` - Get professional schedule
- `GET /api/v1/tenants/:slug` - Get tenant configuration

### Authentication

The API uses JWT (JSON Web Tokens) for authentication.

**1. Register a user:**
```bash
POST /api/v1/users
{
  "tenant-id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "email": "user@example.com",
  "password": "senha123456",
  "name": "User Name"
}
```

**2. Login:**
```bash
POST /api/v1/auth/login
{
  "email": "user@example.com",
  "password": "senha123456"
}

# Response:
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "name": "User Name",
    "role": "CUSTOMER"
  }
}
```

**3. Use token in requests:**
```bash
# Add to headers:
Authorization: Bearer <token>

# Example:
curl -H "Authorization: Bearer <token>" \
     http://localhost:3000/api/v1/auth/me
```

**Protected Routes:**
- Creating pets, services, professionals, and appointments requires authentication
- Reading appointments requires authentication
- Public routes: health, ping, user registration, listing services/professionals

## Troubleshooting

### PostgreSQL Connection Issues

If you have a local PostgreSQL running on port 5432:

```bash
# Stop local PostgreSQL
sudo systemctl stop postgresql
sudo systemctl disable postgresql

# Restart Docker containers
docker-compose down
docker-compose up -d
```

### Port Already in Use

Make sure ports 3000, 5432, 9092, 2181, and 8080 are available.

## License

Proprietary - All rights reserved.
