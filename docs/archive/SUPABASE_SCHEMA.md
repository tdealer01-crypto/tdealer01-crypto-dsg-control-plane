# Supabase Schema Documentation

This document describes the database schema for the DSG ONE / ProofGate Control Plane, including table structures, relationships, RLS policies, and indexes.

---

## Phase 1 Tables (2026-07-30)

### `feature_flags`

**Purpose**: Runtime feature rollout control, per-org enablement, and gradual deployment.

**Columns**:
- `id` (UUID, PK): Unique identifier
- `name` (TEXT, UNIQUE): Feature flag name (e.g., "enable_z3_verification")
- `description` (TEXT): Human-readable description
- `owner` (TEXT): Owner/team responsible for the flag
- `enabled_for_orgs` (UUID[]): Array of org IDs with this feature enabled
- `rollout_percentage` (INT): 0-100% rollout (0 = disabled, 100 = fully rolled out)
- `retire_date` (TIMESTAMPTZ): Optional date after which flag expires
- `created_at` (TIMESTAMPTZ): Creation timestamp
- `updated_at` (TIMESTAMPTZ): Last update timestamp

**Indexes**:
- `idx_feature_flags_name` — fast lookup by feature name
- `idx_feature_flags_owner` — filter by owner
- `idx_feature_flags_retire_date` — find expired flags

**RLS Policies**:
- **Read** (`feature_flags_org_read`): All authenticated users (public read)
- **Insert** (`feature_flags_admin_write`): Admin role only
- **Update** (`feature_flags_admin_update`): Admin role only
- **Delete** (`feature_flags_admin_delete`): Admin role only

**Triggers**:
- `update_feature_flags_updated_at` — auto-update `updated_at` on every change

**Usage Example**:
```typescript
// Check if feature is enabled for org
const { data: flags } = await supabase
  .from('feature_flags')
  .select('*')
  .eq('name', 'enable_z3_verification')
  .single();

const enabled = flags.enabled_for_orgs.includes(orgId);
```

---

### `audit_log`

**Purpose**: Immutable append-only operational audit trail for compliance, evidence collection, and post-incident investigation.

**Columns**:
- `id` (UUID, PK): Unique identifier
- `org_id` (UUID): Organization context
- `actor_id` (UUID): User/service/agent performing the action
- `actor_type` (VARCHAR 50): 'user', 'system', 'service', 'agent'
- `action` (VARCHAR 100): Action type (e.g., 'create', 'update', 'delete', 'approve', 'execute', 'block')
- `resource_type` (VARCHAR 50): Resource being acted upon (e.g., 'policy', 'agent', 'execution')
- `resource_id` (VARCHAR 255): ID of the resource
- `resource_name` (VARCHAR 255): Human-readable resource name
- `result` (VARCHAR 20): Outcome ('SUCCESS', 'FAILED', 'DENIED', 'REVIEW', 'BLOCK')
- `details` (JSONB): Action-specific details (flexible schema)
- `change_summary` (TEXT): Human-readable summary of changes
- `request_id` (UUID): Link to runtime request/intent
- `execution_id` (UUID): Link to execution record
- `ip_address` (INET): Source IP address
- `user_agent` (TEXT): HTTP user agent
- `correlation_id` (TEXT): Trace ID for related events
- `created_at` (TIMESTAMPTZ, NOT NULL): Immutable creation time

**Constraints**:
- `audit_log_immutable` — ensures `created_at` is always set (append-only enforcement)

**Indexes**:
- `idx_audit_log_org_created` — most common query (org + time)
- `idx_audit_log_actor` — filter by actor
- `idx_audit_log_resource` — filter by resource
- `idx_audit_log_action` — filter by action type
- `idx_audit_log_result` — filter by outcome
- `idx_audit_log_org_action_time` — complex queries
- `idx_audit_log_request_id` — trace to request
- `idx_audit_log_execution_id` — trace to execution
- `idx_audit_log_created_at` — time-based queries

**RLS Policies**:
- **Read** (`audit_log_org_members_read`): Org members can read their org's logs
- **Insert** (`audit_log_service_insert`): Service role only (server-side)
- **Delete**: Prevented (append-only)

