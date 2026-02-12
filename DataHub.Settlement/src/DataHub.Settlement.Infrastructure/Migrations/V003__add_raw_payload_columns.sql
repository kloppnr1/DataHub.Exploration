ALTER TABLE datahub.inbound_message ADD COLUMN raw_payload TEXT;
ALTER TABLE datahub.outbound_request ADD COLUMN raw_payload TEXT;
