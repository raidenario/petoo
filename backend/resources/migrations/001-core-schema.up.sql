-- ============================================
-- Migration 001: Core Schema
-- Tabelas de Negócio Principal
-- ============================================

-- ============================================
-- TENANTS (Multi-tenant)
-- ============================================
CREATE TABLE core.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    theme_config JSONB DEFAULT '{
        "primaryColor": "#6366f1",
        "secondaryColor": "#22d3ee",
        "logo": null
    }'::jsonb,
    commission_rate DECIMAL(5,4) DEFAULT 0.10,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS
-- ============================================
CREATE TABLE core.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES core.tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN', 'STAFF')),
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- ============================================
-- PETS
-- ============================================
CREATE TABLE core.pets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES core.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES core.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    species VARCHAR(100) NOT NULL DEFAULT 'DOG',
    breed VARCHAR(100),
    size VARCHAR(20) CHECK (size IN ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE')),
    birth_date DATE,
    weight_kg DECIMAL(5,2),
    notes TEXT,
    photo_url TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROFESSIONALS (Funcionários)
-- ============================================
CREATE TABLE core.professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES core.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES core.users(id),
    name VARCHAR(255) NOT NULL,
    specialty VARCHAR(100),
    availability JSONB DEFAULT '{
        "monday": {"start": "08:00", "end": "18:00"},
        "tuesday": {"start": "08:00", "end": "18:00"},
        "wednesday": {"start": "08:00", "end": "18:00"},
        "thursday": {"start": "08:00", "end": "18:00"},
        "friday": {"start": "08:00", "end": "18:00"},
        "saturday": {"start": "08:00", "end": "12:00"},
        "sunday": null
    }'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVICES (Serviços Oferecidos)
-- ============================================
CREATE TABLE core.services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES core.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price_cents INTEGER NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPOINTMENTS (Agendamentos - Write Model)
-- ============================================
CREATE TABLE core.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES core.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES core.users(id),
    pet_id UUID REFERENCES core.pets(id),
    professional_id UUID REFERENCES core.professionals(id),
    service_id UUID REFERENCES core.services(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING',      -- Aguardando processamento
        'CONFIRMED',    -- Slot reservado
        'CANCELLED',    -- Cancelado
        'COMPLETED',    -- Finalizado
        'NO_SHOW'       -- Cliente não compareceu
    )),
    notes TEXT,
    transaction_id UUID,  -- Referência ao financial.transactions
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_users_tenant ON core.users(tenant_id);
CREATE INDEX idx_users_email ON core.users(email);
CREATE INDEX idx_pets_user ON core.pets(user_id);
CREATE INDEX idx_pets_tenant ON core.pets(tenant_id);
CREATE INDEX idx_professionals_tenant ON core.professionals(tenant_id);
CREATE INDEX idx_services_tenant ON core.services(tenant_id);
CREATE INDEX idx_appointments_tenant ON core.appointments(tenant_id);
CREATE INDEX idx_appointments_professional ON core.appointments(professional_id);
CREATE INDEX idx_appointments_start_time ON core.appointments(start_time);
CREATE INDEX idx_appointments_status ON core.appointments(status);

-- Índice para verificação de conflitos de horário
CREATE INDEX idx_appointments_slot_check ON core.appointments(
    professional_id, 
    start_time, 
    end_time
) WHERE status IN ('PENDING', 'CONFIRMED');

