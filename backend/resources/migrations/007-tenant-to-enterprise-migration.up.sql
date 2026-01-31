-- ============================================
-- Migration 007: Tenant → Enterprise Rename
-- ============================================

-- Renomear tabela tenants para enterprises
ALTER TABLE core.tenants RENAME TO enterprises;

-- Adicionar campos de geolocalização para busca por proximidade
ALTER TABLE core.enterprises 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Renomear colunas tenant_id para enterprise_id em todas as tabelas
ALTER TABLE core.users RENAME COLUMN tenant_id TO enterprise_id;
ALTER TABLE core.pets DROP COLUMN IF EXISTS tenant_id;
ALTER TABLE core.professionals RENAME COLUMN tenant_id TO enterprise_id;
ALTER TABLE core.services RENAME COLUMN tenant_id TO enterprise_id;
ALTER TABLE core.appointments RENAME COLUMN tenant_id TO enterprise_id;

-- Atualizar constraints em users
ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_tenant_id_fkey;
ALTER TABLE core.users ADD CONSTRAINT users_enterprise_id_fkey 
    FOREIGN KEY (enterprise_id) REFERENCES core.enterprises(id) ON DELETE CASCADE;

-- Atualizar constraints em professionals
ALTER TABLE core.professionals DROP CONSTRAINT IF EXISTS professionals_tenant_id_fkey;
ALTER TABLE core.professionals ADD CONSTRAINT professionals_enterprise_id_fkey 
    FOREIGN KEY (enterprise_id) REFERENCES core.enterprises(id) ON DELETE CASCADE;

-- Atualizar constraints em services
ALTER TABLE core.services DROP CONSTRAINT IF EXISTS services_tenant_id_fkey;
ALTER TABLE core.services ADD CONSTRAINT services_enterprise_id_fkey 
    FOREIGN KEY (enterprise_id) REFERENCES core.enterprises(id) ON DELETE CASCADE;

-- Atualizar constraints em appointments
ALTER TABLE core.appointments DROP CONSTRAINT IF EXISTS appointments_tenant_id_fkey;
ALTER TABLE core.appointments ADD CONSTRAINT appointments_enterprise_id_fkey 
    FOREIGN KEY (enterprise_id) REFERENCES core.enterprises(id) ON DELETE CASCADE;

-- Recriar índices com novo nome
DROP INDEX IF EXISTS core.idx_users_tenant;
DROP INDEX IF EXISTS core.idx_pets_tenant;
DROP INDEX IF EXISTS core.idx_professionals_tenant;
DROP INDEX IF EXISTS core.idx_services_tenant;
DROP INDEX IF EXISTS core.idx_appointments_tenant;

CREATE INDEX IF NOT EXISTS idx_users_enterprise ON core.users(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_professionals_enterprise ON core.professionals(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_services_enterprise ON core.services(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_appointments_enterprise ON core.appointments(enterprise_id);

-- Índice para busca geoespacial
CREATE INDEX IF NOT EXISTS idx_enterprises_location ON core.enterprises(latitude, longitude);
