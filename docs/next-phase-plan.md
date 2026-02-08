# Next Development Phase: MVP 3 Completion + MVP 4 Foundation

Plan for the next phase of DataHub.Settlement development. MVP 3 delivered the core edge-case calculations (corrections, elvarme, solar, erroneous switch — all verified by golden master tests), but several integration-level features and hardening work remain incomplete. MVP 4 introduces production readiness concerns.

This phase bridges the two: close out MVP 3 gaps, then lay the MVP 4 foundation.

---

## Current State Assessment

### MVP 3 — What's Done

| Feature | Status | Evidence |
|---------|--------|----------|
| Corrections & delta calculation | Complete | `CorrectionEngine.cs`, GM#5, GM#9 |
| Elvarme split-rate threshold | Complete | `AnnualConsumptionTracker`, GM#7 |
| Solar/E18 net settlement | Complete | Settlement engine branching, GM#8 |
| Erroneous switch (BRS-042) | Complete | `ErroneousSwitchService.cs`, GM#6, `BrsRequestBuilder.BuildBrs042()` |
| Reconciliation (RSM-014 parser) | Complete | `CimJsonParser.ParseRsm014()`, `ReconciliationService.cs` |
| Move-in/Move-out (BRS-009/010) | Complete | Builder methods, simulator scenarios, integration tests |
| Tariff change mid-period | Complete | `PeriodSplitter`, GM#10 |
| Resilient DataHub client (401/503) | Complete | `ResilientDataHubClient.cs`, unit tests |
| Dead-letter handling | Complete | `MessageLog.cs`, `QueuePollerTests.cs` |
| Missing spot price validation | Complete | `SpotPriceValidator.cs` |
| All 10 golden master tests | Passing | GM#1–GM#10 |

### MVP 3 — What's Missing

| Feature | Gap | Priority |
|---------|-----|----------|
| Aggregations queue persistence | Handler is a stub — logs but doesn't store or compare | P1 |
| Simulator error injection | No 401/503/malformed scenarios in simulator | P2 |
| BRS-011 (erroneous move) | Zero code | P2 |
| RSM-015/016 (historical data requests) | Zero code | P3 |
| Customer disputes workflow | Zero code | P3 |
| Concurrent edge-case tests | No test for correction-during-switch or mid-quarter move-out with aconto | P2 |

---

## Phase Structure

The phase is split into two tracks that can overlap. The **Onboarding API** (B1) is the top priority — it is the entry point for all sales channels and must be built first to establish the API-first integration pattern that everything else depends on.

```
Track A: MVP 3 Completion (close the gaps)
  A1. Aggregations persistence & reconciliation comparison
  A2. Simulator error injection scenarios
  A3. BRS-011 erroneous move
  A4. Concurrent edge-case integration tests
  A5. RSM-015/016 historical data requests

Track B: MVP 4 Foundation (production readiness)
  B1. Onboarding API — sales channel entry point          ★ TOP PRIORITY
  B2. Settlement result export API
  B3. Invoice generation model
  B4. Customer portal data layer
  B5. Monitoring & health checks
  B6. Performance baseline & load testing
```

Track A has no dependencies on Track B. They can be developed in parallel.

---

## Track A: MVP 3 Completion

### A1. Aggregations Queue Persistence & Reconciliation Comparison

**Problem:** `QueuePollerService.ProcessAggregationsAsync()` is a stub. It logs the RSM-014 message but doesn't persist the data or trigger reconciliation comparison.

**What to build:**

| Task | Detail |
|------|--------|
| Create `datahub.aggregation_data` table | Store RSM-014 aggregation results per grid area, period, resolution |
| Migration V022 | `CREATE TABLE datahub.aggregation_data (id, grid_area, period_start, period_end, resolution, total_kwh, source_message_id, received_at)` |
| `AggregationRepository` | Store and query aggregation data |
| Wire `QueuePollerService` | On RSM-014: parse → store → trigger reconciliation |
| Auto-reconciliation | After storing aggregation, compare against own settlement for same grid area + period |
| Store discrepancies | `datahub.reconciliation_result` table with match/mismatch status, delta, deviating GSRNs |
| Dashboard: Reconciliation page | Show reconciliation results, highlight discrepancies |

