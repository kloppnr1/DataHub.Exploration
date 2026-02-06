# Implementation Plan

Phased plan for building the DataHub settlement system. Testing against DataHub is the biggest technical risk — this plan prioritizes building a local DataHub simulator early and validating against Energinet's test environments progressively.

---

## The Core Problem: Testing Against DataHub

DataHub is a **black-box external system** owned by Energinet. We cannot:
- Create arbitrary test data in DataHub
- Control when or what messages appear on the queues
- Reset state between test runs
- Run DataHub locally

Energinet provides test environments (Actor Test, Preprod), but:
- Access requires formal registration and approval
- Credentials must be created in the actor portal (aktørportalen) with MitID
- Test data is limited and shared with other actors
- Queue messages arrive on Energinet's schedule, not ours
- There is no way to "replay" a message once dequeued

**This means:** Most development and testing must happen against a **local DataHub simulator** that we build and control. Real DataHub environments are for validation, not daily development.

---

## Testing Strategy: The DataHub Simulator

### What the simulator must replicate

The simulator is a lightweight HTTP server that mimics the DataHub B2B API — just enough for our system to believe it is talking to the real DataHub.

```
┌─────────────────────────────────────────────────────────────┐
│  DataHub Simulator                                           │
│                                                              │
│  OAuth2 token endpoint                                       │
│    POST /oauth2/v2.0/token → returns a fake JWT              │
│                                                              │
│  Queue endpoints (4 queues)                                  │
│    GET  /v1.0/cim/Timeseries   → next RSM-012 or RSM-014    │
│    GET  /v1.0/cim/MasterData   → next RSM-007 or RSM-004    │
│    GET  /v1.0/cim/Charges      → next tariff update          │
│    GET  /v1.0/cim/Aggregations → next RSM-014 aggregation    │
│    DELETE /v1.0/cim/dequeue/{id} → acknowledge               │
│                                                              │
│  Outbound request endpoints                                  │
│    POST /v1.0/cim/requestchangeofsupplier → accept BRS-001   │
│    POST /v1.0/cim/requestendofsupply → accept BRS-002        │
│    ... (other BRS requests)                                  │
│                                                              │
│  Scenario engine                                             │
│    Load test fixtures (CIM JSON files)                       │
│    Queue them in order                                       │
│    Simulate timing (delays, empty queues, errors)            │
│    Validate outbound requests                                │
│                                                              │
│  Admin API                                                   │
│    POST /admin/enqueue → add a message to any queue          │
│    POST /admin/scenario → load a named scenario              │
│    GET  /admin/requests → inspect outbound requests received │
│    POST /admin/reset → clear all queues and state            │
└─────────────────────────────────────────────────────────────┘
```

### Test fixture library

The simulator is powered by **CIM JSON fixture files** — real-format messages that exercise specific scenarios:

| Fixture set | Contents | Tests |
|-------------|----------|-------|
| `rsm012-single-day.json` | One day of hourly consumption for one GSRN | Basic ingestion pipeline |
| `rsm012-correction.json` | Same GSRN + period as above, different quantities | Correction detection + delta calculation |
| `rsm012-multi-day.json` | 30 days of hourly data | Full monthly settlement |
| `rsm012-production-e18.json` | Production data for a solar metering point | E18 handling, net settlement |
| `rsm012-missing-hours.json` | Data with gaps (quality A02) | Incomplete data handling |
| `rsm012-pt15m.json` | 15-minute resolution data | Future PT15M support |
| `rsm007-activation.json` | Master data snapshot (E17, flex, grid area 344) | Metering point activation |
| `rsm007-electrical-heating.json` | Master data with heating flag | Elvarme threshold tracking |
| `rsm004-grid-area-change.json` | Master data change — grid area changed | Tariff reassignment |
| `rsm014-aggregation.json` | Aggregated wholesale data for a grid area | Reconciliation |
| `charges-tariff-update.json` | New grid tariff rates with validity dates | Rate table update |
| `brs001-receipt-accepted.json` | RSM-009 acceptance of a supplier switch | Onboarding flow |
| `brs001-receipt-rejected.json` | RSM-009 rejection (CPR mismatch) | Error handling |

