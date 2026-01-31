-- ============================================
-- Migration 009 DOWN: Remove Logo from Enterprise
-- ============================================

ALTER TABLE core.enterprises 
DROP COLUMN IF EXISTS logo_url;
