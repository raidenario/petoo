-- ============================================
-- Migration 015: Rollback - Remover tabela invite_requests
-- ============================================

DROP INDEX IF EXISTS core.idx_invite_requests_code;
DROP INDEX IF EXISTS core.idx_invite_requests_email;
DROP INDEX IF EXISTS core.idx_invite_requests_status;
DROP TABLE IF EXISTS core.invite_requests;
