-- Rollback migration 005
ALTER TABLE core.pets ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE core.users ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE core.users DROP CONSTRAINT users_email_key;
ALTER TABLE core.users ADD CONSTRAINT users_tenant_id_email_key UNIQUE (tenant_id, email);

ALTER TABLE core.professionals DROP CONSTRAINT professionals_tenant_user_key;
