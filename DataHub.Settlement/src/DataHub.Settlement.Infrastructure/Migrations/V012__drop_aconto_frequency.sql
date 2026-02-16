ALTER TABLE portfolio.signup DROP COLUMN IF EXISTS aconto_frequency;
ALTER TABLE portfolio.contract DROP COLUMN IF EXISTS aconto_frequency;

-- Restrict billing_frequency to valid invoicing cadences (remove 'daily' if present)
UPDATE portfolio.signup SET billing_frequency = 'monthly' WHERE billing_frequency NOT IN ('weekly', 'monthly', 'quarterly');
UPDATE portfolio.contract SET billing_frequency = 'monthly' WHERE billing_frequency NOT IN ('weekly', 'monthly', 'quarterly');
