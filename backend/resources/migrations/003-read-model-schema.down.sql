-- ============================================
-- Migration 003: Rollback Read Model Schema
-- ============================================

DROP TABLE IF EXISTS read_model.tenant_dashboard_view CASCADE;
DROP TABLE IF EXISTS read_model.schedule_slots_view CASCADE;
DROP TABLE IF EXISTS read_model.appointments_view CASCADE;

