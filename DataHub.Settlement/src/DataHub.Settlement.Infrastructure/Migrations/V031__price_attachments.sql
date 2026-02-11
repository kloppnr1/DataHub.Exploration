CREATE TABLE IF NOT EXISTS tariff.metering_point_tariff_attachment (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gsrn        TEXT NOT NULL,
    tariff_id   TEXT NOT NULL,
    tariff_type TEXT NOT NULL,
    valid_from  DATE NOT NULL,
    valid_to    DATE,
    correlation_id TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tariff_attachment_gsrn ON tariff.metering_point_tariff_attachment (gsrn);
