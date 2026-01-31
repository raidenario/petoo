-- ============================================
-- Migration 014: Pet Care Status (Rollback)
-- ============================================

-- Remove indexes
DROP INDEX IF EXISTS core.idx_pets_in_care;
DROP INDEX IF EXISTS core.idx_pets_current_appointment;
DROP INDEX IF EXISTS core.idx_appointments_care_start;
DROP INDEX IF EXISTS core.idx_appointments_care_end;

-- Remove columns from pets
ALTER TABLE core.pets DROP CONSTRAINT IF EXISTS pets_current_appointment_fkey;
ALTER TABLE core.pets DROP COLUMN IF EXISTS current_appointment_id;
ALTER TABLE core.pets DROP COLUMN IF EXISTS care_started_at;

-- Restore original pets status constraint (without IN_CARE)
ALTER TABLE core.pets DROP CONSTRAINT IF EXISTS pets_status_check;

-- Restore original appointments status constraint (without IN_PROGRESS)
ALTER TABLE core.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE core.appointments ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'));
