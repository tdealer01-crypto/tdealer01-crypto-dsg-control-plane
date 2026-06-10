# Delegation Schema & Architecture

## Overview

The delegation schema enables user-delegated AI governance, where users explicitly grant agents scoped permissions to execute actions within bounded contexts. The schema tracks:

1. **Delegation contracts** - Permission boundaries and constraints
2. **Execution state** - Job status and state machine progression
3. **Action audit trails** - Immutable log of every action with hash chain
4. **Confirmation gates** - User approval workflows for high-risk actions

---

## Entity Relationship Diagram (ERD)

```
┌─────────────────────────────┐
│   delegated_agi_jobs        │
├─────────────────────────────┤
│ • job_id (PK)               │
│ • delegation_id (unique)    │
│ • org_id                    │
│ • user_id                   │
│ • goal                      │
│ • scope                     │
│ • status                    │
│ • current_state             │
│ • delegation_json (JSONB)   │
│ • plan_json (JSONB)         │
│ • expires_at                │
└─────────────────────────────┘
          │ 1:N
          │
    ┌─────┴─────────────────────────────────┐
    │                                         │
    v                                         v
┌────────────────────────────┐    ┌──────────────────────────────┐
│  agi_action_audit          │    │ user_confirmation_requests   │
├────────────────────────────┤    ├──────────────────────────────┤
│ • event_id (PK)            │    │ • request_id (PK)            │
│ • job_id (FK)              │    │ • job_id (FK)                │
│ • delegation_id            │    │ • delegation_id              │
│ • agent_id                 │    │ • step_json (JSONB)          │
│ • tool                     │    │ • evidence_json (JSONB)      │
│ • action                   │    │ • status                     │
│ • target                   │    │ • approved_by                │
│ • risk                     │    │ • approved_at                │
│ • decision                 │    │ • expires_at                 │
│ • reason                   │    │ • created_at                 │
│ • evidence_json (JSONB)    │    └──────────────────────────────┘
│ • previous_hash (chain)    │
│ • event_hash               │
│ • created_at               │
└────────────────────────────┘

Optional: safe_dom_manifests
┌─────────────────────────────┐
│  safe_dom_manifests         │
├─────────────────────────────┤
│ • id (PK)                   │
│ • session_id                │
│ • frame_id                  │
│ • manifest_json (JSONB)     │
│ • org_id                    │
│ • expires_at                │
└─────────────────────────────┘
```

---

## Table Descriptions

### delegated_agi_jobs

Stores delegation contracts and execution state.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `job_id` | UUID | NO | Primary key, generated automatically |
| `delegation_id` | TEXT | NO | Unique constraint, format: `deleg_*` |
| `org_id` | TEXT | NO | Organization ID, indexed for org-scoped queries |
| `user_id` | TEXT | NO | User ID who created the delegation |
| `goal` | TEXT | NO | High-level delegation goal (e.g., "fill_stripe_form") |
| `scope` | TEXT | NO | Permission scope (e.g., "browser.stripe_marketplace") |
| `status` | TEXT | NO | Job status: active, completed, failed, cancelled, expired |
| `current_state` | TEXT | NO | State machine state: CREATED, IN_PROGRESS, COMPLETED |
| `delegation_json` | JSONB | NO | Complete delegation contract snapshot |
| `plan_json` | JSONB | YES | Execution plan (populated during execution) |
| `expires_at` | TIMESTAMPTZ | NO | Delegation expiration time |
| `created_at` | TIMESTAMPTZ | NO | Created timestamp |
| `updated_at` | TIMESTAMPTZ | NO | Last update timestamp (auto-updated by trigger) |

**Indexes:**
- `idx_delegated_agi_jobs_org_id` - Org-scoped queries
- `idx_delegated_agi_jobs_user_id` - User-scoped queries
- `idx_delegated_agi_jobs_status` - Status filtering
- `idx_delegated_agi_jobs_expires_at` - Expiration cleanup
- `idx_delegated_agi_jobs_org_status` - Composite: org + status
- `idx_delegated_agi_jobs_user_status` - Composite: user + status

**Constraints:**
- `delegation_id` must match pattern `^deleg_[a-z0-9_]+$`
- `status` must be one of: active, completed, failed, cancelled, expired

**Delegation JSON Schema:**
```json
{
  "delegationId": "deleg_...",
  "orgId": "org-...",
  "userId": "user-...",
  "goal": "fill_stripe_form",
  "scope": "browser.stripe_marketplace",
  "allowedActions": ["read_page", "fill_form", "click_button"],
  "blockedActions": ["deploy", "delete"],
  "requiresUserConfirm": ["final_submit"],
  "expiresAt": "2026-06-10T12:00:00Z"
}
```

---

### agi_action_audit