**Tests:**

| Test | Type |
|------|------|
| RSM-014 → store → query roundtrip | Integration |
| Matching aggregation produces "match" result | Unit |
| Mismatching aggregation produces discrepancy with correct delta | Unit |
| Full pipeline: enqueue RSM-014 → poll → store → reconcile → result | Integration |

**Exit criteria:** RSM-014 messages are persisted, automatically compared against own settlement, and discrepancies are surfaced in the dashboard.

---

### A2. Simulator Error Injection

**Problem:** The simulator only handles happy-path scenarios. The `ResilientDataHubClient` has unit tests for 401/503 retry, but there's no end-to-end test proving the full polling pipeline recovers from errors.

**What to build:**

| Scenario | Simulator behavior | System expectation |
|----------|-------------------|-------------------|
| Token expiry | Return 401 on next peek | Renew token, retry, succeed |
| Service unavailable | Return 503 for N requests, then 200 | Backoff, retry, resume |
| Malformed message | Return invalid JSON on peek | Dead-letter, dequeue, continue |
| Partial outage | 503 on Timeseries only, other queues normal | Other queues unaffected |

**Implementation:**

| Task | Detail |
|------|--------|
| Admin endpoint: `POST /admin/inject-error` | Configure next N responses for a specific queue to return a given status code |
| Admin endpoint: `POST /admin/inject-malformed` | Enqueue invalid JSON on a specific queue |
| `ErrorInjectionMiddleware` in Simulator | Intercept peek requests, check error injection state |
| Integration tests | 4 scenarios above, verified end-to-end |

**Tests:**

| Test | Type |
|------|------|
| 401 → token refresh → retry succeeds | Integration (simulator) |
| 503 × 3 → backoff → resume | Integration (simulator) |
| Malformed JSON → dead-letter → next message OK | Integration (simulator) |
| Partial outage → unaffected queues continue | Integration (simulator) |

**Exit criteria:** All 4 error injection scenarios pass as integration tests against the Docker simulator.

---

### A3. BRS-011 Erroneous Move

**Problem:** BRS-011 (correcting a move-in or move-out date) is not implemented. When the original move date was wrong, the supply period dates need to change and settlement recalculated.

**What to build:**

| Task | Detail |
|------|--------|
| `BrsRequestBuilder.BuildBrs011()` | CIM JSON for erroneous move request with corrected date |
| State machine transition | New process type `BRS011`, similar lifecycle to BRS-042 |
| Supply period adjustment | On confirmation: update `supply_period.start_date` or `end_date` |
| Recalculation trigger | After date adjustment, recalculate settlement for the affected period |
| Pro-rata subscription adjustment | Subscriptions recalculated for the new period length |
| Aconto adjustment | If aconto payments exist, recalculate proportional amounts |
| Simulator endpoint | `POST /v1.0/cim/requestcorrectionofmove` (or similar — verify DataHub endpoint name) |
| Simulator scenario: `erroneous_move` | BRS-011 request → confirmation → updated RSM-012 |

**Tests:**

| Test | Type |
|------|------|
| BRS-011 request builder produces valid CIM JSON | Unit |
| Supply period date adjustment | Unit |
| Settlement recalculation after date change | Unit (golden master candidate) |
| Full BRS-011 flow against simulator | Integration |

**Exit criteria:** BRS-011 can be submitted, confirmed, and the system recalculates settlement with corrected dates.

---

### A4. Concurrent Edge-Case Integration Tests

**Problem:** Golden master tests verify the calculations for edge cases, but no integration tests verify that concurrent real-world scenarios (correction arriving during a switch, move-out mid-quarter) work through the full pipeline.

