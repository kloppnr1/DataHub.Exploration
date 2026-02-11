-- Add 'cancellation_pending' process status and cancel_correlation_id column
-- for tracking BRS-003 cancellation requests awaiting DataHub RSM-009 acknowledgement

ALTER TABLE lifecycle.process_request
    ADD COLUMN IF NOT EXISTS cancel_correlation_id TEXT;

CREATE INDEX idx_process_request_cancel_correlation ON lifecycle.process_request (cancel_correlation_id)
    WHERE cancel_correlation_id IS NOT NULL;

ALTER TABLE lifecycle.process_request
    DROP CONSTRAINT IF EXISTS process_request_status_check;

ALTER TABLE lifecycle.process_request
    ADD CONSTRAINT process_request_status_check CHECK (status IN (
        'pending', 'sent_to_datahub', 'acknowledged', 'rejected',
        'effectuation_pending', 'completed', 'cancelled',
        'offboarding', 'final_settled', 'cancellation_pending'
    ));

-- Add 'cancellation_pending' to signup status constraint
ALTER TABLE portfolio.signup
    DROP CONSTRAINT IF EXISTS signup_status_check;

ALTER TABLE portfolio.signup
    ADD CONSTRAINT signup_status_check CHECK (status IN (
        'registered', 'processing', 'awaiting_effectuation',
        'active', 'rejected', 'cancelled', 'cancellation_pending'
    ));
