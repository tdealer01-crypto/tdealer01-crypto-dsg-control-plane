# Backend Production Cutover Standard

This reference locks the backend direction for the SaaS control-plane repo.

## Non-negotiable backend rule

The SaaS product must not rely on static UI, mock API responses, browser state, localStorage, or server-memory stores as source-of-truth for production flows.

Production state must be DB-backed and audit-backed.

## Backend scope

### 1. DB-backed workflow state

Required state transitions:

- `submit`
- `approve`
- `reject`
- `escalate`
- `execute`
- `commit`

Each transition must persist:

- organization / tenant scope
- actor / agent identity
- action type
- previous state
- next state
- policy decision
- request hash
- decision hash
- audit record hash
- timestamp

### 2. Repository layer

All production reads/writes must pass through a server-side repository layer.

Suggested modules:

- `lib/repositories/actions.ts`
- `lib/repositories/audit.ts`
- `lib/repositories/organizations.ts`
- `lib/repositories/entitlements.ts`
- `lib/repositories/runtime.ts`

Rules:

- no route writes directly to unscoped DB helpers
- no dashboard reads from local demo state
- org scope is required for every query
- RBAC is checked before every critical write/read

### 3. Action API routes

Required production API routes:

- `POST /api/actions/submit`
- `POST /api/actions/approve`
- `POST /api/actions/reject`
- `POST /api/actions/escalate`
- `POST /api/execute`
- `POST /api/spine/execute`
- `POST /api/ledger/commit`
- `GET /api/audit`
- `GET /api/ledger/verify`
- `GET /api/health`
- `GET /api/readiness`

### 4. Governance decision model

Allowed decision states:

- `ALLOW`
- `BLOCK`
- `REVIEW`
- `ASK_MORE_INFO`

Allowed permission verdicts:

- `allow`
- `needs user takeover`
- `deny`

Every decision must include:

- `decision_id`
- `tenant_id`
- `agent_id`
- `tool`
- `action`
- `effect`
- `matched_rule_id`
- `reason`
- `input_hash`
- `decision_hash`
- `created_at`

### 5. Audit ledger

Every critical route must create an audit record.

Audit record must include:

- previous hash
- record hash
- request payload hash
- decision hash
- actor identity
- tenant/org scope
- route/action name
- result status

Hashing must use stable JSON with sorted keys.

### 6. Entitlement gate

Before action execution, backend must check:

- plan
- seat limit
- quota
- feature entitlement
- tool entitlement
- org active status

Failure must return deterministic error shape.

### 7. Health/readiness

`/api/health` should prove process-level liveness.

`/api/readiness` should prove production dependencies are usable:

- DB reachable
- required env present
- migrations compatible
- audit write/read works or is explicitly disabled in non-prod
- billing/entitlement config present in production

### 8. Acceptance tests

Minimum tests:

- low-trust agent is blocked
- critical action requires approval
- approved action writes DB and audit
- dashboard read endpoint reflects persisted state
- cross-org access is denied
- entitlement quota exceeded is denied
- audit hash chain verifies
- readiness fails when required production env is missing

## Stop list

Do not add:

- new mock route
- new in-memory production store
- new localStorage source-of-truth
- demo-only workflow state
- UI-only launch claim

## GO condition

Backend is considered production-connected only when:

1. critical writes persist to DB,
2. critical reads come from DB,
3. audit evidence exists for each state transition,
4. RBAC/org isolation is enforced server-side,
5. entitlement gate can deny,
6. health/readiness are green,
7. CI build/test passes.