**What to build:**

| Scenario | What to test |
|----------|-------------|
| Correction during active switch | Enqueue BRS-001 + RSM-012 correction for overlapping period → only delta within our supply period is settled |
| Mid-quarter move-out + aconto | Customer moves out 6 weeks into quarter → partial settlement + aconto reconciliation |
| Tariff change + correction | Grid company changes tariff mid-month, then sends correction for same month → both applied correctly |

**Implementation:** These are pure integration tests — no new production code expected (the calculation logic already exists). The tests exercise the full pipeline: simulator → queue poller → parser → repository → settlement engine → result verification.

**Exit criteria:** All 3 concurrent scenarios pass as integration tests.

---

### A5. RSM-015/016 Historical Data Requests

**Problem:** No ability to request historical validated data (RSM-015) or detailed aggregated data (RSM-016) from DataHub. These are needed for reconciliation dispute resolution and customer dispute handling.

**What to build:**

| Task | Detail |
|------|--------|
| `BrsRequestBuilder.BuildRsm015Request()` | Request validated data for a GSRN + period |
| `BrsRequestBuilder.BuildRsm016Request()` | Request detailed aggregated data for grid area + period |
| `CimJsonParser.ParseRsm015()` | Parse response — validated metering data (similar to RSM-012) |
| `CimJsonParser.ParseRsm016()` | Parse response — detailed aggregation data |
| `IDataHubClient` extensions | `RequestHistoricalData()` and `RequestDetailedAggregation()` methods |
| Wire into reconciliation | When discrepancy detected, auto-request RSM-015 for deviating GSRNs |
| Simulator endpoints | Respond to RSM-015/016 requests with fixture data |

**Tests:**

| Test | Type |
|------|------|
| RSM-015 request builder produces valid CIM JSON | Unit |
| RSM-016 request builder produces valid CIM JSON | Unit |
| RSM-015 response parser | Unit (fixtures) |
| RSM-016 response parser | Unit (fixtures) |
| Reconciliation discrepancy → auto RSM-015 → resolve | Integration |

**Exit criteria:** System can request and parse historical data from DataHub. Reconciliation auto-requests RSM-015 when discrepancies are found.

---

## Track B: MVP 4 Foundation

### B1. Onboarding API — Sales Channel Entry Point ★ TOP PRIORITY

**Problem:** The settlement system can process customers end-to-end, but there's no entry point for "a customer just signed up." Sales happen through three channels — website (self-service), mobile app (self-service), and customer service (phone). Today, customer creation is manual or demo-seeded. All three channels need the same programmatic entry point.

**Design principle:** API-first. All sales channels call the same endpoints. The website doesn't talk to the database directly. Customer service doesn't use a different code path. One API, multiple consumers.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Website     │  │  Mobile App  │  │  Customer    │
│  (self-serv) │  │  (self-serv) │  │  Service UI  │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                  ┌──────▼──────┐
                  │  Onboarding │
                  │     API     │
                  └──────┬──────┘
                         │
              ┌──────────▼──────────┐
              │  DataHub.Settlement │
              │  Portfolio + BRS-001│
              └─────────────────────┘
```

**What to build:**

| Endpoint | Purpose |
|----------|---------|
| `POST /api/signup/validate` | Validate GSRN format (18 digits), check not already in portfolio, address lookup via DAWA |
| `GET /api/products` | List available energy products (margin, subscription, fixed/variable, green energy options) |
| `GET /api/products/{id}` | Product detail with pricing breakdown |
| `POST /api/signup` | Create customer + metering point + contract + supply period. Queue BRS-001. Return signup ID |
| `GET /api/signup/{id}/status` | Track process state: Registered → Sent to DataHub → Acknowledged → Effectuation Pending → Active |
| `POST /api/signup/{id}/cancel` | Cancel before activation — sends BRS-003 if still within cancellation window |

**Request/response models:**

```
POST /api/signup
{
  "gsrn": "571313180000000001",
  "customer": {
    "name": "Anders Jensen",
    "cpr_or_cvr": "0101901234",
    "email": "anders@example.dk",
    "phone": "+4512345678"
  },
  "product_id": "spot-standard",
  "requested_start_date": "2026-04-01"
}

