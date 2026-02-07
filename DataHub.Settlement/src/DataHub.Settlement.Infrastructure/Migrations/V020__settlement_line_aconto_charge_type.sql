-- Add 'aconto' to the settlement_line charge_type check constraint
ALTER TABLE settlement.settlement_line
    DROP CONSTRAINT settlement_line_charge_type_check;

ALTER TABLE settlement.settlement_line
    ADD CONSTRAINT settlement_line_charge_type_check
    CHECK (charge_type IN (
        'energy', 'grid_tariff', 'system_tariff', 'transmission_tariff',
        'electricity_tax', 'grid_subscription', 'supplier_subscription',
        'aconto'
    ));
