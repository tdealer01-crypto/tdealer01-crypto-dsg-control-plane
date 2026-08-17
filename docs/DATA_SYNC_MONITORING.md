# Data Sync Monitoring & Schema Consistency

This guide explains how to verify schema consistency across all repositories and monitor data sync health across the unified Supabase instance.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│              Unified Supabase Instance                      │
│  (Single source of truth for all 4 repositories)            │
└─────────────────────────────────────────────────────────────┘
       ↑                    ↑                    ↑
       │                    │                    │
  ┌────┴──────┐       ┌─────┴──────┐      ┌────┴──────┐
  │Control    │       │DSG ONE V1  │      │AGI Sim/  │
  │Plane      │       │            │      │Cinema    │
  └──────┬────┘       └─────┬──────┘      └─────┬────┘
         │ Verified schema  │                   │
         │ RLS enforcement  │ org_id scoping    │
         └─────────────────────────────────────┘
                Service Role Keys
                (cross-repo access)
```

## Schema Consistency Verification

### 1. Run Schema Consistency Checker

```bash
# Verify schema consistency across all repositories
npm run verify:schema-consistency

# Output: schema-consistency-report.json
# Contains:
# - Migration status per repository
# - Current schema hash
# - Data sync health metrics
# - Table counts and row distributions
```

### 2. Check Migration Status

Each repository maintains its own migrations under `supabase/migrations/`:

- **tdealer01-crypto-dsg-control-plane**: Core governance schema
- **dsg-one-v1**: DSG ONE-specific extensions
- **dsg-agi-simulation**: AGI simulation tables
- **dsg-cinema-proof-agent**: Cinema proof tables

**Migration consistency rule:**
- All migrations run against the **same Supabase project**
- Migrations are applied in timestamp order
- No migrations are skipped or reordered
- Migration idempotency is required for recovery scenarios

### 3. Verify Current Schema State

```sql
-- Check table counts (as admin/service role)
SELECT table_name, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check RLS policy coverage
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename;

-- Verify org_id scoping enforcement
SELECT table_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'org_id'
ORDER BY table_name;
```

## Data Sync Monitoring API

### Endpoint: GET /api/dsg/v1/monitoring/data-sync

Monitor data sync health across unified Supabase instance.

**Permissions Required:** `read:monitoring`

**Query Parameters:**

| Parameter | Values | Description |
|---|---|---|
| `check` | `full` (default) | Full sync report with all metrics |
| `check` | `metrics` | Table-level sync metrics only |
| `check` | `divergence` | Detect data divergences only |
| `check` | `cross-repo` | Cross-repository consistency check |

**Example Requests:**

```bash
# Full report (default)
curl -H "Authorization: Bearer $API_KEY" \
  https://dsg-one-v1-aimo.onrender.com/api/dsg/v1/monitoring/data-sync

# Check for divergences
curl -H "Authorization: Bearer $API_KEY" \
  https://dsg-one-v1-aimo.onrender.com/api/dsg/v1/monitoring/data-sync?check=divergence

# Cross-repo consistency
curl -H "Authorization: Bearer $API_KEY" \
  https://dsg-one-v1-aimo.onrender.com/api/dsg/v1/monitoring/data-sync?check=cross-repo
```

**Response Format:**

```json
{
  "ok": true,
  "data": {
    "sync_report": {
      "timestamp": "2026-08-17T12:34:56Z",
      "metrics": [
        {
          "org_id": "org_123",
          "table_name": "organizations",
          "row_count": 5,
          "last_modified": "2026-08-17T10:00:00Z",
          "hash": "a1b2c3d4e5f6g7h8",
          "status": "synced"
        }
      ],
      "health_score": 95,
      "divergences": [],
      "recommendations": []
    },
    "cross_repo_consistency": {
      "consistent": true,
      "issues": []
    }
  },
  "timestamp": "2026-08-17T12:34:56Z"
}
```

### Endpoint: POST /api/dsg/v1/monitoring/data-sync

Trigger data reconciliation and sync repairs.

**Permissions Required:** `admin:data-sync`

**Request Body:**

```json
{
  "action": "report" | "reconcile"
}
```

**Actions:**

| Action | Description |
|---|---|
| `report` | Generate comprehensive sync report |
| `reconcile` | Check and fix data divergences |

**Example:**

```bash
curl -X POST -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"reconcile"}' \
  https://dsg-one-v1-aimo.onrender.com/api/dsg/v1/monitoring/data-sync