**Where do fixtures come from?**

1. **Energinet documentation** — the CIM EDI Guide (Dok. 15/00718-191) and RSM Guide contain example messages
2. **Energinet's open source repos** — [opengeh-edi](https://github.com/Energinet-DataHub/opengeh-edi) contains test data
3. **Actor Test captures** — once we have access, capture real messages and anonymize them
4. **Hand-crafted** — for edge cases not covered by the above

### Simulator implementation

| Approach | Effort | Fidelity | Recommendation |
|----------|--------|----------|----------------|
| **In-process fake (recommended for phase 1)** | Low | Medium | Implement `IDataHubClient` interface with an in-memory fake. No HTTP, no simulator process. Tests run fast. |
| **Standalone HTTP server (recommended for phase 2+)** | Medium | High | ASP.NET Minimal API that serves fixture files from disk. Docker container. Closest to real DataHub behavior. |
| **WireMock / Mountebank** | Low | Medium | Record/replay HTTP stubs. Good for contract tests. Less flexible for scenario-based testing. |
| **Energinet's own test tools** | Unknown | Unknown | Check if Energinet provides a simulator or sandbox. (WARNING: VERIFY — as of 2025, no public simulator is known) |

**Recommended progression:**

```
Phase 1: In-process fake (IDataHubClient)
  ↓
Phase 2: Standalone simulator (Docker container)
  ↓
Phase 3+: Simulator + Actor Test environment (parallel)
  ↓
Production: Real DataHub only
```

---

## Test Pyramid

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲          Actor Test / Preprod
                 ╱ (few)╲         Real DataHub, real messages
                ╱────────╲
               ╱          ╲
              ╱ Integration╲      Simulator (Docker)
             ╱  (moderate)  ╲     Full HTTP, CIM JSON, queue behavior
            ╱────────────────╲
           ╱                  ╲
          ╱   Unit / Domain    ╲  In-process, no I/O
         ╱    (many, fast)      ╲ Settlement calc, CIM parsing, correction detection
        ╱────────────────────────╲
