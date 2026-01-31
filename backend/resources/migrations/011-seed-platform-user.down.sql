-- ============================================
-- Migration 011: Seed PLATFORM User (Rollback)
-- ============================================

DELETE FROM core.users WHERE role = 'PLATFORM' AND phone = '4466';

ALTER TABLE core.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE core.users ADD CONSTRAINT users_role_check 
    CHECK (role IN ('MASTER', 'ADMIN', 'EMPLOYEE', 'CUSTOMER', 'STAFF'));
