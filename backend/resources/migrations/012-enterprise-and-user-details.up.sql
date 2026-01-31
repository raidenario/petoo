-- ============================================
-- Migration 012: Enterprise and User Details
-- ============================================

-- 1. Updates to core.enterprises
ALTER TABLE core.enterprises
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18),
ADD COLUMN IF NOT EXISTS service_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS availability JSONB,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS registration_date TIMESTAMPTZ DEFAULT NOW();

-- Create unique index for CNPJ (ignoring nulls initially if needed, but unique if present)
CREATE UNIQUE INDEX IF NOT EXISTS idx_enterprises_cnpj ON core.enterprises(cnpj) WHERE cnpj IS NOT NULL;

-- 2. Updates to core.users (for Employees/Professionals)
ALTER TABLE core.users
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
ADD COLUMN IF NOT EXISTS hiring_date DATE,
ADD COLUMN IF NOT EXISTS employee_status VARCHAR(50) DEFAULT 'ACTIVE';

-- Create unique index for CPF
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf ON core.users(cpf) WHERE cpf IS NOT NULL;

-- 3. Updates to core.clients (Pet Owners)
-- Prompt asked for "customer should have registration date". 
-- Assuming `created_at` covers it, but adding explicit business field if distinct.
-- Let's stick with `created_at` as the system registration, but we can add an alias column or just rely on created_at.
-- The entities schemas will map this. No DB change needed for client date if created_at is sufficient.
