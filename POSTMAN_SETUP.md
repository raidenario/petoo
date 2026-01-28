# 🚀 Guia de Uso - Postman Collection Petoo API

## 📥 Importar Collection e Environment

1. **Abra o Postman**
2. **Importe a Collection:**
   - Clique em "Import" no canto superior esquerdo
   - Arraste o arquivo `Petoo_API.postman_collection.json` ou clique em "Upload Files"
   - A collection "Petoo API" aparecerá na sidebar

3. **Importe o Environment:**
   - Clique em "Import" novamente
   - Arraste o arquivo `Petoo_API_Environment.postman_environment.json`
   - Selecione o environment "Petoo API - Local" no dropdown no canto superior direito

## 🔧 Configuração Inicial

### Variáveis do Environment

O environment já vem pré-configurado com:

- `base_url`: `http://localhost:3000` (ajuste se necessário)
- `tenant_id`: `a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11` (exemplo)
- `user_id`: (será preenchido após criar um usuário)
- `pet_id`: (será preenchido após criar um pet)
- `professional_id`: (será preenchido após criar um profissional)
- `service_id`: (será preenchido após criar um serviço)
- `appointment_id`: (será preenchido após criar um agendamento)
- `tenant_slug`: `petoo` (exemplo)

## 📋 Fluxo de Teste Recomendado

### 1. Verificar Saúde da API
```
GET /health
```
Deve retornar status 200 com informações sobre database e kafka.

### 2. Criar Serviço
```
POST /api/v1/services
```
**Body exemplo:**
```json
{
  "tenant-id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "Consulta Veterinária",
  "description": "Consulta geral com veterinário",
  "category": "Consulta",
  "price-cents": 15000,
  "duration-minutes": 30,
  "active": true
}
```
**Importante:** Copie o `id` retornado e atualize a variável `service_id` no environment.

### 3. Criar Profissional
```
POST /api/v1/professionals
```
**Body exemplo:**
```json
{
  "tenant-id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "name": "Dr. Maria Santos",
  "specialty": "Clínica Geral",
  "availability": {
    "monday": {"start": "09:00", "end": "18:00"},
    "tuesday": {"start": "09:00", "end": "18:00"}
  },
  "active": true
}
```
**Importante:** Copie o `id` retornado e atualize a variável `professional_id` no environment.

### 4. Criar Usuário
```
POST /api/v1/users
```
**Body exemplo:**
```json
{
  "tenant-id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "email": "joao@email.com",
  "password": "senha123456",
  "name": "João Silva",
  "phone": "+5511999999999",
  "role": "CUSTOMER"
}
```
**Importante:** Copie o `id` retornado e atualize a variável `user_id` no environment.

### 5. Criar Pet
```
POST /api/v1/pets
```
**Body exemplo:**
```json
{
  "tenant-id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "user-id": "{{user_id}}",
  "name": "Rex",
  "species": "DOG",
  "breed": "Golden Retriever",
  "size": "LARGE",
  "birth-date": "2020-05-15",
  "weight-kg": 25.5
}
```
**Importante:** Copie o `id` retornado e atualize a variável `pet_id` no environment.

### 6. Criar Agendamento
```
POST /api/v1/appointments
```
**Body exemplo:**
```json
{
  "tenant-id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  "user-id": "{{user_id}}",
  "pet-id": "{{pet_id}}",
  "professional-id": "{{professional_id}}",
  "service-id": "{{service_id}}",
  "start-time": "2026-01-25T10:00:00Z",
  "notes": "Primeira consulta do Rex"
}
```
**Importante:** Copie o `id` retornado e atualize a variável `appointment_id` no environment.

### 7. Consultar Agendamentos
```
GET /api/v1/appointments?tenant-id={{tenant_id}}
```

## 📝 Notas Importantes

### Formato de Datas
- Use formato ISO 8601: `2026-01-25T10:00:00Z`
- Exemplo: `2026-01-25T14:30:00Z` (14:30 horário local)

### Preços
- Os preços são em **centavos**
- Exemplo: `15000` = R$ 150,00

### Status Codes
- `202 Accepted`: Comando aceito para processamento (CQRS)
- `200 OK`: Query executada com sucesso
- `400 Bad Request`: Erro de validação
- `404 Not Found`: Recurso não encontrado
- `500 Internal Server Error`: Erro no servidor

### Validações
- `tenant-id`: Deve ser um UUID válido
- `email`: Formato de email válido
- `password`: Mínimo 8 caracteres
- `phone`: Formato internacional (+5511999999999)
- `start-time`: Data/hora futura em formato ISO 8601

## 🔍 Endpoints Disponíveis

### Health & Utility
- `GET /health` - Health check
- `GET /ping` - Ping/Pong

### Commands (Escrita - POST)
- `POST /api/v1/users` - Criar usuário
- `POST /api/v1/pets` - Criar pet
- `POST /api/v1/services` - Criar serviço
- `POST /api/v1/professionals` - Criar profissional
- `POST /api/v1/appointments` - Criar agendamento

### Queries (Leitura - GET)
- `GET /api/v1/appointments` - Listar agendamentos
- `GET /api/v1/appointments/:id` - Buscar agendamento por ID
- `GET /api/v1/services` - Listar serviços
- `GET /api/v1/professionals` - Listar profissionais
- `GET /api/v1/schedule/:professional-id` - Agenda do profissional
- `GET /api/v1/tenants/:slug` - Configurações do tenant

## 🐛 Troubleshooting

### Erro: "Connection refused"
- Verifique se o backend está rodando: `cd backend && clojure -M:dev`
- Verifique se a porta 3000 está correta no environment

### Erro: "Validation failed"
- Verifique se todos os campos obrigatórios estão presentes
- Verifique se os UUIDs estão no formato correto
- Verifique se as datas estão no formato ISO 8601

### Variáveis não funcionam
- Certifique-se de que o environment "Petoo API - Local" está selecionado
- Verifique se as variáveis estão preenchidas corretamente