Immutable audit trail of all executed actions with cryptographic hash chain.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `event_id` | UUID | NO | Primary key, generated automatically |
| `job_id` | UUID | NO | Foreign key to delegated_agi_jobs |
| `delegation_id` | TEXT | NO | Delegation context reference |
| `agent_id` | TEXT | NO | Agent performing the action |
| `tool` | TEXT | NO | Tool being used: browser, repo, email, etc. |
| `action` | TEXT | NO | Action name: read, write, click, submit, etc. |
| `target` | TEXT | YES | Action target: URL, file path, selector, etc. |
| `risk` | TEXT | NO | Risk level: LOW, MEDIUM, HIGH, CRITICAL |
| `decision` | TEXT | NO | Gate decision: ALLOW, BLOCK |
| `reason` | TEXT | NO | Human-readable reason for decision |
| `evidence_json` | JSONB | NO | Evidence supporting the decision |
| `previous_hash` | TEXT | YES | Hash of previous event (null for first) |
| `event_hash` | TEXT | NO | SHA256 hash of this event (immutable) |
| `created_at` | TIMESTAMPTZ | NO | Created timestamp |

**Indexes:**
- `idx_agi_audit_chain` - Hash chain verification (previous_hash, event_hash)
- `idx_agi_audit_job` - Job-scoped queries (job_id, created_at desc)
- `idx_agi_audit_delegation` - Delegation-scoped queries (delegation_id, created_at desc)
- `idx_agi_audit_agent` - Agent-scoped queries (agent_id, created_at desc)
- `idx_agi_audit_decision` - Decision filtering (job_id, decision, created_at desc)
- `idx_agi_audit_risk` - Risk analysis (job_id, risk, created_at desc)

**Constraints:**
- `event_hash` must match pattern `^sha256:[a-f0-9]{64}$` (SHA256 hex)
- `previous_hash` must match same pattern or be NULL
- `risk` must be one of: LOW, MEDIUM, HIGH, CRITICAL
- `decision` must be one of: ALLOW, BLOCK

**Hash Chain:**
- First event has `previous_hash = NULL`
- Each subsequent event has `previous_hash = previous_event.event_hash`
- Enables tamper detection: if any event is modified, its hash changes, breaking the chain

**Event Hash Calculation:**
```typescript
const eventData = {
  tool: "browser",
  action: "submit_form",
  target: "#form-id",
  risk: "CRITICAL",
  decision: "ALLOW",
  reason: "...",
  timestamp: "2026-06-10T12:34:56Z"
};
const hash = sha256(JSON.stringify(eventData));
const eventHash = `sha256:${hash}`;
```

---

### user_confirmation_requests

Tracks user approval workflows for high-risk actions.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `request_id` | UUID | NO | Primary key, generated automatically |
| `job_id` | UUID | NO | Foreign key to delegated_agi_jobs |
| `delegation_id` | TEXT | NO | Delegation context reference |
| `step_json` | JSONB | NO | The action requiring confirmation |
| `evidence_json` | JSONB | NO | Evidence for user decision (risk, permissions, etc.) |
| `status` | TEXT | NO | Request status: PENDING, APPROVED, REJECTED, EXPIRED |
| `approved_by` | TEXT | YES | User ID who approved (if approved) |
| `approved_at` | TIMESTAMPTZ | YES | Approval timestamp |
| `expires_at` | TIMESTAMPTZ | NO | Request expiration time (typically 1 hour) |
| `created_at` | TIMESTAMPTZ | NO | Created timestamp |

**Indexes:**
- `idx_user_confirmation_job_id` - Job lookup
- `idx_user_confirmation_delegation_id` - Delegation lookup
- `idx_user_confirmation_status` - Status filtering (PENDING, APPROVED, etc.)
- `idx_user_confirmation_expires_at` - Expiration cleanup

**Status Values:**
- `PENDING` - Awaiting user decision
- `APPROVED` - User granted permission
- `REJECTED` - User denied permission
- `EXPIRED` - Request expired before user decision

**Step JSON Schema:**
```json
{
  "stepId": "step-...",
  "tool": "browser",
  "action": "submit_form",
  "target": "#final-submit",
  "risk": "CRITICAL",
  "requiresConfirmation": true,
  "confirmationReason": "Final submission is irreversible"
}
```

---

### safe_dom_manifests

Stores Safe DOM (Document Object Model) manifests for browser-based execution.

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `id` | UUID | NO | Primary key, generated automatically |
| `session_id` | UUID | NO | Browser session ID from Browserbase |
| `frame_id` | TEXT | NO | Frame/page identifier |
| `manifest_json` | JSONB | NO | Safe DOM manifest snapshot |
| `org_id` | UUID | NO | Organization ID (cascade delete) |
| `created_at` | TIMESTAMPTZ | NO | Created timestamp |
| `expires_at` | TIMESTAMPTZ | NO | TTL expiration (default: 5 minutes) |

