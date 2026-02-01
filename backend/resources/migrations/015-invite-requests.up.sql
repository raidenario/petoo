-- ============================================
-- Migration 015: Solicitações de Convite para Empresas
-- ============================================

-- Tabela de solicitações de parceria
CREATE TABLE core.invite_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    invite_code VARCHAR(50),
    approved_by UUID REFERENCES core.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_invite_requests_status ON core.invite_requests(status);
CREATE INDEX IF NOT EXISTS idx_invite_requests_email ON core.invite_requests(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_requests_code ON core.invite_requests(invite_code) WHERE invite_code IS NOT NULL;
