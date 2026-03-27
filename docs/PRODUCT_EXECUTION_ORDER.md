# Product Execution Order

## Product truth

DSG ONE = deterministic control plane for autonomous agents.

Core chain:
- Deterministic Gate
- Evidence Trail
- Mission Control

## Repo roles

### Primary product repo
`tdealer01-crypto-dsg-control-plane`
- public site
- dashboard
- auth
- billing
- agents
- usage
- product API shell

### Canonical engine repo
`DSG-Deterministic-Safety-Gate`
- deterministic gate
- invariants
- harmonics
- stability
- proof hash
- ledger contract

### UX donor repo
`DSG-ONE`
- proof UX
- replay UX
- ledger UX
- operator interaction patterns

### Future runtime repo
`dsg-architect-mobile`
- mobile runtime after SaaS core is stable

## Non-negotiable rules

1. All decisions come from DSG core.
2. Control-plane is the only customer-facing product shell.
3. Every execution must produce evidence.
4. Billing must reflect execution usage.
5. No second heuristic gate in production.
6. Mobile ships after SaaS core is stable.

## Current blockers

### A. API mismatch
Control-plane expects:
- POST /execute
- GET /metrics
- GET /ledger
- GET /audit/events
- GET /audit/determinism/:sequence

Current DSG reference node exposes:
- GET /health
- POST /evaluate
- GET /ledger/verify

### B. Dual decision logic
`DSG-ONE` has app-local decision logic.
Production must use one canonical decision engine only.

### C. Split evidence model
Proof and ledger UX exist in `DSG-ONE`, but production persistence belongs in control-plane.

## Keep / migrate / drop

### Keep
In control-plane:
- pricing
- checkout
- webhook sync
- Supabase persistence
- agent creation
- usage accounting
- dashboard shell

In DSG core:
- schemas
- gate logic
- harmonics
- stability
- proof hash
- ledger semantics

### Migrate
From `DSG-ONE` into control-plane:
- proof explorer UX
- replay UX
- ledger browsing UX
- mission-control execution stream

### Drop from production path
- local heuristic decision logic in `DSG-ONE`
- local lowdb as production evidence storage
- any execution path that bypasses DSG core

## Build order

### Phase 1
Use `tdealer01-crypto-dsg-control-plane` as the main product shell.

### Phase 2
Add production endpoints to `DSG-Deterministic-Safety-Gate`:
- POST /execute
- GET /metrics
- GET /ledger
- GET /audit/events
- GET /audit/determinism/{sequence}

### Phase 3
Remove second decision-engine behavior from production flows.

### Phase 4
Move proof, replay, and ledger UX from `DSG-ONE` into control-plane.

### Phase 5
Make evidence durable in Supabase/Postgres.

### Phase 6
Enforce live quotas and subscription entitlements.

### Phase 7
Add replay protection, idempotency, integrity, and CI hardening.

### Phase 8
Ship mobile as a governed runtime under the same decision plane.

## Launch definition of done

The product is sellable when:
1. public site explains the product clearly
2. pricing is live
3. checkout is live
4. login works
5. agent creation works
6. /api/execute works against DSG core
7. dashboard shows real decisions
8. proof and ledger open in product shell
9. usage updates after execution
10. subscription state changes entitlements
11. health and audit come from real DSG core endpoints
12. there is one decision engine in production

## Final operating rule

- build from control-plane
- trust DSG core
- mine DSG-ONE for UX only
- ship mobile after SaaS core stabilizes

One product. One gate. One ledgered truth.
