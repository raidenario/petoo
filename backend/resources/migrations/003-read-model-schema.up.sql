-- ============================================
-- Migration 003: Read Model Schema
-- Views desnormalizadas para Query API
-- ============================================

-- ============================================
-- APPOINTMENTS_VIEW (Query otimizada)
-- ============================================
-- JSONB desnormalizado para zero JOINs na leitura
CREATE TABLE read_model.appointments_view (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    -- Dados desnormalizados do agendamento
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    Estrutura do JSONB 'data':
    {
        "appointment": {
            "id": "uuid",
            "startTime": "2024-01-15T10:00:00Z",
            "endTime": "2024-01-15T10:30:00Z",
            "status": "CONFIRMED",
            "notes": "..."
        },
        "tenant": {
            "id": "uuid",
            "name": "PetAgita Demo",
            "slug": "petagita-demo"
        },
        "user": {
            "id": "uuid",
            "name": "João Silva",
            "email": "joao@email.com",
            "phone": "11999999999"
        },
        "pet": {
            "id": "uuid",
            "name": "Rex",
            "species": "DOG",
            "breed": "Golden Retriever"
        },
        "professional": {
            "id": "uuid",
            "name": "Maria Santos"
        },
        "service": {
            "id": "uuid",
            "name": "Banho + Tosa",
            "priceCents": 8000,
            "durationMinutes": 60
        },
        "payment": {
            "transactionId": "uuid",
            "status": "PAID",
            "amountCents": 8000
        }
    }
    */
    
    -- Campos extraídos para indexação e filtros
    status VARCHAR(50),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    user_id UUID,
    pet_id UUID,
    professional_id UUID,
    service_id UUID,
    
    -- Metadados
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SCHEDULE_SLOTS_VIEW (Disponibilidade)
-- ============================================
CREATE TABLE read_model.schedule_slots_view (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    professional_id UUID NOT NULL,
    
    -- Slot
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    
    -- Status
    is_available BOOLEAN DEFAULT true,
    appointment_id UUID,  -- Preenchido se ocupado
    
    -- Metadados
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, professional_id, slot_date, slot_time)
);

-- ============================================
-- TENANT_DASHBOARD_VIEW (Dashboard do Tenant)
-- ============================================
CREATE TABLE read_model.tenant_dashboard_view (
    tenant_id UUID PRIMARY KEY,
    
    -- Contadores
    data JSONB NOT NULL DEFAULT '{
        "today": {
            "appointments": 0,
            "pending": 0,
            "confirmed": 0,
            "completed": 0,
            "revenue_cents": 0
        },
        "week": {
            "appointments": 0,
            "revenue_cents": 0
        },
        "month": {
            "appointments": 0,
            "revenue_cents": 0
        }
    }'::jsonb,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_appointments_view_tenant ON read_model.appointments_view(tenant_id);
CREATE INDEX idx_appointments_view_status ON read_model.appointments_view(status);
CREATE INDEX idx_appointments_view_start_time ON read_model.appointments_view(start_time);
CREATE INDEX idx_appointments_view_user ON read_model.appointments_view(user_id);
CREATE INDEX idx_appointments_view_professional ON read_model.appointments_view(professional_id);

-- GIN index para buscas no JSONB
CREATE INDEX idx_appointments_view_data ON read_model.appointments_view USING GIN (data);

CREATE INDEX idx_schedule_slots_availability ON read_model.schedule_slots_view(
    tenant_id, 
    professional_id, 
    slot_date, 
    is_available
);

CREATE INDEX idx_schedule_slots_date ON read_model.schedule_slots_view(slot_date);

