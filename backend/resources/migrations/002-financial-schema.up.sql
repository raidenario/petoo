-- ============================================
-- Migration 002: Financial Schema
-- Ledger Imutável e Sistema de Pagamentos
-- ============================================

-- ============================================
-- WALLETS (Carteiras)
-- ============================================
CREATE TABLE financial.wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL,  -- ID do Tenant ou da Plataforma
    owner_type VARCHAR(50) NOT NULL CHECK (owner_type IN ('TENANT', 'PLATFORM')),
    currency VARCHAR(3) DEFAULT 'BRL',
    balance_cents BIGINT DEFAULT 0,
    pending_cents BIGINT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(owner_id, owner_type)
);

-- ============================================
-- TRANSACTIONS (Transações do Gateway)
-- ============================================
CREATE TABLE financial.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID REFERENCES financial.wallets(id),
    external_id VARCHAR(255),  -- ID do Gateway (Stripe, Pagarme, etc)
    appointment_id UUID,       -- Referência ao core.appointments
    amount_cents BIGINT NOT NULL,
    fee_cents BIGINT DEFAULT 0,
    net_cents BIGINT GENERATED ALWAYS AS (amount_cents - fee_cents) STORED,
    currency VARCHAR(3) DEFAULT 'BRL',
    payment_method VARCHAR(50),  -- CREDIT_CARD, DEBIT_CARD, PIX, BOLETO
    status VARCHAR(50) DEFAULT 'CREATED' CHECK (status IN (
        'CREATED',      -- Criada
        'PENDING',      -- Aguardando pagamento
        'PROCESSING',   -- Processando
        'PAID',         -- Paga
        'FAILED',       -- Falhou
        'REFUNDED',     -- Estornada
        'CANCELLED'     -- Cancelada
    )),
    gateway_response JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEDGER_ENTRIES (Imutável - Append Only)
-- ============================================
-- REGRA: Esta tabela NUNCA recebe UPDATE ou DELETE
-- Cada movimentação é uma nova linha
CREATE TABLE financial.ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES financial.transactions(id),
    wallet_id UUID REFERENCES financial.wallets(id) NOT NULL,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
        'CREDIT',           -- Entrada (cliente pagou)
        'DEBIT',            -- Saída (payout)
        'FEE',              -- Taxa da plataforma
        'REFUND',           -- Estorno
        'ADJUSTMENT'        -- Ajuste manual
    )),
    amount_cents BIGINT NOT NULL,  -- Positivo = entrada, Negativo = saída
    balance_after_cents BIGINT NOT NULL,  -- Saldo após esta operação
    description TEXT,
    reference_type VARCHAR(50),  -- APPOINTMENT, PAYOUT, etc
    reference_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
    -- NOTA: Sem updated_at pois é imutável
);

-- Prevenir modificações no ledger (trigger de proteção)
CREATE OR REPLACE FUNCTION financial.prevent_ledger_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Ledger entries are immutable. Cannot UPDATE or DELETE.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_immutable_trigger
    BEFORE UPDATE OR DELETE ON financial.ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION financial.prevent_ledger_modification();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_wallets_owner ON financial.wallets(owner_id, owner_type);
CREATE INDEX idx_transactions_wallet ON financial.transactions(wallet_id);
CREATE INDEX idx_transactions_status ON financial.transactions(status);
CREATE INDEX idx_transactions_appointment ON financial.transactions(appointment_id);
CREATE INDEX idx_transactions_external ON financial.transactions(external_id);
CREATE INDEX idx_ledger_wallet ON financial.ledger_entries(wallet_id);
CREATE INDEX idx_ledger_transaction ON financial.ledger_entries(transaction_id);
CREATE INDEX idx_ledger_created ON financial.ledger_entries(created_at);

