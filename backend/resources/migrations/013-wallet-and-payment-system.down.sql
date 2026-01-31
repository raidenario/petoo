-- ============================================
-- Rollback Migration 013: Wallet and Payment System
-- ============================================

DROP TABLE IF EXISTS read_model.wallet_transactions_view;
DROP TABLE IF EXISTS read_model.enterprise_wallets_view;
DROP TABLE IF EXISTS read_model.user_wallets_view;

ALTER TABLE financial.transactions DROP COLUMN IF EXISTS source_type;
ALTER TABLE financial.transactions DROP COLUMN IF EXISTS enterprise_id;
ALTER TABLE financial.transactions DROP COLUMN IF EXISTS user_id;

DROP TABLE IF EXISTS financial.wallet_deposits;
DROP TABLE IF EXISTS financial.payment_methods;

ALTER TABLE financial.wallets DROP CONSTRAINT wallets_owner_type_check;
ALTER TABLE financial.wallets ADD CONSTRAINT wallets_owner_type_check 
    CHECK (owner_type IN ('TENANT', 'PLATFORM'));
