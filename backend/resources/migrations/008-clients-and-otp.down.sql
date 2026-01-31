-- ============================================
-- Migration 008 DOWN: Remove Clients e OTP
-- ============================================

-- Remover trigger
DROP TRIGGER IF EXISTS update_clients_updated_at ON core.clients;

-- Remover índices
DROP INDEX IF EXISTS core.idx_clients_phone;
DROP INDEX IF EXISTS core.idx_clients_location;
DROP INDEX IF EXISTS core.idx_otp_phone_expires;
DROP INDEX IF EXISTS core.idx_pets_client;
DROP INDEX IF EXISTS core.idx_appointments_client;

-- Remover colunas adicionadas
ALTER TABLE core.appointments DROP COLUMN IF EXISTS client_id;
ALTER TABLE core.pets DROP COLUMN IF EXISTS client_id;

-- Remover constraint de role atualizada
ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE core.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('CUSTOMER', 'ADMIN', 'STAFF'));

-- Remover tabelas
DROP TABLE IF EXISTS core.otp_tokens;
DROP TABLE IF EXISTS core.clients;