```

### Unit / Domain tests (hundreds, milliseconds)

No HTTP, no database, no simulator. Pure logic.

| What to test | Example |
|-------------|---------|
| **CIM JSON parsing** | Parse an RSM-012 fixture → assert GSRN, period, quantities |
| **Correction detection** | Given stored data + new RSM-012, detect delta per interval |
| **Settlement calculation** | Given kWh[] + spot prices[] + tariff rates[] → assert amounts per line |
| **Tariff lookup** | Given a timestamp + grid area → correct rate (day/night/peak) |
| **Aconto settlement** | Given actual total + aconto payments → correct difference |
| **Elvarme threshold** | Given cumulative kWh crossing 4,000 → split rate |
| **Solar net settlement** | Given E17 consumption + E18 production per hour → net amounts |
| **Pro rata subscription** | Given partial period → correct daily proration |
| **Invoice line aggregation** | Given hourly settlement results → correct invoice totals |

**These are the most important tests.** If the settlement calculation is wrong, no amount of integration testing will save us.

### Integration tests (tens, seconds)

Test the full pipeline with the HTTP simulator or a real database.

| What to test | How |
|-------------|-----|
| **Queue polling loop** | Simulator has messages → our poller picks them up → persisted in DB |
| **OAuth2 token flow** | Simulator token endpoint → our auth manager caches and renews |
| **Peek → parse → store → dequeue** | Full RSM-012 lifecycle against simulator |
| **Correction in pipeline** | Enqueue original RSM-012, then correction → verify delta stored |
| **BRS-001 request/response** | Send supplier switch → simulator validates format → returns acceptance |
| **Idempotent processing** | Enqueue same MessageId twice → only processed once |
| **Dead-letter on invalid message** | Enqueue malformed CIM JSON → verify dead-letter entry |
| **Token expiry mid-poll** | Simulator returns 401 → our system renews → retry succeeds |
| **Empty queue behavior** | Simulator returns 204 → our poller backs off correctly |
| **Settlement run end-to-end** | Seed DB with metering data + rates → run settlement → verify invoice lines |

### E2E tests against real DataHub (few, minutes)

Run against Energinet's Actor Test or Preprod with real credentials. These tests are **slow, flaky, and expensive** — keep them minimal.

| What to test | Why |
|-------------|-----|
| **OAuth2 authentication** | Verify our token request works against real Azure AD |
| **Peek from an empty queue** | Verify 204 response format matches our parser |
| **Peek a real RSM-012** | Verify CIM JSON structure matches our parser (the most important E2E test) |
| **Dequeue a message** | Verify DELETE works and the message does not reappear |
| **Submit BRS-001** | Verify our request format is accepted by DataHub |
| **Receive RSM-009 response** | Verify we can parse the acceptance/rejection |

**These tests answer one question:** Does the real DataHub produce messages that our parser actually understands?

---

## Phased Implementation

### Phase 0: Foundation (weeks 1-3)

**Goal:** Project skeleton, CI/CD, and the DataHub simulator — before writing any business logic.

| Task | Detail | Test approach |
|------|--------|---------------|
| Create .NET solution structure | API Gateway, DataHub Integration, Settlement Engine, Portfolio Service projects | — |
| Set up CI/CD pipeline | Build, test, containerize on every push | GitHub Actions or Azure DevOps |
| Set up PostgreSQL + TimescaleDB | Docker Compose for local dev, migration tool (EF Core or Flyway) | Verify container starts |
| **Build in-process DataHub fake** | `IDataHubClient` interface + `FakeDataHubClient` with in-memory queues | Unit tests against fake |
| **Create first CIM JSON fixtures** | `rsm012-single-day.json`, `rsm007-activation.json` from Energinet docs | Validate against CIM schema |
| **Build standalone DataHub simulator** | ASP.NET Minimal API, Docker container, load fixtures, admin API | Smoke test: peek → dequeue cycle |
| Apply for Actor Test access | Contact Energinet, register in actor portal, create test credentials | — |

**Exit criteria:**
- `docker compose up` starts the simulator, database, and our services
- A test can enqueue an RSM-012 in the simulator, and our poller picks it up
- CI/CD runs unit tests on every push

### Phase 1: DataHub Connection + Metering Data (weeks 4-8)

**Goal:** Receive, parse, and store RSM-012 metering data.

| Task | Detail | Test approach |
|------|--------|---------------|
| **OAuth2 Auth Manager** | Token fetch, cache, proactive renewal, 401 retry | Unit: mock token endpoint. Integration: simulator token endpoint. E2E: real Azure AD (when credentials arrive) |
| **Queue Poller** | Poll Timeseries queue, configurable interval, graceful backoff on 204 | Integration: simulator with messages + empty queue |
| **CIM JSON Parser (RSM-012)** | Deserialize CIM JSON → domain model (MeteringPointId, period, Point[]) | Unit: parse fixture files, assert fields. Fuzz: malformed JSON → dead-letter |
| **Time series storage** | `metering_data` hypertable, composite index on (gsrn, timestamp) | Integration: parse → store → query roundtrip |
| **Idempotent dequeue** | Track MessageId, skip duplicates | Integration: enqueue twice → stored once |
| **Dead-letter handling** | Failed parse/validation → dead-letter table, dequeue to free queue | Integration: malformed message → dead-letter entry |
| **Correction detection** | Compare incoming RSM-012 against stored data, calculate delta | Unit: stored data + new data → delta per interval. Integration: original → correction via simulator |

**Key testing milestone:** CIM JSON parser tests. These are the most fragile — if the real DataHub produces slightly different JSON than our fixtures, parsing breaks.

**Mitigation:**
- Build the parser to be **tolerant** of unknown fields (ignore, don't fail)
- Test against multiple fixture variants (different grid companies, resolutions, quality codes)
- As soon as Actor Test access arrives: capture a real RSM-012, add it to fixtures, run parser tests

**Exit criteria:**
- Simulator sends RSM-012 → our system stores it in the database
- Correction detection works: original + correction → delta calculated
- Dead-letter handles malformed messages
- Actor Test: successfully authenticate and peek at least one message (if access granted)

### Phase 2: Portfolio + Master Data (weeks 9-14)

**Goal:** Receive master data, manage metering points, handle supplier switch lifecycle.

| Task | Detail | Test approach |
|------|--------|---------------|
| **CIM JSON Parser (RSM-007, RSM-004)** | Deserialize master data snapshots and changes | Unit: fixture files |
| **MasterData queue poller** | Poll MasterData queue, route RSM-007 vs RSM-004 | Integration: simulator with both message types |
| **Portfolio service** | Metering point CRUD, supply period tracking, grid area assignment | Unit: domain logic. Integration: DB roundtrip |
| **BRS-001 request builder** | Build CIM JSON for supplier switch request | Unit: assert CIM structure. Integration: simulator validates format |
| **BRS-001 response handler** | Parse RSM-009 acceptance/rejection | Unit: fixture files |
| **State machine** | Metering point lifecycle states (pending → active → inactive) | Unit: state transition rules |
| **Tariff assignment** | Grid area from RSM-007 → load correct tariff rates | Integration: master data + charges → correct rate mapping |
| **Customer record** | CPR/CVR, contact info, product association | Unit + integration |

**Simulator enhancements:**
- MasterData queue support
- BRS-001 inbound endpoint (validate format, return RSM-009)
- Scenario: "full onboarding" — BRS-001 accepted → RSM-007 → first RSM-012

**Exit criteria:**
- Full onboarding scenario works against simulator: switch request → master data → first metering data
- BRS-001 submitted to Actor Test and accepted (if access granted)

### Phase 3: Settlement Engine (weeks 15-22)

**Goal:** Calculate what customers owe for a billing period.

| Task | Detail | Test approach |
|------|--------|---------------|
| **Settlement calculation** | kWh × (spot + margin) per hour, summed per period | Unit: known inputs → known outputs (golden master tests) |
| **Tariff application** | kWh × grid tariff rate per hour (time-differentiated) | Unit: day/night/peak rates correctly applied |
| **Subscription proration** | Fixed fees prorated to billing period | Unit: partial periods |
| **Electricity tax (elafgift)** | kWh × statutory rate | Unit: standard + reduced rate (elvarme) |
| **VAT calculation** | 25% of all lines | Unit: rounding |
| **Invoice line generation** | Aggregate hourly results into invoice lines | Unit: sums match |
| **Spot price ingestion** | Fetch and store Nord Pool prices (DK1/DK2) | Integration: mock market data → stored prices |
| **Charges queue parser** | Deserialize tariff updates from Charges queue | Unit: fixture files. Integration: simulator |
| **Settlement run orchestration** | Trigger for all active metering points in a grid area | Integration: seeded DB → run → verify results |
| **Billing export API** | Settlement results exposed for ERP consumption | Integration: API returns correct settlement data |

**Critical test suite: "Golden master" settlement tests**

These are the highest-value tests in the entire system. Create hand-calculated reference invoices and verify the engine reproduces them exactly:

```
Golden Master Test #1: Simple spot customer
  Input:
    - 720 hours of consumption (kWh per hour from fixture)
    - 720 hours of spot prices (DKK/kWh from fixture)
    - Grid tariff rates (day/night/peak from fixture)
    - Supplier margin: 0.04 DKK/kWh
    - Subscription: 39 DKK/month
    - Elafgift: 0.008 DKK/kWh
  Expected output:
    - Energy line: [hand-calculated]
    - Grid tariff line: [hand-calculated]
    - System tariff line: [hand-calculated]
    - Transmission tariff line: [hand-calculated]
    - Elafgift line: [hand-calculated]
    - Subscription lines: [hand-calculated]
    - VAT: [hand-calculated]
    - Total: [hand-calculated]

