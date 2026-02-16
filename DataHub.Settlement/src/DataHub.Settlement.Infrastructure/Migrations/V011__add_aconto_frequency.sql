ALTER TABLE portfolio.signup ADD COLUMN aconto_frequency TEXT
    CHECK (aconto_frequency IS NULL OR aconto_frequency IN ('monthly', 'quarterly'));

ALTER TABLE portfolio.contract ADD COLUMN aconto_frequency TEXT
    CHECK (aconto_frequency IS NULL OR aconto_frequency IN ('monthly', 'quarterly'));
