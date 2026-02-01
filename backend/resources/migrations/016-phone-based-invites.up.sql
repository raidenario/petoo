-- ============================================
-- Migration 016: Reformular invite_requests para autenticação por telefone
-- ============================================

-- Adicionar coluna phone (obrigatória)
ALTER TABLE core.invite_requests 
ADD COLUMN phone VARCHAR(20);

-- Remover password_hash (não mais necessário, login é por OTP)
ALTER TABLE core.invite_requests 
DROP COLUMN IF EXISTS password_hash;

-- Tornar phone obrigatório após adicionar
-- (permite migração de dados existentes se necessário)
ALTER TABLE core.invite_requests 
ALTER COLUMN phone SET NOT NULL;

-- Adicionar índice para busca por telefone
CREATE INDEX IF NOT EXISTS idx_invite_requests_phone ON core.invite_requests(phone);

-- Adicionar constraint para garantir unicidade de telefone em convites PENDING
CREATE UNIQUE INDEX IF NOT EXISTS idx_invite_requests_phone_pending 
ON core.invite_requests(phone) 
WHERE status = 'PENDING';
