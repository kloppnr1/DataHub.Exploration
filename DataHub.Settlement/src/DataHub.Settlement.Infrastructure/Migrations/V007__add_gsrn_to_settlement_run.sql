ALTER TABLE settlement.settlement_run ADD COLUMN metering_point_id TEXT;

UPDATE settlement.settlement_run sr SET metering_point_id = (
    SELECT DISTINCT sl.metering_point_id FROM settlement.settlement_line sl
    WHERE sl.settlement_run_id = sr.id LIMIT 1
);

ALTER TABLE settlement.settlement_run ALTER COLUMN metering_point_id SET NOT NULL;

CREATE UNIQUE INDEX idx_settlement_run_mp_period
    ON settlement.settlement_run (metering_point_id, billing_period_id)
    WHERE status = 'completed';
