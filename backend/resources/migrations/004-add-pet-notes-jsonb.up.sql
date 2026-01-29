-- ============================================
-- Migration 004: Pet Notes JSONB
-- Convert notes to JSONB and add medical_notes
-- ============================================

-- Primeiro, convertemos a coluna notes de TEXT para JSONB
-- Usamos USING para converter o texto existente em um objeto JSON (se não for nulo)
ALTER TABLE core.pets 
ALTER COLUMN notes DROP DEFAULT,
ALTER COLUMN notes TYPE JSONB USING (
    CASE 
        WHEN notes IS NULL OR notes = '' THEN '{}'::jsonb 
        ELSE jsonb_build_object('text', notes) 
    END
),
ALTER COLUMN notes SET DEFAULT '{}'::jsonb;

-- Adicionamos a nova coluna medical_notes
ALTER TABLE core.pets 
ADD COLUMN medical_notes JSONB DEFAULT '{}'::jsonb;
