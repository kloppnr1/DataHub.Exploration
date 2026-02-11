CREATE TABLE IF NOT EXISTS portfolio.customer_data_staging (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gsrn            TEXT NOT NULL,
    customer_name   TEXT NOT NULL,
    cpr_cvr         TEXT,
    customer_type   TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    correlation_id  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customer_staging_gsrn ON portfolio.customer_data_staging (gsrn);
