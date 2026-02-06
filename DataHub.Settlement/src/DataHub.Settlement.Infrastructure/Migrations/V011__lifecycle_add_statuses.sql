-- Add 'offboarding' and 'final_settled' statuses to lifecycle.process_request
ALTER TABLE lifecycle.process_request
    DROP CONSTRAINT IF EXISTS process_request_status_check;

ALTER TABLE lifecycle.process_request
    ADD CONSTRAINT process_request_status_check CHECK (status IN (
        'pending', 'sent_to_datahub', 'acknowledged', 'rejected',
        'effectuation_pending', 'completed', 'cancelled',
        'offboarding', 'final_settled'
    ));