**Helper Function**:
```sql
SELECT audit_log_action(
  p_org_id := org_id,
  p_actor_id := user_id,
  p_actor_type := 'user',
  p_action := 'execute',
  p_resource_type := 'policy',
  p_resource_id := policy_id,
  p_result := 'SUCCESS'
);
```

**Usage Example**:
```typescript
// Log an approval decision
await supabase.rpc('audit_log_action', {
  p_org_id: orgId,
  p_actor_id: userId,
  p_action: 'approve',
  p_resource_type: 'execution',
  p_resource_id: executionId,
  p_result: 'SUCCESS',
  p_change_summary: 'Approved Z3 verification for policy v2'
});

// Query audit trail for an agent
const { data: logs } = await supabase
  .from('audit_log')
  .select('*')
  .eq('org_id', orgId)
  .eq('resource_type', 'agent')
  .eq('resource_id', agentId)
  .order('created_at', { ascending: false })
  .limit(100);
```

---

### `delivery_proofs`

**Purpose**: Tracks production readiness proofs, health checks, and deployment verification results. Used to generate shareable compliance/readiness reports.

**Columns**:
- `id` (UUID, PK): Unique identifier
- `org_id` (UUID): Organization context
- `target_url` (TEXT): The URL being verified (e.g., production deployment)
- `repo_url` (TEXT): Optional repository URL for context
- `readiness_path` (TEXT): Custom readiness endpoint (default: `/api/readiness`)
- `status` (VARCHAR 20): Overall status ('PENDING', 'PASS', 'FAIL', 'PARTIAL')
- `checks` (JSONB): Individual check results:
  ```json
  {
    "health": { "status": "pass", "timestamp": "...", "response_time_ms": 123 },
    "readiness": { "status": "pass", "timestamp": "...", "message": "ready" },
    "auth": { "status": "pass", "timestamp": "...", "description": "auth rejection OK" },
    "repo": { "status": "pass", "timestamp": "...", "message": "repo URL found" }
  }
  ```
- `report_id` (TEXT): Reference to `delivery_proof_reports(run_id)`
- `created_at` (TIMESTAMPTZ): Proof creation time
- `expires_at` (TIMESTAMPTZ): Expiry date (default: now + 90 days)
- `verified_at` (TIMESTAMPTZ): When verification completed
- `created_by` (UUID): User who initiated the scan
- `notes` (TEXT): Additional observations

**Indexes**:
- `idx_delivery_proofs_org` — org + time
- `idx_delivery_proofs_status` — filter by pass/fail
- `idx_delivery_proofs_target_url` — find proofs for URL
- `idx_delivery_proofs_expires_at` — find expired proofs
- `idx_delivery_proofs_verified_at` — time-based queries
- `idx_delivery_proofs_org_status` — org + status + time

**RLS Policies**:
- **Read** (`delivery_proofs_org_read`): Org members can read
- **Insert** (`delivery_proofs_org_insert`): Org members can create
- **Update** (`delivery_proofs_org_update`): Org members can update
- **Insert** (`delivery_proofs_service_insert`): Service role (automated scans)
- **Update** (`delivery_proofs_service_update`): Service role (update results)

**Helper Function**:
```sql
SELECT record_delivery_proof(
  p_org_id := org_id,
  p_target_url := 'https://prod.example.com',
  p_status := 'PASS',
  p_checks := '{"health": {"status": "pass"}}'::jsonb
);
```

**Usage Example**:
```typescript
// Record a proof scan
const proofId = await supabase.rpc('record_delivery_proof', {
  p_org_id: orgId,
  p_target_url: 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
  p_status: 'PASS',
  p_checks: {
    health: { status: 'pass', response_time_ms: 45 },
    readiness: { status: 'pass', message: 'ready' },
    auth: { status: 'pass' },
    repo: { status: 'pass' }
  }
});

// Query proofs for an org
const { data: proofs } = await supabase
  .from('delivery_proofs')
  .select('*')
  .eq('org_id', orgId)
  .eq('status', 'PASS')
  .order('created_at', { ascending: false })
  .limit(10);
```

---

## Existing Tables with Phase 1 Enhancements

### `executions`

