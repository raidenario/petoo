-- ============================================
-- Migration 013: Wallet and Payment System
-- ============================================

-- 1. Update financial.wallets owner_type constraint
ALTER TABLE financial.wallets DROP CONSTRAINT wallets_owner_type_check;
ALTER TABLE financial.wallets ADD CONSTRAINT wallets_owner_type_check 
    CHECK (owner_type IN ('USER', 'ENTERPRISE', 'PLATFORM'));

-- 2. Create financial.payment_methods table
CREATE TABLE financial.payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES core.users(id),
    method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('CREDIT_CARD', 'PIX', 'BOLETO')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create financial.wallet_deposits table
CREATE TABLE financial.wallet_deposits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES financial.wallets(id),
    amount_cents BIGINT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    external_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update financial.transactions table
ALTER TABLE financial.transactions ADD COLUMN user_id UUID REFERENCES core.users(id);
ALTER TABLE financial.transactions ADD COLUMN enterprise_id UUID REFERENCES core.enterprises(id);
ALTER TABLE financial.transactions ADD COLUMN source_type VARCHAR(50) DEFAULT 'APPOINTMENT' 
    CHECK (source_type IN ('APPOINTMENT', 'WALLET_DEPOSIT', 'DIRECT_PAYMENT'));

-- Update payment_method constraint in transactions
ALTER TABLE financial.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
-- Note: Original table didn't have a check constraint for payment_method, it was just a column.
-- But if it had, we would add 'WALLET_BALANCE' here.

-- 5. Read Model Views

-- user_wallets_view
CREATE TABLE read_model.user_wallets_view (
    id UUID PRIMARY KEY, -- wallet_id
    user_id UUID NOT NULL UNIQUE,
    balance_cents BIGINT DEFAULT 0,
    pending_cents BIGINT DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'BRL',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- enterprise_wallets_view
CREATE TABLE read_model.enterprise_wallets_view (
    id UUID PRIMARY KEY, -- wallet_id
    enterprise_id UUID NOT NULL UNIQUE,
    balance_cents BIGINT DEFAULT 0,
    pending_cents BIGINT DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'BRL',
    total_received_cents BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- wallet_transactions_view (Unified view for all financial movements)
CREATE TABLE read_model.wallet_transactions_view (
    id UUID PRIMARY KEY, -- transaction_id
    wallet_id UUID NOT NULL,
    owner_id UUID NOT NULL,
    owner_type VARCHAR(50) NOT NULL,
    amount_cents BIGINT NOT NULL,
    fee_cents BIGINT DEFAULT 0,
    net_cents BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL, -- CREDIT, DEBIT, FEE, DEPOSIT, etc
    status VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_user_wallets_user ON read_model.user_wallets_view(user_id);
CREATE INDEX idx_enterprise_wallets_ent ON read_model.enterprise_wallets_view(enterprise_id);
CREATE INDEX idx_wallet_trans_owner ON read_model.wallet_transactions_view(owner_id, owner_type);
CREATE INDEX idx_wallet_trans_created ON read_model.wallet_transactions_view(created_at);
