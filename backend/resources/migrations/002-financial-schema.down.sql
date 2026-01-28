-- ============================================
-- Migration 002: Rollback Financial Schema
-- ============================================

DROP TRIGGER IF EXISTS ledger_immutable_trigger ON financial.ledger_entries;
DROP FUNCTION IF EXISTS financial.prevent_ledger_modification();
DROP TABLE IF EXISTS financial.ledger_entries CASCADE;
DROP TABLE IF EXISTS financial.transactions CASCADE;
DROP TABLE IF EXISTS financial.wallets CASCADE;

