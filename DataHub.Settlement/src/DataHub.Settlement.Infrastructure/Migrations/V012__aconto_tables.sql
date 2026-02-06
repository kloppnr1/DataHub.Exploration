CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE billing.aconto_payment (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gsrn            TEXT NOT NULL,
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    amount          NUMERIC(12,2) NOT NULL,
    paid_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CHECK (period_end > period_start)
);

CREATE INDEX idx_aconto_payment_gsrn ON billing.aconto_payment (gsrn);
CREATE INDEX idx_aconto_payment_period ON billing.aconto_payment (gsrn, period_start, period_end);