Golden Master Test #2: Aconto customer (quarterly)
Golden Master Test #3: Correction (delta settlement)
Golden Master Test #4: Partial period (mid-month start)
Golden Master Test #5: Elvarme customer crossing 4,000 kWh
Golden Master Test #6: Solar customer with E18 production
```

**Exit criteria:**
- All golden master tests pass
- Full pipeline: simulator metering data → settlement run → invoice lines match expected
- Charges queue parsed and rates applied correctly

### Phase 4: Full Lifecycle (weeks 23-28)

**Goal:** Handle all BRS processes — cancellations, reversals, moves, terminations.

| Task | Detail | Test approach |
|------|--------|---------------|
| **BRS-002 (end of supply)** | Build request, handle response | Unit + simulator |
| **BRS-003 (cancel switch)** | Cancel before effective date | Unit: state machine transition |
| **BRS-009 (move-in)** | Initiate move-in | Unit + simulator |
| **BRS-010 (move-out)** | Handle move-out | Unit + simulator |
| **BRS-042 (erroneous switch)** | Reverse a switch, credit invoices | Integration: full reversal flow |
| **BRS-044 (cancel termination)** | Cancel supply termination | Unit: state machine |
| **Final settlement** | Partial period + aconto settlement at offboarding | Unit: golden master |
| **Credit/debit notes** | Generate correction invoice after reversal | Integration |

**Simulator enhancements:**
- All BRS request endpoints
- Scenario: "full lifecycle" — onboarding → operation → offboarding → final settlement

**Exit criteria:**
- All offboarding scenarios work against simulator
- State machine handles all BRS transitions correctly
- Final settlement and aconto settlement produce correct results

### Phase 5: Wholesale Reconciliation + Charges (weeks 29-34)

**Goal:** Reconcile our settlement against DataHub's wholesale settlement.

| Task | Detail | Test approach |
|------|--------|---------------|
| **RSM-014 parser** | Deserialize aggregated wholesale data | Unit: fixtures |
| **Reconciliation engine** | Compare own settlement vs. DataHub aggregation | Unit: matching + discrepancy scenarios |
| **RSM-015 request** | Request historical validated data | Integration: simulator |
| **RSM-016 request** | Request detailed aggregated data | Integration: simulator |
| **Discrepancy analysis** | Identify deviating metering points | Unit |
| **Charges queue (full)** | Parse all tariff/charge types, validity periods | Unit + integration |

**Simulator enhancements:**
- Aggregations queue with RSM-014 fixtures
- RSM-015/016 response endpoints
- Scenario: "reconciliation with discrepancy" — own settlement differs from RSM-014

**Exit criteria:**
- Reconciliation detects discrepancies and identifies affected metering points
- Missing data triggers RSM-015 request → historical data received → recalculation

### Phase 6: Actor Test Validation + Hardening (weeks 35-40)

**Goal:** Validate everything against Energinet's real test environment.

| Task | Detail |
|------|--------|
| **Actor Test: full flow** | BRS-001 → RSM-007 → RSM-012 → settlement → BRS-002 |
| **Capture real messages** | Save real CIM JSON from Actor Test → add to fixture library |
| **Parser hardening** | Fix any parsing failures discovered with real messages |
| **Edge case discovery** | Document differences between simulator and real DataHub |
| **Performance test** | Simulate 80K metering points against local simulator |
| **Preprod validation** | Final validation against production-like environment |
| **Security audit** | GDPR compliance, secret management, audit logging |

**This phase is about discovering what the simulator got wrong.** Every real message that breaks our parser is a fixture added to the test suite.

---

## DataHub Simulator: Detailed Scenarios

Predefined test scenarios that exercise complete workflows:

### Scenario 1: Happy path onboarding

```
1. System sends BRS-001 (supplier switch)
   → Simulator returns RSM-009 (accepted)
