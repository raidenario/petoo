<p align="center">
  <img src="petoo-app/assets/petoo-logo.png" alt="Petoo Logo" width="120" height="120">
</p>

<h1 align="center">🐾 Petoo</h1>

<p align="center">
  <strong>Plataforma White-Label SaaS para Petshops e Serviços Pet</strong>
</p>

<p align="center">
  <a href="#-sobre">Sobre</a> •
  <a href="#-funcionalidades">Funcionalidades</a> •
  <a href="#-tecnologias">Tecnologias</a> •
  <a href="#-arquitetura">Arquitetura</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-documentação">Documentação</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Clojure-5881D8?style=for-the-badge&logo=clojure&logoColor=white" alt="Clojure">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Apache_Kafka-231F20?style=for-the-badge&logo=apache-kafka&logoColor=white" alt="Kafka">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</p>

---

## 📱 Sobre

O **Petoo** é uma plataforma completa para gestão de petshops, hotéis pet e serviços de banho & tosa. Desenvolvido com arquitetura CQRS (Command Query Responsibility Segregation) e Event Sourcing, oferece uma experiência robusta e escalável tanto para os estabelecimentos quanto para os tutores de pets.

### 🎯 Para quem é?

- **Petshops e Clínicas Veterinárias** - Gerencie agendamentos, profissionais e clientes
- **Hotéis Pet** - Sistema completo de reservas e hospedagem
- **Banho & Tosa** - Agendamento de serviços com profissionais
- **Tutores de Pets** - App intuitivo para agendar serviços e acompanhar seus pets

---

## ✨ Funcionalidades

### 📱 App Mobile (React Native)

| Feature | Descrição |
|---------|-----------|
| 🔐 **Autenticação OTP** | Login seguro via código SMS |
| 🏨 **Hotel Pet** | Reservas de hospedagem com seleção de datas |
| 🛁 **Banho & Tosa** | Agendamento de serviços de grooming |
| 🐕 **Gestão de Pets** | Cadastro e gerenciamento dos seus animais |
| 📅 **Agendamentos** | Visualização e gestão de compromissos |
| 💳 **Carteira Digital** | Sistema de pagamento integrado |
| 🏢 **Multi-Enterprise** | Suporte a múltiplos estabelecimentos |

### 🖥️ Backend (Clojure)

| Feature | Descrição |
|---------|-----------|
| 🔄 **CQRS** | Separação de comandos e consultas |
| 📨 **Event Sourcing** | Histórico completo de eventos via Kafka |
| 🏪 **Multi-Tenancy** | White-label para múltiplos negócios |
| 🔐 **JWT Auth** | Autenticação segura com tokens |
| 💰 **Wallet System** | Sistema financeiro com carteiras digitais |
| 📊 **Workers** | Processamento assíncrono de eventos |

---

## 🛠️ Tecnologias

### Backend
| Tecnologia | Uso |
|------------|-----|
| **Clojure 1.11** | Linguagem principal |
| **Ring + Reitit** | HTTP Server & Routing |
| **Integrant** | Sistema de componentes |
| **next.jdbc + HoneySQL** | Banco de dados |
| **PostgreSQL 15** | Banco relacional |
| **Apache Kafka** | Message broker |
| **Malli** | Validação de schemas |
| **Buddy** | Autenticação & JWT |

### Mobile
| Tecnologia | Uso |
|------------|-----|
| **React Native 0.81** | Framework mobile |
| **Expo 54** | Plataforma de desenvolvimento |
| **React Navigation 7** | Navegação |
| **Async Storage** | Persistência local |
| **Linear Gradient** | UI gradients |

### Infraestrutura
| Tecnologia | Uso |
|------------|-----|
| **Docker & Compose** | Containerização |
| **Kafka UI** | Monitoramento de mensagens |
| **HikariCP** | Connection pooling |
| **Migratus** | Migrations de banco |

---

## 🏗️ Arquitetura

O Petoo utiliza arquitetura **CQRS** com **Event Sourcing** para garantir escalabilidade e rastreabilidade.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              PETOO ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐                    ┌─────────────────┐            │
│   │   📱 Mobile App  │                    │   Command API   │            │
│   │  (React Native)  │───────────────────▶│  POST/PUT/DEL   │────┐       │
│   └─────────────────┘                    └─────────────────┘    │       │
│           │                                                      │       │
│           │                              ┌─────────────────┐    │       │
│           │                              │    🔄 Kafka     │◀───┘       │
│           │                              │  (Event Store)  │            │
│           │                              └────────┬────────┘            │
│           │                                       │                      │
│           │                              ┌────────▼────────┐            │
│           │                              │    ⚙️ Workers   │            │
│           │                              │  - Availability │            │
│           │                              │  - Financial    │            │
│           │                              │  - Projector    │            │
│           │                              └────────┬────────┘            │
│           │                                       │                      │
│           ▼                              ┌────────▼────────┐            │
│   ┌─────────────────┐                    │  📊 Read Models │            │
│   │   Query API     │◀───────────────────│  (Denormalized) │            │
│   │      GET        │                    └─────────────────┘            │
│   └─────────────────┘                                                    │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                        🗄️ PostgreSQL                             │   │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│   │  │   core   │  │ financial│  │scheduling│  │  events  │        │   │
│   │  │  schema  │  │  schema  │  │  schema  │  │  schema  │        │   │
│   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Pré-requisitos

- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) 18+ (para o mobile)
- [Expo Go](https://expo.dev/client) no seu celular

### 1️⃣ Clone o repositório

```bash
git clone https://github.com/seu-usuario/petoo.git
cd petoo
```

### 2️⃣ Suba o Backend (Docker)

```bash
# Sobe toda a infraestrutura (PostgreSQL, Kafka, API)
docker compose up -d --build

# Aguarde ~60s para a API inicializar completamente
# Verifique se está funcionando:
curl http://localhost:3000/health
```

### 3️⃣ Rode o Mobile

```bash
cd petoo-app

# Instale as dependências
npm install

# Inicie o Expo
npx expo start
```

### 4️⃣ Conecte seu dispositivo

- **iOS**: Escaneie o QR code com a câmera
- **Android**: Escaneie com o app Expo Go

> ⚠️ **Importante**: Atualize o IP da API em `petoo-app/src/services/api.js` com o IP da sua máquina na rede local.

---

## 📚 Documentação

### 🔗 Links Úteis

| Recurso | URL | Descrição |
|---------|-----|-----------|
| 🏥 Health Check | http://localhost:3000/health | Status da API |
| 📊 Kafka UI | http://localhost:8080 | Monitorar tópicos e mensagens |
| 📖 API Docs | [docs/API.md](docs/API.md) | Documentação completa da API |
| 📋 Models | [docs/MODELS.md](docs/MODELS.md) | Modelos de dados |

### 🔐 Autenticação

O Petoo suporta dois fluxos de autenticação:

#### Clientes (OTP via SMS)
```bash
# 1. Solicitar código OTP
POST /api/v1/auth/otp/request
{ "phone": "+5511999998888" }

# 2. Verificar OTP e obter perfis
POST /api/v1/auth/otp/verify
{ "phone": "+5511999998888", "token": "123456" }

# 3. Selecionar perfil (se houver múltiplos)
POST /api/v1/auth/select-profile
{ "phone": "+5511999998888", "profile-type": "CLIENT" }
```

#### Empresas (Email + Senha)
```bash
POST /api/v1/auth/enterprise/login
{ "email": "admin@empresa.com", "password": "senha123" }
```

### 📁 Estrutura do Projeto

```
petoo/
├── 📁 backend/                    # API Clojure
│   ├── 📁 src/clj/pet_app/
│   │   ├── 📁 api/                # Controllers & Routes
│   │   │   ├── 📁 auth/           # Autenticação (OTP, Enterprise)
│   │   │   ├── 📁 commands/       # Write operations
│   │   │   ├── 📁 queries/        # Read operations
│   │   │   └── routes.clj         # Definição de rotas
│   │   ├── 📁 domain/             # Regras de negócio
│   │   ├── 📁 infra/              # DB, Kafka, Auth
│   │   └── 📁 workers/            # Consumers Kafka
│   ├── 📁 resources/
│   │   ├── 📁 migrations/         # SQL migrations
│   │   └── config.edn             # Configurações
│   ├── deps.edn                   # Dependências Clojure
│   └── Dockerfile
│
├── 📁 petoo-app/                  # App React Native
│   ├── 📁 src/
│   │   ├── 📁 components/         # Componentes reutilizáveis
│   │   ├── 📁 context/            # Context API (Auth, Theme)
│   │   ├── 📁 navigation/         # React Navigation
│   │   ├── 📁 screens/            # Telas do app
│   │   │   ├── 📁 auth/           # Login, Registro
│   │   │   └── *.js               # Outras telas
│   │   └── 📁 services/           # API client
│   ├── 📁 assets/                 # Imagens e ícones
│   ├── App.js                     # Entry point
│   └── package.json
│
├── 📁 docs/                       # Documentação
├── 📁 Petoo API/                  # Collection Bruno
├── docker-compose.yml             # Orquestração Docker
└── README.md                      # Este arquivo
```

---

## 🔧 Desenvolvimento

### Backend (REPL)

```bash
cd backend
clj -M:nrepl
```

No REPL:
```clojure
(require '[user :refer [go halt restart]])
(go)       ; Inicia o sistema
(halt)     ; Para o sistema
(restart)  ; Reinicia
```

### Mobile

```bash
cd petoo-app
npx expo start

# Opções úteis:
# Press 'a' - Abrir no Android Emulator
# Press 'i' - Abrir no iOS Simulator
# Press 'r' - Recarregar
```

### Testes de API

O projeto inclui collections para teste:

| Ferramenta | Arquivo |
|------------|---------|
| **Postman** | `Petoo_API.postman_collection.json` |
| **Bruno** | Pasta `Petoo API/` |

---

## 🐳 Docker Services

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| `petoo-api` | 3000 | Backend Clojure |
| `petoo-postgres` | 5432 | Banco de dados |
| `petoo-kafka` | 9092 | Message broker |
| `petoo-zookeeper` | 2181 | Kafka coordinator |
| `petoo-kafka-ui` | 8080 | UI para Kafka |

### Comandos Úteis

```bash
# Ver logs da API
docker logs -f petoo-api

# Reconstruir apenas a API
docker compose up -d --build api

# Parar tudo
docker compose down

# Limpar volumes (cuidado: apaga dados)
docker compose down -v
```

---

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Commit suas mudanças: `git commit -m 'feat: Minha nova feature'`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados.

---

<p align="center">
  Desenvolvido com 💜 e ☕ para pets felizes! 🐾
</p>

<p align="center">
  <a href="#-petoo">⬆️ Voltar ao topo</a>
</p>
