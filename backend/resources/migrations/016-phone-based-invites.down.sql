-- ============================================
-- Migration 016: Rollback - Reverter mudanças em invite_requests
-- ============================================

-- Remover índices
DROP INDEX IF EXISTS core.idx_invite_requests_phone_pending;
DROP INDEX IF EXISTS core.idx_invite_requests_phone;

-- Adicionar password_hash de volta
ALTER TABLE core.invite_requests 
ADD COLUMN password_hash VARCHAR(255);

-- Remover coluna phone
ALTER TABLE core.invite_requests 
DROP COLUMN IF EXISTS phone;
