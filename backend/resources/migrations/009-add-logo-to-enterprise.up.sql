-- ============================================
-- Migration 009: Add Logo to Enterprise
-- ============================================

ALTER TABLE core.enterprises 
ADD COLUMN IF NOT EXISTS logo_url TEXT;