→ 201 Created
{
  "signup_id": "sgn-2026-00042",
  "status": "registered",
  "gsrn": "571313180000000001",
  "requested_start_date": "2026-04-01",
  "estimated_activation": "2026-04-01",
  "process_id": "proc-xxxxx",
  "links": {
    "status": "/api/signup/sgn-2026-00042/status",
    "cancel": "/api/signup/sgn-2026-00042/cancel"
  }
}
```

**Signup flow internals:**

| Step | What happens |
|------|-------------|
| 1. Validate | Check GSRN format, verify not duplicate, look up address via DAWA |
| 2. Create portfolio entities | `customer`, `metering_point`, `contract`, `supply_period` (start = requested date) |
| 3. Create process request | `process_request` with type BRS-001, status `pending` |
| 4. Return immediately | Signup ID + status link. The BRS-001 is sent asynchronously by `ProcessSchedulerService` |
| 5. Background processing | Scheduler picks up pending process → sends BRS-001 → DataHub responds → state machine advances |
| 6. Status polling | Sales channel polls `/status` to track progress and notify customer |

**Product catalog management:**

| Task | Detail |
|------|--------|
| `portfolio.product` table enhancement | Add: description, active flag, display_order, pricing_type (spot/fixed), green_energy flag |
| Seed realistic products | "Spot Standard", "Spot Green", "Fixed 12 Month", etc. |
| Admin endpoints (basic) | `POST /api/admin/products`, `PUT /api/admin/products/{id}` — for back-office product management |
| Product validation at signup | Verify product exists and is active |

**Address lookup integration:**

| Task | Detail |
|------|--------|
| Wire DAWA into validation | `AddressLookupService` already partially exists — connect to `/api/signup/validate` |
| Return formatted address | When GSRN validation succeeds, include the resolved address in the response for customer confirmation |

**Authentication strategy (this phase):**

| Channel | Auth method | Implementation |
|---------|------------|----------------|
| Website / App | API key + session token (stub) | Real MitID integration is MVP 4 proper |
| Customer Service | API key + agent ID header | Agent identity passed through for audit |
| API-to-API | API key | Machine-to-machine, simple header |

The API validates the API key. The caller is responsible for authenticating the end user (MitID, agent login). The API receives the verified identity (CPR/CVR) and trusts it. This separation keeps the settlement system auth-agnostic.

**Signup lifecycle notifications:**

| Event | How the sales channel learns about it |
|-------|--------------------------------------|
| BRS-001 sent | Status changes to `sent_to_datahub` — visible via polling |
| BRS-001 accepted (RSM-009) | Status changes to `acknowledged` |
| BRS-001 rejected (RSM-009) | Status changes to `rejected` — include rejection reason |
| Metering point activated (RSM-007) | Status changes to `active` |
| Cancellation confirmed | Status changes to `cancelled` |

Polling first (`GET /status`). Webhook push is a future enhancement.

**Tests:**

| Test | Type |
|------|------|
| GSRN validation: valid format accepted | Unit |
| GSRN validation: invalid format rejected (wrong length, non-numeric) | Unit |
| GSRN validation: duplicate GSRN rejected | Integration |
| Signup creates all portfolio entities correctly | Integration |
| Signup queues BRS-001 process request | Integration |
| Status endpoint reflects process state transitions | Integration |
| Cancel before activation sends BRS-003 | Integration |
| Cancel after activation returns 409 Conflict | Integration |
| Product listing returns active products only | Integration |
| Invalid product ID at signup returns 400 | Unit |
| Full flow: signup → BRS-001 → RSM-009 accepted → RSM-007 → status = active | Integration (simulator) |

**Exit criteria:**
- All three sales channels can create customers through the same API
- Signup produces a trackable process with status polling
- Cancellation works before activation
- Product catalog is queryable and validated at signup
- Address lookup integrated into validation
- Full signup → activation flow works end-to-end against the simulator

---

### B2. Settlement Result Export API

**Problem:** Settlement results exist only in the database and dashboard. No programmatic way for external systems (ERP, billing) to retrieve them.

**What to build:**

| Task | Detail |
|------|--------|
| REST API endpoints in `DataHub.Settlement.Api` | `GET /api/settlement/runs` — list settlement runs with filters (date, grid area, status) |
| | `GET /api/settlement/runs/{id}` — detailed run with all line items |
| | `GET /api/settlement/runs/{id}/lines` — line items with pagination |
| | `GET /api/settlement/customers/{gsrn}/invoices` — invoice history per metering point |
| Response DTOs | `SettlementRunDto`, `SettlementLineDto`, `InvoiceSummaryDto` |
| OpenAPI documentation | Swagger/Swashbuckle for API documentation |
| Authentication | API key or JWT (simple — production auth is MVP 4 proper) |

**Tests:**

| Test | Type |
|------|------|
| API returns correct settlement data | Integration |
| Pagination works correctly | Integration |
| Filter by date range, grid area, status | Integration |
| Empty results return 200 with empty list | Unit |

**Exit criteria:** External systems can query settlement results via REST API. API is documented with OpenAPI/Swagger.

---

### B3. Invoice Generation Model

**Problem:** Settlement produces line items, but there's no invoice entity that groups them into a customer-facing document with an invoice number, due date, and payment reference.

**What to build:**

| Task | Detail |
|------|--------|
| Domain model | `Invoice` entity with: invoice_number, customer_id, gsrn, period, issue_date, due_date, total_excl_vat, vat_amount, total_incl_vat, status (draft/issued/paid/credited), payment_reference |
| Migration V023 | `billing.invoice` table |
| `InvoiceGenerator` service | Takes settlement run → groups lines by customer/GSRN → creates invoice with number + due date |
| Invoice numbering | Sequential, per-year (e.g., `2026-00001`) |
| Credit note model | `CreditNote` linked to original invoice, for corrections/erroneous switches |
| PDF generation (stub) | Interface `IInvoiceRenderer` with a simple text/HTML implementation — real PDF is MVP 4 |

**Tests:**

| Test | Type |
|------|------|
| Settlement run → invoice with correct totals | Unit |
| Invoice numbering is sequential | Unit |
| Correction settlement → credit note linked to original | Unit |
| Invoice round-trip to database | Integration |

**Exit criteria:** Settlement runs produce invoices with proper numbers, due dates, and line items. Credit notes link to originals.

---

### B4. Customer Portal Data Layer

**Problem:** No API for customers to view their own consumption, invoices, and contract details. The dashboard is internal — a customer-facing portal needs a different data layer.

**What to build:**

| Task | Detail |
|------|--------|
| Read-only query service | `CustomerPortalQueryService` — optimized queries for customer-facing data |
| Consumption data API | `GET /api/portal/{gsrn}/consumption?from=&to=&resolution=` — hourly, daily, monthly aggregation |
| Invoice history API | `GET /api/portal/{gsrn}/invoices` — issued invoices with line-item breakdown |
| Contract details API | `GET /api/portal/{gsrn}/contract` — current product, margin, subscription |
| Spot price history API | `GET /api/portal/spot-prices?area=&from=&to=` — DK1/DK2 prices |

**Implementation notes:**
- These are **read-only** endpoints — no mutations
- Authentication is a stub (real auth with NemID/MitID is MVP 4 proper)
- Consumption queries leverage TimescaleDB `time_bucket()` for efficient aggregation
- Response DTOs are customer-friendly (no internal IDs, Danish-language labels)

**Tests:**

| Test | Type |
|------|------|
| Consumption aggregation returns correct hourly/daily/monthly values | Integration |
| Invoice history returns all issued invoices | Integration |
| Spot price query returns correct data for DK1/DK2 | Integration |

**Exit criteria:** Customer-facing data is queryable via API. TimescaleDB aggregation works for consumption data at different resolutions.

---

### B5. Monitoring & Health Checks

**Problem:** The system has OpenTelemetry tracing but no health checks, no structured alerting, and no operational metrics beyond what Aspire Dashboard shows.

**What to build:**

| Task | Detail |
|------|--------|
| Health check endpoints | `/health/live` (process alive), `/health/ready` (DB connected, queues reachable) |
| Database health check | Verify PostgreSQL connection, check migration status |
| DataHub connectivity check | Token endpoint reachable, queue peek returns 200 or 204 |
| Operational metrics | Counters: messages_processed, messages_dead_lettered, settlement_runs_completed, settlement_runs_failed |
| | Gauges: queue_depth (per queue), active_metering_points, pending_processes |
| | Histograms: message_processing_duration, settlement_run_duration |
| Alerting rules (config) | Define thresholds for: dead-letter rate > 5%, queue depth growing, settlement run failure |
| Structured logging | Ensure all log entries include CorrelationId, GSRN (where applicable), ProcessId |

**Tests:**

| Test | Type |
|------|------|
| Health check returns healthy when DB is up | Integration |
| Health check returns unhealthy when DB is down | Integration |
| Metrics increment correctly on message processing | Unit |

**Exit criteria:** Health endpoints work. Operational metrics are exposed. Structured logging includes correlation IDs.

---

### B6. Performance Baseline & Load Testing

**Problem:** The system works with demo data (a handful of metering points). MVP 4 requires 80K+ metering points. No performance baseline exists.

**What to build:**

| Task | Detail |
|------|--------|
| Load data generator | Script to seed N metering points with M months of hourly data |
| Baseline measurements | Time to: ingest 1 day of data for N points, run settlement for N points, query consumption for 1 GSRN |
| TimescaleDB tuning | Verify chunk interval, compression policy, retention policy at scale |
| Query optimization | Identify slow queries with `EXPLAIN ANALYZE` at 80K scale |
| Settlement engine profiling | Profile `SettlementEngine.Calculate()` at scale — memory, CPU |
| Document results | Performance report with baseline numbers and bottlenecks identified |

**Target scale:**

| Metric | Target |
|--------|--------|
| Metering points | 80,000 |
| Hourly readings per day | 80,000 × 24 = 1.92M rows |
| Monthly settlement run | 80,000 points × ~720 hours = ~57.6M calculations |
| Query: single GSRN, 1 month consumption | < 100ms |
| Full monthly settlement | < 30 minutes (WARNING: VERIFY — this is a rough target) |

**Exit criteria:** Performance baseline established. Bottlenecks identified. TimescaleDB configuration validated at scale.

---

## Execution Order

Recommended sequence. **B1 (Onboarding API) starts immediately** — it establishes the API-first pattern and is the single entry point all sales channels need.

```
Week 1-2:  B1 (onboarding API)               ★ TOP PRIORITY — sales channel entry point
           A1 (aggregations persistence)     — unblocks reconciliation dashboard