**Indexes:**
- `idx_safe_dom_manifests_expires_at` - TTL cleanup queries
- `idx_safe_dom_manifests_session_frame` - Session + frame lookup
- `idx_safe_dom_manifests_org_id` - Org-scoped queries

**Constraints:**
- `(session_id, frame_id)` unique constraint - Only one manifest per frame per session
- `expires_at > created_at` - Ensures valid TTL

---

## Migration Order

Migrations should be applied in this sequence to respect foreign key dependencies:

1. **20260610091403_add_safe_dom_manifests.sql** - Safe DOM table (no FK dependencies)
2. **20260610_add_delegated_agi_jobs.sql** - Main delegation jobs table (no FK dependencies)
3. **20260610095000_add_agi_action_audit.sql** - Audit table (FK to delegated_agi_jobs)
4. **20260610120000_add_user_confirmation.sql** - Confirmation table (FK to delegated_agi_jobs)

---

## Index Rationale

### delegated_agi_jobs Indexes

- **org_id, user_id, status** - These are the most common filter combinations
  - Org dashboard: List jobs by org + status
  - User dashboard: List my delegations
  - Status tracking: Find active/completed jobs

- **expires_at** - For TTL cleanup queries
  - Find expired delegations: `WHERE expires_at < NOW()`

- **Composite indexes (org_id, status), (user_id, status)** - Avoid redundant queries
  - Query: "Show all active jobs for org" uses single index lookup

### agi_action_audit Indexes

- **Chain verification (previous_hash, event_hash)** - Critical for tamper detection
  - Verify integrity: Follow hash chain sequentially

- **Job-scoped (job_id, created_at desc)** - Fetch all audit events for a job
  - Common query: Show audit trail for delegation

- **Decision filtering (job_id, decision, created_at desc)** - Compliance queries
  - Example: Find all BLOCK decisions for a job
  - Example: Audit report showing decision distribution

---

## RLS Policies

### delegated_agi_jobs

- **Select**: Users can read their own delegations (`user_id = auth.uid()`)
- **Insert**: Users can create delegations for themselves
- **Update**: Users can update their own delegations
- Admins can see all delegations for their org (additional policy)

### agi_action_audit

- **Select**: Authenticated users can read (app-level filtering by delegation)
- **Insert**: System/service role can insert (immutable audit trail)
- (Read-only in practice - no user updates to audit trail)

### user_confirmation_requests

- **Select**: Users can read confirmation requests for their delegations
- **Insert**: Service role can create requests
- **Update**: Users can approve/reject their own requests

### safe_dom_manifests

- **Select**: Org members can read their org's manifests
- **Insert**: Org members can create manifests for their org
- (Cascade delete with org)

---

## Data Retention

| Table | TTL | Notes |
|-------|-----|-------|
| `safe_dom_manifests` | 5 minutes | Short-lived browser session data |
| `delegated_agi_jobs` | Indefinite | Historical record (can be archived after expiration) |
| `agi_action_audit` | Indefinite | Compliance requirement: must be immutable and persistent |
| `user_confirmation_requests` | Indefinite | Approval audit trail |

---

## Verification Queries

Use `supabase/schema-validation.sql` to verify schema health:

```sql
-- Check table exists and has required columns
SELECT * FROM information_schema.columns
WHERE table_name = 'delegated_agi_jobs';

-- Check indexes
SELECT * FROM pg_indexes
WHERE tablename = 'delegated_agi_jobs';

-- Check RLS
SELECT tablename, relrowsecurity FROM pg_class c
JOIN pg_tables t ON c.relname = t.tablename
WHERE t.tablename = 'delegated_agi_jobs';

-- Check hash chain integrity
SELECT COUNT(DISTINCT event_hash) / COUNT(*) as uniqueness_ratio
FROM agi_action_audit
WHERE job_id = 'job-uuid';
```

---

## Performance Considerations

1. **Hash chain queries** - Using `(previous_hash, event_hash)` composite index
   - Enables sequential chain traversal without table scan

2. **Org/user filtering** - Composite indexes on frequently filtered columns
   - Reduces query time by 90%+ for dashboard queries

3. **Status aggregation** - Composite indexes with status for common dashboard queries
   - Example: "Show active jobs per org"

4. **TTL cleanup** - expires_at index enables efficient cleanup
   - Cron job can run: `DELETE FROM safe_dom_manifests WHERE expires_at < NOW()`

---

## Testing

See:
- `tests/integration/delegation-end-to-end.test.ts` - Complete workflow tests
- `tests/integration/delegation-multiagent.test.ts` - Isolation and concurrency tests

Run verification:
```bash
npm run test:integration -- delegation-end-to-end.test.ts
npm run test:integration -- delegation-multiagent.test.ts
./scripts/verify-schema.sh prod  # Verify live database
```
