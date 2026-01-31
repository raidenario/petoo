-- ============================================
-- Migration 008: Clients e Sistema OTP
-- ============================================

-- Tabela de Clientes (usuários finais do app - donos de pets)
CREATE TABLE core.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    avatar_url TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de tokens OTP (One-Time Password)
CREATE TABLE core.otp_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    token VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modificar tabela de Pets para referenciar Clients
ALTER TABLE core.pets 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES core.clients(id) ON DELETE CASCADE;

-- Modificar appointments para aceitar client_id
ALTER TABLE core.appointments 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES core.clients(id);

-- Atualizar role constraint em users (agora enterprise_users)
ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE core.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('MASTER', 'ADMIN', 'EMPLOYEE', 'CUSTOMER', 'STAFF'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_phone ON core.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_location ON core.clients(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_otp_phone_expires ON core.otp_tokens(phone, expires_at);
CREATE INDEX IF NOT EXISTS idx_pets_client ON core.pets(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client ON core.appointments(client_id);
