-- ============================================
-- PostgreSQL Initialization Script
-- Creates schemas for CQRS architecture
-- ============================================

-- Create schemas
CREATE SCHEMA IF NOT EXISTS core;
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS read_model;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA core TO petoo;
GRANT ALL PRIVILEGES ON SCHEMA financial TO petoo;
GRANT ALL PRIVILEGES ON SCHEMA read_model TO petoo;

-- Set search path
ALTER DATABASE petoo_db SET search_path TO core, financial, read_model, public;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Confirmation
SELECT 'Schemas created: core, financial, read_model' AS status;
