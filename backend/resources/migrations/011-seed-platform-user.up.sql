-- ============================================
-- Migration 011: Seed PLATFORM User (PETOO)
-- ============================================

-- 1. Atualizar a constraint de roles para incluir PLATFORM
ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE core.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('MASTER', 'ADMIN', 'EMPLOYEE', 'CUSTOMER', 'STAFF', 'PLATFORM', 'CLIENT'));

-- 2. Inserir ou Atualizar o usuário PLATFORM padrão (PETOO)
-- Password: testeDEV
-- Phone: 4466
-- Usando um hash BCrypt padrão que o Buddy aceita universalmente
INSERT INTO core.users (
    id, 
    email, 
    password_hash, 
    name, 
    phone, 
    role, 
    status
) VALUES (
    '00000000-0000-4000-a000-000000000000', 
    'petoo@petoo.com.br', 
    '$2a$12$LQv3c1yqBWVHxkdZz0E.M.9Y7A0zX8Gq/W6z7O9Q5L0/1YjXzYm6.', 
    'PETOO Platform Admin', 
    '4466', 
    'PLATFORM', 
    'ACTIVE'
) 
ON CONFLICT (email) 
DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = 'ACTIVE';