2. After "effective date" (immediate in test):
   → Simulator enqueues RSM-007 (master data) on MasterData queue
   → Simulator enqueues RSM-012 (first day of metering data) on Timeseries queue
3. System peeks MasterData → parses RSM-007 → creates metering point
4. System peeks Timeseries → parses RSM-012 → stores metering data
5. Repeat step 4 for 30 days (30 RSM-012 messages)
6. System runs settlement → produces invoice lines
```

### Scenario 2: Correction

```
1. Simulator enqueues RSM-012 (original: 1.5 kWh for hour 14:00)
2. System stores data
3. System runs settlement → original invoice
4. Simulator enqueues RSM-012 (correction: 2.0 kWh for hour 14:00)
5. System detects delta (+0.5 kWh), calculates financial impact
6. System generates credit/debit note
```

### Scenario 3: Rejection and retry

```
1. System sends BRS-001 with incorrect CPR
   → Simulator returns RSM-009 (rejected, reason: CPR mismatch)
2. System updates customer record
3. System sends BRS-001 again with correct CPR
   → Simulator returns RSM-009 (accepted)
```

### Scenario 4: Token expiry during polling

```
1. Simulator issues token with 5-second TTL
2. System starts polling → first peek succeeds
3. Token expires
4. Next peek → Simulator returns 401
5. System fetches new token → retries → succeeds
```

### Scenario 5: DataHub unavailable

```
1. Simulator configured to return 503 for all requests
2. System retries with exponential backoff
3. After N retries, simulator starts returning 200
4. System resumes normal operation
5. No messages lost (at-least-once guarantee)
```

### Scenario 6: Malformed message

```
1. Simulator enqueues invalid CIM JSON (missing required fields)
2. System attempts to parse → fails
3. Message goes to dead-letter table
4. System dequeues to free the queue
5. Next message (valid) is processed normally
```

### Scenario 7: Full offboarding (aconto customer)

```
1. Metering point is active with 2 months of data
2. Simulator sends notification: incoming BRS-001 from another DDQ
3. Simulator enqueues final RSM-012 (up to switch date)
4. System marks metering point inactive
5. System runs final settlement (partial period)
6. System calculates aconto settlement (actual vs. paid)
7. Final invoice generated
```

### Scenario 8: Wholesale reconciliation discrepancy

```
1. System has completed settlement for grid area 344, January
2. Simulator enqueues RSM-014 with aggregated data that differs by 50 kWh
3. System detects discrepancy
4. System sends RSM-016 request for detailed data
5. Simulator returns detailed RSM-014 response
6. System identifies the deviating metering point
7. System sends RSM-015 request for historical data
8. Simulator returns corrected RSM-012
9. System recalculates and the discrepancy resolves
```

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Real CIM JSON differs from our fixtures** | Parser breaks in Actor Test | High | Capture real messages early. Build parser to tolerate unknown fields. Add every failing message to fixture library |
| **Actor Test access delayed** | Cannot validate against real DataHub | Medium | Simulator covers most cases. Apply for access in Phase 0 |
| **Correction detection misses edge cases** | Incorrect invoices | Medium | Comprehensive unit tests. Golden master tests. Compare against manual calculation |
| **Settlement rounding differs from DataHub** | Reconciliation discrepancies | High | Test with real RSM-014 data. Match DataHub's rounding rules (WARNING: VERIFY) |
| **Queue behavior differs from documentation** | Poller fails in production | Medium | Actor Test validation. Test peek/dequeue sequencing |
| **Rate changes mid-period** | Incorrect tariff application | Medium | Time-differentiated rate lookup with `valid_from`/`valid_to`. Unit tests with rate changes |
| **PT15M transition** | 4x data volume, different resolution handling | Low (future) | Phase 6. Parser already supports PT15M. Load test with simulator |
| **OAuth2 token edge cases** | Authentication failures | Low | Simulator tests for expiry, renewal, concurrent requests |
| **CIM schema version change** | Parser breaks after DataHub update | Medium | Monitor Energinet release notes. Fixture versioning. Parser tolerance for unknown fields |
| **Spot price provider unavailable** | Settlement cannot run | Low | Alert + retry. Settlement engine halts gracefully for missing prices |

---

## Key Design Decisions for Testability

### 1. Interface-driven DataHub client

All DataHub communication goes through an interface:

```
IDataHubClient
  ├── PeekTimeseries() → CimMessage?
  ├── PeekMasterData() → CimMessage?
  ├── PeekCharges() → CimMessage?
  ├── PeekAggregations() → CimMessage?
  ├── Dequeue(messageId) → void
  ├── SubmitRequest(brsRequest) → CimResponse
  └── GetToken() → string
