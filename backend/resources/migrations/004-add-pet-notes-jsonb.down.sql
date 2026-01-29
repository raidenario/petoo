-- Rollback migration 004
ALTER TABLE core.pets DROP COLUMN medical_notes;

ALTER TABLE core.pets 
ALTER COLUMN notes TYPE TEXT USING (notes->>'text');
