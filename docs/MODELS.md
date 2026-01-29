# Data Models (Petoo)

O Petoo utiliza uma arquitetura **CQRS**, separando os modelos de escrita (**Write Model**) dos modelos de consulta (**Read Model**).

## Esquemas de Banco de Dados

### 1. Schema `core`
Contém os dados primários de negócio e o modelo de escrita.

| Tabela | Descrição |
|--------|-----------|
| `tenants` | Configurações de cada petshop (white-label) |
| `users` | Usuários da plataforma (Clientes, Admins, Staff) |
| `pets` | Animais de estimação vinculados aos usuários |
| `professionals` | Funcionários que prestam serviços |
| `services` | Catálogo de serviços oferecidos |
| `appointments` | Registro principal de agendamentos |

### 2. Schema `financial`
Gerencia a carteira (wallet) e o ledger imutável.

| Tabela | Descrição |
|--------|-----------|
| `wallets` | Saldo de tenants e da plataforma |
| `transactions` | Transações vinculadas a pagamentos |
| `ledger_entries` | **Tabela Imutável**. Registro de cada centavo movimentado |

### 3. Schema `read_model`
Views e tabelas desnormalizadas otimizadas para leitura rápida (Query API).

| Tabela | Descrição |
|--------|-----------|
| `appointments_view` | Registro completo do agendamento com JSONB (Zero JOINs) |
| `schedule_slots_view` | Cache de slots de tempo disponíveis/ocupados |
| `tenant_dashboard_view` | Agregados de performance para o dashboard |

```mermaid
erDiagram
    %% O Usuário é GLOBAL (Plataforma)
    users ||--o{ pets : "dono de"
    users ||--o{ appointments : "solicita"

    %% O Estabelecimento (Tenant) possui recursos
    tenants ||--o{ professionals : "emprega"
    tenants ||--o{ services : "catálogo"
    tenants ||--o{ appointments : "recebe"
    tenants ||--|| wallets : "conta"

    %% O Profissional executa na agenda
    professionals ||--o{ appointments : "item de agenda"
    
    %% O Agendamento é o elo entre Usuário e Estabelecimento
    services ||--o{ appointments : "tipo de serviço"
    pets ||--o{ appointments : "paciente"
    
    %% Financeiro
    wallets ||--o{ ledger_entries : "histórico"
    transactions ||--o{ ledger_entries : "movimenta"
    appointments ||--o| transactions : "pagamento"

    tenants {
        uuid id PK
        string name
        string slug
        jsonb theme_config
        decimal commission_rate
        string status
    }

    users {
        uuid id PK
        string email "Global"
        string password_hash
        string name
        string role
        string avatar_url
    }
    pets {
        uuid id PK
        uuid user_id FK
        string name
        string species
        string size
        string photo_url
        jsonb notes
        jsonb medical_notes
    }

    professionals {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK "Vínculo com Auth"
        string name
        jsonb availability
    }

    services {
        uuid id PK
        uuid tenant_id FK
        string name
        integer price_cents
        integer duration_minutes
    }

    appointments {
        uuid id PK
        uuid tenant_id FK "Onde ocorre"
        uuid user_id FK "Quem solicitou"
        uuid pet_id FK
        uuid professional_id FK
        uuid service_id FK
        timestamptz start_time
        string status
    }

    wallets {
        uuid id PK
        uuid owner_id "ID do Tenant"
        string owner_type
        bigint balance_cents
    }

    transactions {
        uuid id PK
        uuid wallet_id FK
        uuid appointment_id FK
        bigint amount_cents
        string status
    }

    ledger_entries {
        uuid id PK
        uuid transaction_id FK
        uuid wallet_id FK
        string entry_type
        bigint amount_cents
    }
```

## 2. Fluxo de Dados (Arquitetura CQRS)

O fluxo segue o padrão iFood: O usuário navega nos estabelecimentos, escolhe um serviço/profissional e o sistema processa a reserva de agenda de forma assíncrona.

```mermaid
graph TD
    subgraph "Camada de Cliente"
        App[Mobile/Web App]
    end

    subgraph "Fluxo de Comando (Ação)"
        API_C[Command API]
        CoreDB[(PostgreSQL Core)]
        Kafka[[Kafka Event Bus]]
    end

    subgraph "Processamento (Inteligência)"
        Worker[Workers: Agenda, Financeiro]
    end

    subgraph "Camada de Consulta (Performance)"
        ReadDB[(PostgreSQL Read Model)]
        API_Q[Query API]
    end

    App -->|1. Solicita Agendamento| API_C
    API_C -->|2. Salva Intenção| CoreDB
    API_C -->|3. Dispara Evento| Kafka
    Kafka -->|4. Verifica disponibilidade| Worker
    Worker -->|5. Atualiza View de Tempo Real| ReadDB
    App -->|6. Consulta status | API_Q
    API_Q -->|7. Resposta instantânea| ReadDB
```

## Estrutura JSONB Sugerida (Read Model)
Na tabela `read_model.appointments_view`, o campo `data` armazena o objeto completo para evitar joins e garantir performance máxima no frontend:

```json
{
  "appointment": { "id": "uuid", "startTime": "..." },
  "user": { "name": "João", "email": "..." },
  "pet": { "name": "Rex", "species": "DOG" },
  "professional": { "name": "Maria" },
  "service": { "name": "Banho", "priceCents": 5000 }
}
```
