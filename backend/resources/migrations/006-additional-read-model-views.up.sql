-- ============================================
-- Migration 006: Additional Read Model Views
-- Completing the Read Model for Optimized Queries
-- ============================================

-- 1. PETS_VIEW (Prontuário e Listagem Rápida)
CREATE TABLE read_model.pets_view (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    tenant_id UUID, -- Opcional no modelo global
    
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    {
        "id": "uuid",
        "name": "Rex",
        "species": "DOG",
        "breed": "Golden Retriever",
        "owner": {"id": "uuid", "name": "João", "phone": "..."},
        "photoUrl": "...",
        "notes": {...},
        "medicalNotes": {...},
        "lastAppointment": {"id": "uuid", "date": "...", "service": "..."},
        "status": "ACTIVE"
    }
    */
    
    name VARCHAR(255),
    species VARCHAR(100),
    status VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. USERS_VIEW (Clientes do Tenant / Usuários da Plataforma)
CREATE TABLE read_model.users_view (
    id UUID PRIMARY KEY,
    
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    {
        "id": "uuid",
        "name": "João Silva",
        "email": "joao@email.com",
        "phone": "...",
        "avatarUrl": "...",
        "role": "CUSTOMER",
        "tenants": [{"id": "uuid", "name": "PetAgita", "lastVisit": "..."}],
        "pets": [{"id": "uuid", "name": "Rex"}, {"id": "uuid", "name": "Thor"}],
        "totalAppointments": 15
    }
    */
    
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PROFESSIONALS_VIEW (Listagem de Especialistas)
CREATE TABLE read_model.professionals_view (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    {
        "id": "uuid",
        "name": "Dra. Maria",
        "specialty": "Veterinária",
        "avatarUrl": "...",
        "services": [{"id": "uuid", "name": "Consulta"}],
        "availabilitySummary": "Seg-Sex, 08h-18h",
        "rating": 4.9,
        "active": true
    }
    */
    
    name VARCHAR(255),
    specialty VARCHAR(100),
    active BOOLEAN,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. SERVICES_VIEW (Catálogo de Serviços)
CREATE TABLE read_model.services_view (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    {
        "id": "uuid",
        "name": "Banho + Tosa",
        "category": "Estética",
        "priceCents": 8500,
        "durationMinutes": 60,
        "active": true
    }
    */
    
    name VARCHAR(255),
    category VARCHAR(100),
    active BOOLEAN,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TENANTS_VIEW (Discovery/Plataforma)
CREATE TABLE read_model.tenants_view (
    id UUID PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    /*
    {
        "id": "uuid",
        "name": "PetAgita Demo",
        "slug": "petagita-demo",
        "logo": "...",
        "theme": {"primary": "...", "secondary": "..."},
        "address": "...",
        "rating": 4.8,
        "isOpen": true
    }
    */
    
    name VARCHAR(255),
    status VARCHAR(50),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_pets_view_owner ON read_model.pets_view(owner_id);
CREATE INDEX idx_pets_view_tenant ON read_model.pets_view(tenant_id);
CREATE INDEX idx_pets_view_data ON read_model.pets_view USING GIN (data);

CREATE INDEX idx_users_view_email ON read_model.users_view(email);
CREATE INDEX idx_users_view_data ON read_model.users_view USING GIN (data);

CREATE INDEX idx_professionals_view_tenant ON read_model.professionals_view(tenant_id);
CREATE INDEX idx_professionals_view_data ON read_model.professionals_view USING GIN (data);

CREATE INDEX idx_services_view_tenant ON read_model.services_view(tenant_id);
CREATE INDEX idx_services_view_data ON read_model.services_view USING GIN (data);

CREATE INDEX idx_tenants_view_status ON read_model.tenants_view(status);
CREATE INDEX idx_tenants_view_data ON read_model.tenants_view USING GIN (data);