```

Three implementations:
- `FakeDataHubClient` — in-memory, for unit/domain tests
- `SimulatorDataHubClient` — points to Docker simulator, for integration tests
- `RealDataHubClient` — points to DataHub (Actor Test / Preprod / Prod)

Switching between them is a configuration change, not a code change.

### 2. Deterministic settlement engine

The settlement engine takes **all inputs as parameters** — no implicit state:

```
SettlementResult Calculate(
    MeteringData[] consumption,
    SpotPrice[] prices,
    TariffRate[] tariffs,
    ProductPlan plan,
    Period billingPeriod
)
```

This makes it trivially testable: provide known inputs → assert known outputs.

### 3. Fixture-driven test data

No random test data. All tests use deterministic fixtures with pre-calculated expected results. Fixtures are version-controlled alongside the code.

### 4. Contract tests for CIM messages

Every CIM message type has a contract test that:
1. Loads a fixture file
2. Parses it with our parser
3. Re-serializes it
4. Asserts the output matches the input (round-trip)

If Energinet changes the CIM format, these tests break immediately.

---

## CI/CD Pipeline

```
Push to main
    │
    ├── Build (.NET restore + build)
    │
    ├── Unit tests (settlement calc, CIM parsing, domain logic)
    │   └── Fail → block merge
    │
    ├── Integration tests (Docker Compose: simulator + database)
    │   └── Fail → block merge
    │
    ├── Container build (Docker images)
    │
    ├── Deploy to staging
    │
    └── (Manual gate) E2E smoke test against Actor Test
        └── Fail → investigate, add fixture, fix parser