**Phase 1 Enhancement**: Added performance indexes for usage metrics and analytics.

**New Indexes** (from migration `20260730000004_add_usage_metrics_indexes.sql`):
- `idx_executions_decision_created` — analytics by decision type
- `idx_executions_policy_version_created` — policy version tracking
- `idx_executions_org_created` — org-level analytics
- `idx_executions_org_decision_created` — complex org + decision queries
- `idx_executions_agent_created` — agent-level analytics
- `idx_executions_latency_created` — slow query analysis (> 100ms)
- `idx_executions_created_desc` — date-based queries

**Usage**: These indexes support efficient queries for usage reports, performance dashboards, and compliance evidence collection.

---

## Entity Relationships

```
organizations (id)
├── feature_flags (org_id NOT IN, uses enabled_for_orgs array)
├── audit_log (org_id) ← appends all operational events
├── delivery_proofs (org_id) ← tracks deployment readiness
└── executions (org_id) → runtime governance decisions
    ├── request_id → runtime_approval_requests
    ├── execution_id → audit_log (backref)
    └── policy_version → ai_policies (policy version)
```

---

## Schema Maintenance Guidelines

### Adding New Audit Events

Always use the `audit_log_action()` helper function to ensure consistent field population:

```sql
-- From application code
SELECT audit_log_action(
  p_org_id := org_id,
  p_actor_id := current_user_id,
  p_action := 'update',
  p_resource_type := 'policy',
  p_resource_id := policy_id,
  p_result := 'SUCCESS',
  p_details := jsonb_build_object('version', new_version),
  p_change_summary := 'Policy rules updated'
);
```

### Querying Audit Logs

Always scope to org first for performance:

```typescript
// GOOD: Org + time range + action
const { data } = await supabase
  .from('audit_log')
  .select('*')
  .eq('org_id', orgId)
  .eq('action', 'execute')
  .gte('created_at', startDate)
  .lte('created_at', endDate)
  .order('created_at', { ascending: false });

// AVOID: Full table scan
const { data } = await supabase
  .from('audit_log')
  .select('*')
  .eq('resource_type', 'execution'); // Missing org_id
```

### Partitioning Strategy

For very large audit logs (millions of rows), consider time-based partitioning:

```sql
-- Example: partition by month
CREATE TABLE audit_log_202607 PARTITION OF audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
```

### Retention Policy

Audit logs are append-only by default. Implement retention policies outside the database:

```typescript
// Example cleanup routine (run in cron)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

// Soft-delete via application code (don't actually delete for compliance)
// Or export to cold storage before deletion
```

---

## Migration Validation

After applying migrations, verify all tables and indexes:

```bash
# Using Supabase CLI
supabase db pull  # Verify local schema reflects production
npm run typecheck  # TypeScript type checking

# Using psql
psql $DATABASE_URL -c "\dt+ feature_flags"  # List tables
psql $DATABASE_URL -c "\di+ idx_audit_log_org_created"  # List indexes
```

Regenerate TypeScript types after migrations:

```bash
SUPABASE_PROJECT_ID=your_project_id npm run db:types
npm run typecheck
```

---

## Phase 2 Preparation (Not Yet Applied)

The following table is drafted for Phase 2 (Z3 formal proof integration) but **not yet applied**:

**Table**: `dsg_gate_decisions`
**Purpose**: Store Z3 solver results and deterministic proof evidence
**Status**: DRAFT — do not apply until Week 9 (formal proof phase)

See `supabase/migrations/add_dsg_determinism_ledger.sql` (if present) or planned migration file for schema.

---

## References

- [CLAUDE.md § Supabase Conventions](../CLAUDE.md#10-supabase-and-database-conventions)
- [Runtime Spine RPC](../lib/spine/runtime-commit-execution.ts) — uses audit_log for lineage
- [Delivery Proof Scanner](../app/api/delivery-proof/scan/route.ts) — records proofs
- [Audit Dashboard](../app/dashboard/audit/) — queries audit_log with RLS

---

**Last Updated**: 2026-07-30  
**Phase**: Phase 1 / Infrastructure Setup  
**Reviewed By**: Infrastructure Lead (Agent 6)
