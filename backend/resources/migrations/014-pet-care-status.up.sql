-- ============================================
-- Migration 014: Pet Care Status (REPLACED 013 due to collision)
-- Adds IN_CARE status and care tracking columns
-- ============================================

-- 1. Update pets status CHECK constraint to include IN_CARE
ALTER TABLE core.pets DROP CONSTRAINT IF EXISTS pets_status_check;
ALTER TABLE core.pets ADD CONSTRAINT pets_status_check 
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'DECEASED', 'IN_CARE'));

-- 2. Track current care appointment
ALTER TABLE core.pets ADD COLUMN IF NOT EXISTS current_appointment_id UUID;
ALTER TABLE core.pets ADD COLUMN IF NOT EXISTS care_started_at TIMESTAMPTZ;

-- 3. Add foreign key for current_appointment_id
ALTER TABLE core.pets DROP CONSTRAINT IF EXISTS pets_current_appointment_fkey;
ALTER TABLE core.pets ADD CONSTRAINT pets_current_appointment_fkey 
    FOREIGN KEY (current_appointment_id) REFERENCES core.appointments(id) ON DELETE SET NULL;

-- 4. Index for finding pets in care
CREATE INDEX IF NOT EXISTS idx_pets_in_care ON core.pets(status) WHERE status = 'IN_CARE';
CREATE INDEX IF NOT EXISTS idx_pets_current_appointment ON core.pets(current_appointment_id) WHERE current_appointment_id IS NOT NULL;

-- 5. Add IN_PROGRESS status to appointments for when service is active
ALTER TABLE core.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
ALTER TABLE core.appointments ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'CANCELLED', 'COMPLETED', 'NO_SHOW'));

-- 6. Index for finding appointments that need status transition
CREATE INDEX IF NOT EXISTS idx_appointments_care_start 
    ON core.appointments(start_time) 
    WHERE status = 'CONFIRMED';

CREATE INDEX IF NOT EXISTS idx_appointments_care_end 
    ON core.appointments(end_time) 
    WHERE status = 'IN_PROGRESS';
