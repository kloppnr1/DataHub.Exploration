-- Make customer_id nullable in signup table
-- Customers should only be created when signup reaches active state

ALTER TABLE portfolio.signup
    ALTER COLUMN customer_id DROP NOT NULL;

-- Add customer info fields so we can create customer later
ALTER TABLE portfolio.signup
    ADD COLUMN customer_name TEXT,
    ADD COLUMN customer_cpr_cvr TEXT,
    ADD COLUMN customer_contact_type TEXT CHECK (customer_contact_type IN ('person', 'company'));

-- Backfill existing signups with customer data
UPDATE portfolio.signup s
SET customer_name = c.name,
    customer_cpr_cvr = c.cpr_cvr,
    customer_contact_type = c.contact_type
FROM portfolio.customer c
WHERE s.customer_id = c.id;

-- Make fields NOT NULL now that they're backfilled
ALTER TABLE portfolio.signup
    ALTER COLUMN customer_name SET NOT NULL,
    ALTER COLUMN customer_cpr_cvr SET NOT NULL,
    ALTER COLUMN customer_contact_type SET NOT NULL;

-- Add index for signups without customers (to find pending customer creation)
CREATE INDEX idx_signup_no_customer ON portfolio.signup (id)
    WHERE customer_id IS NULL AND status IN ('registered', 'processing');
