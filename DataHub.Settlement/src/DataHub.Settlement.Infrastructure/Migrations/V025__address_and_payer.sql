-- V025: Billing address on customer + payer entity
-- Supports: customer lives at one address, supply at another, payer may be a third party

-- 1. Add billing address fields to customer
ALTER TABLE portfolio.customer
    ADD COLUMN IF NOT EXISTS billing_street TEXT,
    ADD COLUMN IF NOT EXISTS billing_house_number TEXT,
    ADD COLUMN IF NOT EXISTS billing_floor TEXT,
    ADD COLUMN IF NOT EXISTS billing_door TEXT,
    ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
    ADD COLUMN IF NOT EXISTS billing_city TEXT;

-- 2. Payer table: the entity that pays the invoice (may differ from customer)
CREATE TABLE portfolio.payer (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    cpr_cvr             TEXT NOT NULL,
    contact_type        TEXT NOT NULL CHECK (contact_type IN ('private', 'business')),
    email               TEXT,
    phone               TEXT,
    billing_street      TEXT,
    billing_house_number TEXT,
    billing_floor       TEXT,
    billing_door        TEXT,
    billing_postal_code TEXT,
    billing_city        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payer_cpr_cvr ON portfolio.payer (cpr_cvr);

-- 3. Link payer to contract (nullable — NULL means customer is the payer)
ALTER TABLE portfolio.contract
    ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES portfolio.payer(id);

-- 4. Link payer to invoice (nullable — NULL means customer is the payer)
ALTER TABLE invoicing.invoice
    ADD COLUMN IF NOT EXISTS payer_id UUID REFERENCES portfolio.payer(id);

-- 5. Add billing address fields to signup (captured at signup, copied to customer on activation)
ALTER TABLE portfolio.signup
    ADD COLUMN IF NOT EXISTS billing_street TEXT,
    ADD COLUMN IF NOT EXISTS billing_house_number TEXT,
    ADD COLUMN IF NOT EXISTS billing_floor TEXT,
    ADD COLUMN IF NOT EXISTS billing_door TEXT,
    ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
    ADD COLUMN IF NOT EXISTS billing_city TEXT,
    ADD COLUMN IF NOT EXISTS payer_name TEXT,
    ADD COLUMN IF NOT EXISTS payer_cpr_cvr TEXT,
    ADD COLUMN IF NOT EXISTS payer_contact_type TEXT CHECK (payer_contact_type IS NULL OR payer_contact_type IN ('person', 'company')),
    ADD COLUMN IF NOT EXISTS payer_email TEXT,
    ADD COLUMN IF NOT EXISTS payer_phone TEXT,
    ADD COLUMN IF NOT EXISTS payer_billing_street TEXT,
    ADD COLUMN IF NOT EXISTS payer_billing_house_number TEXT,
    ADD COLUMN IF NOT EXISTS payer_billing_floor TEXT,
    ADD COLUMN IF NOT EXISTS payer_billing_door TEXT,
    ADD COLUMN IF NOT EXISTS payer_billing_postal_code TEXT,
    ADD COLUMN IF NOT EXISTS payer_billing_city TEXT;
