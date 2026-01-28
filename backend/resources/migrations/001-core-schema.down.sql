-- ============================================
-- Migration 001: Rollback Core Schema
-- ============================================

DROP TABLE IF EXISTS core.appointments CASCADE;
DROP TABLE IF EXISTS core.services CASCADE;
DROP TABLE IF EXISTS core.professionals CASCADE;
DROP TABLE IF EXISTS core.pets CASCADE;
DROP TABLE IF EXISTS core.users CASCADE;
DROP TABLE IF EXISTS core.tenants CASCADE;

