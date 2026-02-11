-- Remove cancel_correlation_id column — pre-effective-date cancellation (RSM-003)
-- uses the same correlation ID as the original BRS-001 process
DROP INDEX IF EXISTS lifecycle.idx_process_request_cancel_correlation;
ALTER TABLE lifecycle.process_request DROP COLUMN IF EXISTS cancel_correlation_id;
