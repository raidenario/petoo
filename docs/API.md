# Petoo API Documentation

Esta documentação descreve todos os endpoints da API do Petoo, organizados por categoria.

## Base URL
A API roda em `http://localhost:3000` por padrão. Todos os endpoints da aplicação usam o prefixo `/api/v1`.

## Autenticação

A API utiliza **JSON Web Tokens (JWT)** para autenticação.

### 1. Login
`POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name",
    "role": "CUSTOMER"
  }
}
```

### 2. Get Current User
`GET /api/v1/auth/me`
*Requer Header: `Authorization: Bearer <token>`*

**Response (200 OK):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "CUSTOMER"
}
```

---

## Comandos (Escrita)

### 3. Registro de Usuário (Público)
`POST /api/v1/users`

**Request Body:**
```json
{
  "tenant-id": "uuid",
  "email": "user@example.com",
  "password": "yourpassword",
  "name": "User Name"
}
```

### 4. Criar Pet
`POST /api/v1/pets`
*Requer Header: `Authorization: Bearer <token>`*

**Request Body:**
```json
  "size": "LARGE",
  "notes": {
    "sedentary": true,
    "walk-times": "07:00, 18:00",
    "alimentation": "Ração Premium",
    "castrated": true,
    "objects": "Bolinha azul",
    "others": "Gosta de carinho na barriga"
  },
  "medical-notes": {
    "mastigation": "medium",
    "bowel_movement_frequency": "2x ao dia",
    "vaccines": "V10, Raiva",
    "patology": true,
    "patology-description": "Dermatite atópica"
  }
}
```

### 5. Criar Agendamento
`POST /api/v1/appointments`
*Requer Header: `Authorization: Bearer <token>`*

**Request Body:**
```json
{
  "tenant-id": "uuid",
  "user-id": "uuid",
  "pet-id": "uuid",
  "professional-id": "uuid",
  "service-id": "uuid",
  "start-time": "2024-02-01T10:00:00Z",
  "end-time": "2024-02-01T11:00:00Z"
}
```

---

## Upload de Imagens

### 6. Upload de Foto do Pet
`POST /api/v1/pets/:id/photo`
*Requer Header: `Authorization: Bearer <token>`*
*Content-Type: `multipart/form-data`*

**Form Data:**
- `file`: Arquivo de imagem (jpg, png)

### 7. Upload de Avatar do Profissional
`POST /api/v1/professionals/:id/avatar`
*Requer Header: `Authorization: Bearer <token>`*
*Content-Type: `multipart/form-data`*

**Form Data:**
- `file`: Arquivo de imagem

### 8. Upload de Logo do Tenant
`POST /api/v1/tenants/:id/logo`
*Requer Header: `Authorization: Bearer <token>`*
*Content-Type: `multipart/form-data`*

**Form Data:**
- `file`: Arquivo de imagem

---

## Queries (Leitura)

### 9. Listar Serviços
`GET /api/v1/services`

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Banho Simples",
    "price_cents": 5000,
    "duration_minutes": 30
  }
]
```

### 7. Ver Agenda do Profissional
`GET /api/v1/schedule/:professional-id`

**Query Params:**
- `date`: "2024-02-01" (opcional)

### 8. Configuração do Tenant (White-label)
`GET /api/v1/tenants/:slug`

**Response (200 OK):**
```json
{
  "id": "uuid",
  "name": "Petshop Demo",
  "slug": "petshop-demo",
  "theme_config": {
    "primaryColor": "#6366f1",
    "secondaryColor": "#22d3ee"
  }
}
```

---

## Códigos de Erro
- `401 Unauthorized`: Token ausente ou inválido.
- `403 Forbidden`: Usuário não tem permissão para esta ação.
- `404 Not Found`: Recurso não encontrado.
- `400 Bad Request`: Dados inválidos ou erro de negócio.
