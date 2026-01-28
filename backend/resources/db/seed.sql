-- ============================================
-- Seed Data for Development
-- Execute this AFTER migrations
-- ============================================

-- Tenant demo
INSERT INTO core.tenants (id, name, slug, theme_config, commission_rate)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'PetAgita Demo', 'petagita-demo', 
       '{"primaryColor": "#8b5cf6", "secondaryColor": "#06b6d4", "logo": null}'::jsonb, 
       0.10
WHERE NOT EXISTS (SELECT 1 FROM core.tenants WHERE slug = 'petagita-demo');

-- Services demo
INSERT INTO core.services (tenant_id, name, description, category, price_cents, duration_minutes)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Banho Simples', 'Banho com shampoo neutro', 'BANHO', 5000, 30
WHERE NOT EXISTS (SELECT 1 FROM core.services WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Banho Simples');

INSERT INTO core.services (tenant_id, name, description, category, price_cents, duration_minutes)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Banho + Tosa Higiênica', 'Banho completo com tosa higiênica', 'BANHO', 8000, 60
WHERE NOT EXISTS (SELECT 1 FROM core.services WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Banho + Tosa Higiênica');

INSERT INTO core.services (tenant_id, name, description, category, price_cents, duration_minutes)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tosa Completa', 'Tosa na máquina ou tesoura', 'TOSA', 12000, 90
WHERE NOT EXISTS (SELECT 1 FROM core.services WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Tosa Completa');

INSERT INTO core.services (tenant_id, name, description, category, price_cents, duration_minutes)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Consulta Veterinária', 'Consulta com veterinário', 'VETERINARIO', 15000, 30
WHERE NOT EXISTS (SELECT 1 FROM core.services WHERE tenant_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND name = 'Consulta Veterinária');

-- Financial wallets
INSERT INTO financial.wallets (id, owner_id, owner_type, balance_cents)
SELECT '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'PLATFORM', 0
WHERE NOT EXISTS (SELECT 1 FROM financial.wallets WHERE owner_id = '00000000-0000-0000-0000-000000000000' AND owner_type = 'PLATFORM');

INSERT INTO financial.wallets (owner_id, owner_type, balance_cents)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'TENANT', 0
WHERE NOT EXISTS (SELECT 1 FROM financial.wallets WHERE owner_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' AND owner_type = 'TENANT');