```

---

## Timeline Summary

| Phase | Weeks | Focus | Key deliverable |
|-------|-------|-------|----------------|
| 0 | 1-3 | Foundation + simulator | Docker Compose with simulator, DB, CI/CD |
| 1 | 4-8 | Metering data ingestion | RSM-012 → parsed → stored. Correction detection |
| 2 | 9-14 | Portfolio + master data | BRS-001 lifecycle. Metering point management |
| 3 | 15-22 | Settlement engine | Golden master tests pass. Invoice lines correct |
| 4 | 23-28 | Full lifecycle | All BRS processes. Final settlement |
| 5 | 29-34 | Wholesale reconciliation | RSM-014 comparison. Discrepancy resolution |
| 6 | 35-40 | Actor Test validation | Real DataHub messages. Parser hardening |

**Total:** ~40 weeks for a working system validated against Energinet's test environment.

**Critical path:** Actor Test access. Apply in Phase 0. If access is delayed, Phase 6 shifts but Phases 0-5 proceed against the simulator.

---

## Sources

- [Settlement overview](datahub3-settlement-overview.md) — what settlement is and how it works
- [System architecture](datahub3-proposed-architecture.md) — phased rollout, technology choices, cost estimates
- [Customer lifecycle](datahub3-customer-lifecycle.md) — phases from onboarding to closing
- [RSM-012 reference](rsm-012-datahub3-measure-data.md) — CIM message format, API endpoints, correction flow
- [Authentication and security](datahub3-authentication-security.md) — OAuth2, test environments, credentials
- [Edge cases and error handling](datahub3-edge-cases.md) — corrections, reconciliation, concurrent processes
- [Business processes](datahub3-ddq-business-processes.md) — BRS/RSM reference for all processes
- [Product structure and billing](datahub3-product-and-billing.md) — invoice lines, aconto, payment models
- [CIS platform and external systems](datahub3-cis-and-external-systems.md) — ERP, portal, payment integrations
- [Database model](datahub3-database-model.md) — PostgreSQL/TimescaleDB schema
