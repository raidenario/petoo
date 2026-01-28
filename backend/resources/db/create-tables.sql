-- ============================================
-- Create all tables directly (Consolidated Schema)
-- Includes: core, financial, read_model
-- ============================================

-- Ensure Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE SCHEMA
-- ============================================

-- TENANTS
CREATE TABLE IF NOT EXISTS core.tenants (
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

-- USERS
CREATE TABLE IF NOT EXISTS core.users (
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

-- PETS
CREATE TABLE IF NOT EXISTS core.pets (
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

-- PROFESSIONALS
CREATE TABLE IF NOT EXISTS core.professionals (
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

-- SERVICES
CREATE TABLE IF NOT EXISTS core.services (
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

-- APPOINTMENTS
CREATE TABLE IF NOT EXISTS core.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES core.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES core.users(id),
    pet_id UUID REFERENCES core.pets(id),
    professional_id UUID REFERENCES core.professionals(id),
    service_id UUID REFERENCES core.services(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'
    )),
    notes TEXT,
    transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FINANCIAL SCHEMA
-- ============================================

-- WALLETS
CREATE TABLE IF NOT EXISTS financial.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,
    owner_type VARCHAR(50) NOT NULL CHECK (owner_type IN ('TENANT', 'PLATFORM')),
    currency VARCHAR(3) DEFAULT 'BRL',
    balance_cents BIGINT DEFAULT 0,
    pending_cents BIGINT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, owner_type)
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS financial.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES financial.wallets(id),
    external_id VARCHAR(255),
    appointment_id UUID,
    amount_cents BIGINT NOT NULL,
    fee_cents BIGINT DEFAULT 0,
    net_cents BIGINT GENERATED ALWAYS AS (amount_cents - fee_cents) STORED,
    currency VARCHAR(3) DEFAULT 'BRL',
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'CREATED' CHECK (status IN (
        'CREATED', 'PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'
    )),
    gateway_response JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEDGER_ENTRIES
CREATE TABLE IF NOT EXISTS financial.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES financial.transactions(id),
    wallet_id UUID REFERENCES financial.wallets(id) NOT NULL,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
        'CREDIT', 'DEBIT', 'FEE', 'REFUND', 'ADJUSTMENT'
    )),
    amount_cents BIGINT NOT NULL,
    balance_after_cents BIGINT NOT NULL,
    description TEXT,
    reference_type VARCHAR(50),
    reference_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- READ MODEL SCHEMA
-- ============================================

-- APPOINTMENTS_VIEW
CREATE TABLE IF NOT EXISTS read_model.appointments_view (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    user_id UUID,
    pet_id UUID,
    professional_id UUID,
    service_id UUID,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SCHEDULE_SLOTS_VIEW
CREATE TABLE IF NOT EXISTS read_model.schedule_slots_view (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    professional_id UUID NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_available BOOLEAN DEFAULT true,
    appointment_id UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, professional_id, slot_date, slot_time)
);

-- TENANT_DASHBOARD_VIEW
CREATE TABLE IF NOT EXISTS read_model.tenant_dashboard_view (
    tenant_id UUID PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{
        "today": {"appointments": 0, "pending": 0, "confirmed": 0, "completed": 0, "revenue_cents": 0},
        "week": {"appointments": 0, "revenue_cents": 0},
        "month": {"appointments": 0, "revenue_cents": 0}
    }'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Core Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON core.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pets_tenant ON core.pets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON core.appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_slot_check ON core.appointments(professional_id, start_time, end_time) WHERE status IN ('PENDING', 'CONFIRMED');

-- Financial Indexes
CREATE INDEX IF NOT EXISTS idx_wallets_owner ON financial.wallets(owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON financial.transactions(appointment_id);

-- Read Model Indexes
CREATE INDEX IF NOT EXISTS idx_appointments_view_tenant ON read_model.appointments_view(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_view_status ON read_model.appointments_view(status);
CREATE INDEX IF NOT EXISTS idx_appointments_view_start_time ON read_model.appointments_view(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_view_data ON read_model.appointments_view USING GIN (data);
CREATE INDEX IF NOT EXISTS idx_schedule_slots_availability ON read_model.schedule_slots_view(tenant_id, professional_id, slot_date, is_available);
