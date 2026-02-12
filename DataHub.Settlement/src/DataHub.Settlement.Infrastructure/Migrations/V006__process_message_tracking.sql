-- V006: Track which BRS-001 process messages have been received
-- RSM-028 (customer data) and RSM-031 (tariff attachments) may arrive before or after RSM-022 (activation).
-- These flags make missing data visible at activation time and support dead-letter retry.

ALTER TABLE lifecycle.process_request
  ADD COLUMN customer_data_received BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN tariff_data_received   BOOLEAN NOT NULL DEFAULT false;
