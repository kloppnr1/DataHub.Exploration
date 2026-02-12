-- Prevent duplicate invoices for the same contract + period + type.
-- Only applies to non-cancelled invoices (cancelled invoices may be re-issued).
CREATE UNIQUE INDEX idx_invoice_unique_period
ON billing.invoice (contract_id, invoice_type, period_start, period_end)
WHERE status != 'cancelled' AND contract_id IS NOT NULL;
