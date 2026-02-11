-- BRS-021 alignment: add registration timestamp and tighten constraints

-- 1. Add registration_timestamp column (nullable for backward compat with existing rows)
ALTER TABLE metering.metering_data
    ADD COLUMN registration_timestamp TIMESTAMPTZ;

-- 2. Remove P1M from resolution CHECK (BRS-021 only allows PT15M and PT1H)
ALTER TABLE metering.metering_data
    DROP CONSTRAINT metering_data_resolution_check;

ALTER TABLE metering.metering_data
    ADD CONSTRAINT metering_data_resolution_check CHECK (resolution IN ('PT15M', 'PT1H'));

-- 3. Allow NULL quality_code for measured data (no quality element in CIM)
ALTER TABLE metering.metering_data
    ALTER COLUMN quality_code DROP NOT NULL;

ALTER TABLE metering.metering_data
    DROP CONSTRAINT metering_data_quality_code_check;

ALTER TABLE metering.metering_data
    ADD CONSTRAINT metering_data_quality_code_check CHECK (quality_code IS NULL OR quality_code IN ('A01', 'A02', 'A03', 'A06'));
