-- ============================================
-- Migration 007 DOWN: Enterprise → Tenant Rollback
-- ============================================

-- Remover índices novos
DROP INDEX IF EXISTS core.idx_enterprises_location;
DROP INDEX IF EXISTS core.idx_users_enterprise;
DROP INDEX IF EXISTS core.idx_professionals_enterprise;
DROP INDEX IF EXISTS core.idx_services_enterprise;
DROP INDEX IF EXISTS core.idx_appointments_enterprise;

-- Renomear colunas enterprise_id de volta para tenant_id
ALTER TABLE core.users RENAME COLUMN enterprise_id TO tenant_id;
ALTER TABLE core.professionals RENAME COLUMN enterprise_id TO tenant_id;
ALTER TABLE core.services RENAME COLUMN enterprise_id TO tenant_id;
ALTER TABLE core.appointments RENAME COLUMN enterprise_id TO tenant_id;

-- Remover campos de geolocalização
ALTER TABLE core.enterprises 
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude;

-- Renomear tabela de volta
ALTER TABLE core.enterprises RENAME TO tenants;

-- Recriar índices antigos
CREATE INDEX IF NOT EXISTS idx_users_tenant ON core.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_professionals_tenant ON core.professionals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON core.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON core.appointments(tenant_id);