```

## Monitoring Checklist

### Daily Checks

- [ ] Health score > 90
- [ ] Zero divergences detected
- [ ] All critical tables synced
- [ ] No orphaned records
- [ ] RLS policies enforced correctly

### Weekly Checks

- [ ] Migration consistency across repos
- [ ] Cross-repo visibility via service role
- [ ] Row count trending (check for unexpected growth)
- [ ] Audit log completeness
- [ ] Evidence chain integrity

### Monthly Reviews

- [ ] Schema version alignment
- [ ] Backup/recovery verification
- [ ] Performance metrics (query latency)
- [ ] Unused table cleanup
- [ ] Policy effectiveness review

## Critical Tables to Monitor

| Table | Purpose | Org Scoping | RLS |
|---|---|---|---|
| `organizations` | Tenant boundaries | N/A (root) | Required |
| `users` | Actor identity | org_id | Required |
| `agents` | Agent definitions | org_id | Required |
| `policies` | Policy definitions | org_id | Required |
| `executions` | Execution records | org_id | Required |
| `audit_logs` | Audit trail | org_id | Required |
| `runtime_intents` | Runtime state | org_id | Required |
| `proof_artifacts` | Proof evidence | org_id | Required |

## Common Issues & Resolutions

### Issue: Orphaned Records

**Symptom:** `org_id` references non-existent organization

**Detection:**
```sql
SELECT table_name, COUNT(*) as orphaned_count
FROM [check each table for missing org references]
GROUP BY table_name;
```

**Resolution:**
```sql
-- Delete orphaned user records
DELETE FROM users
WHERE org_id NOT IN (SELECT id FROM organizations);

-- Delete orphaned executions
DELETE FROM executions
WHERE org_id NOT IN (SELECT id FROM organizations);
```

### Issue: RLS Policy Failure

**Symptom:** Service role cannot read table, or auth user can read other org's data

**Diagnosis:**
```sql
-- Check RLS policies on table
SELECT * FROM pg_policies WHERE tablename = 'users';

-- Verify policy logic
SELECT * FROM users
WHERE org_id = 'org_123' AND created_by = current_user_id;
```

**Resolution:**
- Review RLS policy definition in `supabase/migrations/`
- Test with appropriate role (not service role)
- Apply policy fix via migration

### Issue: Schema Divergence

**Symptom:** Column missing, function undefined, or index not present

**Diagnosis:**
```bash
npm run verify:schema-consistency
# Check output for divergence
```

**Resolution:**
1. Identify which repo has the missing object
2. Create migration in that repo with the schema change
3. Apply migration to Supabase project
4. Re-run schema consistency check to verify

## Data Sync Workflow

```
┌─────────────────────┐
│  Detect Divergence  │
│  (via monitoring)   │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Run Reconcile      │
│  Check via API      │
└──────────┬──────────┘
           │
           ↓
      ┌────┴────┐
      │          │
      ↓          ↓
  ┌───────┐  ┌──────────┐
  │ Clean │  │ Has Work │
  │ (OK)  │  │ To Do    │
  └───────┘  └────┬─────┘
                  │
                  ↓
         ┌──────────────────┐
         │ Review via Dash  │
         │ Apply Manual Fix │
         └────────┬─────────┘
                  │
                  ↓
         ┌──────────────────┐
         │ Re-check via API │
         │ Verify Status    │
         └──────────────────┘
```

## Production Readiness Gates

Before marking production sync as healthy:

- [ ] Verify schema consistency report passes
- [ ] Health score > 95
- [ ] Zero critical divergences
- [ ] All cross-repo consistency checks pass
- [ ] RLS policies verified on critical tables
- [ ] Audit logs capturing all changes
- [ ] Backup/recovery tested

## Integration with CI/CD

Add to GitHub Actions workflow:

```yaml
- name: Verify Schema Consistency
  run: npm run verify:schema-consistency
  
- name: Check Data Sync Health
  run: |
    curl -H "Authorization: Bearer $ADMIN_API_KEY" \
      $DEPLOYMENT_URL/api/dsg/v1/monitoring/data-sync?check=full
```

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Schema Migrations](../SCHEMA_MIGRATIONS.md)
- [Unified Data Model Architecture](./architecture.md)
- [Production Runbook](./RUNBOOK_DEPLOY.md)