Week 3-4:  B1 (onboarding API, continued)    — full signup → activation flow, simulator scenario
           B5 (monitoring & health checks)   — independent, quick win

Week 5-6:  A2 (simulator error injection)     — test infrastructure
           B2 (settlement export API)        — follows B1 API patterns

Week 7-8:  A3 (BRS-011 erroneous move)        — new feature
           A4 (concurrent edge-case tests)    — test gap closure
           B3 (invoice generation model)      — depends on settlement being solid

Week 9-10: A5 (RSM-015/016 historical data)   — depends on A1 (reconciliation)
           B4 (customer portal data layer)    — depends on B2 (API patterns)

Week 11-12: B6 (performance baseline)         — depends on B1-B4 (APIs to benchmark)
            Polish, documentation, review
```

Items within the same week can be worked in parallel.

---

## Deferred to MVP 4 Proper

These items are **not** in this phase:

| Item | Reason for deferral |
|------|-------------------|
| Customer disputes workflow | Requires RSM-015/016 (A5) + invoice model (B3) + customer portal (B4) — build the pieces first, then the workflow |
| ERP integration | Requires settlement export API (B2) + invoice model (B3) to be stable |
| Payment services (PBS/Betalingsservice) | Requires invoice model (B3) + production infrastructure |
| Digital post (e-Boks) | Requires invoice PDF generation |
| Real customer portal authentication (NemID/MitID) | Security scope — separate work stream |
| Pilot customers (10-50) | Requires all of the above |
| Full migration | Requires successful pilot |
| Preprod validation | Requires production infrastructure |
| Security audit (ISAE 3402, GDPR) | Requires stable feature set |

---

## New Golden Master Tests

| Test | Scenario | Track |
|------|----------|-------|
| GM#11 | Erroneous move: move-in date corrected 3 days later, settlement recalculated | A3 |
| GM#12 | Concurrent correction during switch: only delta within supply period settled | A4 |

---

## New Database Migrations

| Migration | Track | Purpose |
|-----------|-------|---------|
| V022 | B1 | `portfolio.product` enhancements (description, active, pricing_type, green_energy) + `portfolio.signup` tracking table |
| V023 | A1 | `datahub.aggregation_data` + `datahub.reconciliation_result` tables |
| V024 | B3 | `billing.invoice` + `billing.credit_note` tables |

---

## Success Criteria for This Phase

1. **Onboarding API live:** All three sales channels (web, app, customer service) can create customers through a single API, with full signup → activation flow working end-to-end
2. **MVP 3 complete:** All planned features implemented, all 12 golden master tests pass, all integration tests pass
3. **Settlement export API:** External systems can query settlement results via REST
4. **Invoice model:** Settlement runs produce invoices with numbers, due dates, and line items
5. **Customer portal data:** Consumption, invoices, and contract data queryable via API
6. **Monitoring:** Health checks and operational metrics operational
7. **Performance baseline:** Measured at 80K metering points, bottlenecks documented
8. **CI green:** All unit + integration tests pass on every push

---

## Risk Register (This Phase)

| Risk | Impact | Mitigation |
|------|--------|------------|
| Onboarding API contract changes after sales channel integration | Breaking changes for website/app | Design API contract carefully up front, version from day one (`/api/v1/signup`) |
| GSRN validation insufficient without DataHub lookup | Customer signs up with wrong GSRN | Validate format + DAWA address lookup. Real GSRN verification happens when BRS-001 is accepted/rejected |
| 15+ business day BRS-001 notice period confuses customers | High dropout between signup and activation | Clear status communication, email/SMS notifications at each state change (future) |
| Product catalog ownership unclear (this system vs. CRM) | Duplicate or conflicting product data | Start with products in this system, design for external sync later |
| RSM-015/016 CIM format unknown | Parser may need rework once real messages are seen | Build parser from documentation, plan for fixture updates |
| BRS-011 endpoint name/format unverified | Request may be rejected by real DataHub | Research Energinet documentation, build against best understanding |
| TimescaleDB performance at 80K scale | Settlement may be too slow | Profile early (B6), identify bottlenecks before building more features |
| Invoice numbering conflicts in distributed deployment | Duplicate invoice numbers | Use database sequence, not application-generated numbers |
| API authentication model changes | Breaking changes for ERP/sales integration | Keep auth simple (API key) in this phase, design for replacement |
