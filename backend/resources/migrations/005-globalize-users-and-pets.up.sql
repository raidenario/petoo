-- ============================================
-- Migration 005: Globalization of Users and Pets
-- Alinha as tabelas para o modelo de Plataforma (iFood-style)
-- ============================================

-- 1. Globalizar Usuários
-- Remover restrição de unicidade (tenant_id, email)
ALTER TABLE core.users DROP CONSTRAINT users_tenant_id_email_key;

-- Adicionar restrição de unicidade apenas por email (Global)
ALTER TABLE core.users ADD CONSTRAINT users_email_key UNIQUE (email);

-- Tornar tenant_id opcional (pois o usuário pode se cadastrar na plataforma antes de acessar um tenant)
ALTER TABLE core.users ALTER COLUMN tenant_id DROP NOT NULL;

-- 2. Globalizar Pets
-- Tornar tenant_id opcional (um pet pertence a um usuário, não apenas a uma clínica específica)
ALTER TABLE core.pets ALTER COLUMN tenant_id DROP NOT NULL;

-- 3. Integridade de Profissionais
-- Um usuário só pode ser cadastrado como profissional uma vez por tenant
ALTER TABLE core.professionals ADD CONSTRAINT professionals_tenant_user_key UNIQUE (tenant_id, user_id);
