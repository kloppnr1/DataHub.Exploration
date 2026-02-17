# Wattzon - Project Memory

## Domain: Danish Electricity Settlement

### What Settlement Is
Settlement (afregning) = calculating what a customer owes for electricity in a billing period.
Per-hour calculation: energy (spot + margin) + grid tariff + system tariff + transmission tariff + electricity tax + subscriptions, then 25% VAT.

### Settlement Triggers — What Actually Drives Settlement
Settlement is driven by **calendar + data completeness**, NOT by BRS process completion:

1. **Metering data arrives daily** via RSM-012 on the Timeseries queue — DataHub pushes it automatically, we do NOT request it per metering point
2. **Settlement runs after the billing period closes** (e.g., after January ends) and all hours have data
3. **BRS processes (supplier switch, move-in, etc.) determine when a metering point enters/leaves our portfolio** — they are NOT settlement triggers

Once a metering point is active in our portfolio, metering data flows in daily without us asking for it. The settlement question is simply: "For each active metering point, for each closed billing period — do we have all the metering data? If yes, settle."

### Scale Concern: 80,000 Metering Points
Checking data completeness individually for 80K metering points is expensive. The system should NOT iterate one-by-one with individual COUNT queries every few minutes. Consider set-based approaches (single SQL query that finds all ready-to-settle metering points) leveraging TimescaleDB indexes on `(metering_point_id, timestamp)`.

### Monitoring vs Settlement — Separate Concerns
- **Data readiness monitoring** (do we have what we need?) is separate from **settlement execution** (calculate and invoice)
- A daily readiness monitor checking all 80K points naively would be too heavy
- The existing polling architecture checks one-at-a-time which doesn't scale

### Key Business Rules
- **Flex settlement (most common):** Monthly billing on actual consumption
- **Aconto (quarterly):** Prepayment reconciled against actuals each quarter
- **Final settlement:** When customer leaves — must invoice within 4 weeks (§17)
- **Corrections:** Can arrive up to 3 years later, trigger delta recalculation
- **Elvarme:** Reduced tax above 4,000 kWh/year threshold
- **Solar (E18):** Hourly net settlement, negative hours credited at spot price only
- **Rounding:** Danish standard MidpointRounding.ToEven (banker's rounding)

### Settlement Calculation Order
1. Energy (Spot + Margin) — kWh × (Nordpool price + supplier margin)
2. Grid tariff (nettarif) — kWh × grid company rate (time-differentiated)
3. System tariff (systemtarif) — kWh × Energinet system rate
4. Transmission tariff — kWh × Energinet transmission rate
5. Electricity tax (elafgift) — kWh × statutory rate
6. Grid subscription — Fixed monthly, pro-rated by days
7. Supplier subscription — Fixed monthly, pro-rated by days
8. VAT (moms) — 25% of lines 1-7

### DataHub Integration
- **Inbound queues:** Timeseries (RSM-012 metering), MasterData (RSM-022/007), Charges (tariffs), Aggregations
- **RSM-012:** Daily metering data delivery — no explicit correction flag, detect by comparing against stored data
- **RSM-007:** Activation confirmation — the sole trigger for marking a metering point as active
- **Queue pattern:** Peek → Process → Dequeue, with retry/dead-letter handling

### Architecture Decisions
- **Clean Architecture:** Domain logic isolated from infrastructure
- **PostgreSQL + TimescaleDB:** Monthly hypertable chunking, compression after 3 months, 5-year retention
- **Dapper over EF Core:** Explicit SQL, no hidden N+1, full control over time-series queries
- **IClock abstraction:** Enables time-travel in simulator without waiting real time
- **Advisory locks:** Prevent concurrent settlement for same (GSRN, period)

### Documentation Location
All docs are in `/home/user/Wattzon/docs/` organized by category:
- `2-business-context/` — Settlement overview, market rules, billing, customer lifecycle, edge cases
- `3-architecture/` — Database model, class diagrams, sequence diagrams
- `4-integration/` — DataHub queues, BRS/RSM reference, RSM-012 format, auth
- `5-planning/` — Next phase plan, implementation plans, proposed architecture
- `DataHub.Settlement/ARCHITECTURE.md` — Current system design decisions (primary technical doc)

### Golden Master Tests
10 hand-calculated reference invoices (GM#1–GM#10) covering: full month, partial period, aconto, final settlement, correction, erroneous switch, elvarme, solar, correction filtered to supply period, tariff change mid-period.
