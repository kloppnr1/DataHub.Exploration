-- Add batch grouping, metadata columns, and indexes to correction_settlement

ALTER TABLE settlement.correction_settlement
    ADD COLUMN correction_batch_id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN trigger_type TEXT NOT NULL DEFAULT 'manual',
    ADD COLUMN status TEXT NOT NULL DEFAULT 'completed',
    ADD COLUMN vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN note TEXT;

ALTER TABLE settlement.correction_settlement
    ADD CONSTRAINT chk_trigger_type CHECK (trigger_type IN ('manual', 'auto')),
    ADD CONSTRAINT chk_status CHECK (status IN ('completed', 'failed'));

CREATE INDEX idx_correction_batch_id
    ON settlement.correction_settlement (correction_batch_id);

CREATE INDEX idx_correction_original_run
    ON settlement.correction_settlement (original_run_id)
    WHERE original_run_id IS NOT NULL;

CREATE INDEX idx_correction_created_at
    ON settlement.correction_settlement (created_at DESC);
