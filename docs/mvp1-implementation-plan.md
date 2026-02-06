# MVP 1 Implementation Plan

One correct invoice: DataHub → ingestion → settlement → verifiable result for a single metering point. Happy path only.

---

## Simulator Strategy

MVP 1 uses an **in-process fake** (`FakeDataHubClient`) behind the same `IDataHubClient` interface the real client will implement. No HTTP server, no Docker networking — just fixture-loaded queues in memory.

The fake supports:
- Timeseries queue (RSM-012 messages from fixture files)
- Charges queue (tariff rate fixtures)
- Peek / dequeue semantics matching the real DataHub API
- Fake token endpoint (returns a hardcoded JWT)
- State reset between tests

The fake does **not** support MasterData, Aggregations, outbound BRS requests, error injection, or HTTP transport. Those come in MVP 2-3.

The `IDataHubClient` abstraction means the transition from fake → HTTP simulator → real DataHub is a configuration change, not a rewrite.

---

## Build Order

Each step produces a testable result before the next one starts.

| # | Component | What it proves |
|---|-----------|---------------|
| 1 | **Solution structure + database** | Docker Compose starts PostgreSQL/TimescaleDB, schema migrations run, CI pipeline builds on push |
| 2 | **IDataHubClient + FakeDataHubClient** | Peek/dequeue lifecycle works in-process with fixture data |
| 3 | **CIM JSON fixtures** | Realistic RSM-012 and Charges messages with hand-calculable values for golden master tests |
| 4 | **CIM parser (RSM-012)** | Raw JSON → domain model extraction (GSRN, period, resolution, points with quantity/quality) |
| 5 | **Auth Manager** | Token caching, proactive renewal, thread-safe concurrent access |
| 6 | **Ingestion pipeline** | Queue poller → parse → store in TimescaleDB → dequeue. Idempotency via MessageId. Dead-lettering on parse failure |
| 7 | **Spot price ingestion** | Mock/file-based Nord Pool prices stored and queryable by hour |
| 8 | **Charges ingestion** | Tariff rates parsed from Charges queue, stored with grid area + time-of-day + validity period |
| 9 | **Settlement engine** | Pure calculation: consumption + spot prices + tariffs + product plan → invoice lines. Verified against hand-calculated golden masters |
| 10 | **End-to-end pipeline test** | Full chain: fake → ingest 30 days → settle January → result matches golden master exactly |

---

## Test Fixtures

All fixtures are version-controlled. Values are chosen for hand-calculability (round numbers).

| Fixture | Content |
|---------|---------|
| `rsm012-single-day.json` | 1 metering point, 1 day, 24 × 1.000 kWh, PT1H, quality A01 |
| `rsm012-multi-day/` (31 files) | Same metering point, full January = 744 kWh total |
| `charges-grid-tariff.json` | Grid area 344: day 0.15, night 0.05 DKK/kWh, subscription 49 DKK/month |
| `charges-system-tariff.json` | System 0.054, transmission 0.049 DKK/kWh |
| `spot-prices-january.json` | 744 hours, all 0.50 DKK/kWh |

Fixtures follow the CIM EDI Guide structure (Dok. 15/00718-191) and are cross-referenced with Energinet's [opengeh-edi](https://github.com/Energinet-DataHub/opengeh-edi) test data.

---

## Golden Master: Full Month Settlement

The core verification that MVP 1 works. All inputs are deterministic, all expected outputs are hand-calculated.

**Input:** January 2025, 744 hours, 1.000 kWh every hour, spot 0.50 DKK/kWh, margin 0.04 DKK/kWh.

| Invoice line | Calculation | Expected |
|-------------|-------------|----------|
| Energy | 744 × (0.50 + 0.04) | 401.76 DKK |
| Grid tariff | 465 day-hours × 0.15 + 279 night-hours × 0.05 | 83.70 DKK |
| System tariff | 744 × 0.054 | 40.18 DKK |
| Transmission tariff | 744 × 0.049 | 36.46 DKK |
| Electricity tax | 744 × 0.008 | 5.95 DKK |
| Grid subscription | 49.00/month | 49.00 DKK |
| Supplier subscription | 39.00/month | 39.00 DKK |
| **Subtotal** | | **656.05 DKK** |
| VAT (25%) | | **164.01 DKK** |
| **Total** | | **820.06 DKK** |

A second golden master covers a partial period (mid-month start) to verify pro-rata subscription handling.

---

## Test Approach

| Layer | What | Dependencies |
|-------|------|-------------|
| Unit tests | CIM parser, settlement engine, auth manager, fake client | None — pure functions and in-memory |
| Integration tests | Ingestion pipeline, spot/charges ingestion | FakeDataHubClient + PostgreSQL |
| End-to-end | Full pipeline from fake through settlement | Everything wired together |

Target: ~60 tests, all under 30 seconds in CI.

**Rounding:** Define once, test explicitly. Full precision during hourly calculations, round to 2 decimal DKK on invoice line totals, VAT on the summed subtotal.

---

## Simulator Evolution (Post-MVP 1)

| MVP | Simulator change |
|-----|-----------------|
| 2 | Standalone HTTP server (ASP.NET Minimal API). MasterData queue, BRS request endpoints, scenario engine |
| 3 | Error injection (401, 503, malformed). Correction scenarios. Aggregations queue. Parallel with real Actor Test |
| 4 | Performance: 80K metering points, realistic timing |

---

## Exit Criteria

- [ ] Docker Compose starts PostgreSQL/TimescaleDB
- [ ] FakeDataHubClient peek/dequeue lifecycle works
- [ ] CIM parser handles all fixture files correctly
- [ ] Ingestion pipeline: 30 days ingested, all messages dequeued, no dead letters
- [ ] Duplicate MessageId is skipped (idempotency)
- [ ] Tariff rates parsed and queryable by grid area + hour
- [ ] Settlement golden master (full month) passes
- [ ] Settlement golden master (partial period) passes
- [ ] End-to-end test: ingest → settle → result matches golden master
- [ ] All tests green in CI

---

## Sources

- [Proposed architecture](datahub3-proposed-architecture.md)
- [RSM-012 reference](rsm-012-datahub3-measure-data.md)
- [Settlement overview](datahub3-settlement-overview.md)
- [Product structure and billing](datahub3-product-and-billing.md)
- [Authentication and security](datahub3-authentication-security.md)
- [Edge cases](datahub3-edge-cases.md)
- [Implementation plan](datahub3-implementation-plan.md)
