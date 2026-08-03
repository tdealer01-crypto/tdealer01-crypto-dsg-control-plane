# Phase 4: GitHub Actions Preview Database Isolation

## Overview

Phase 4 automates the creation and management of isolated Supabase databases for each pull request. This enables:

- **Per-PR database isolation**: Each PR gets its own Supabase project with fresh schema
- **Automated provisioning**: GitHub Actions creates databases on PR open/sync
- **Automated cleanup**: Databases are deleted when PRs are merged/closed
- **Full test suite coverage**: Load tests and integration tests run against isolated databases
- **Zero cross-contamination**: No test data pollution between PRs

## Architecture

### Preview Database Lifecycle

```
PR Opened
   ↓
[GitHub Actions: preview-db-create.yml]
   ├─ Generate unique database name: preview-pr-{number}
   ├─ Query Supabase API for existing project
   ├─ Create Supabase project (if needed)
   ├─ Apply migrations (Phase 2 schema)
   └─ Post URL to PR comment
   ↓
PR Tests Running
   ↓
[GitHub Actions: preview-db-tests.yml]
   ├─ Wait for database to be ACTIVE
   ├─ Run integration tests
   ├─ Run deterministic gate tests
   ├─ Run load tests (if configured)
   └─ Report results to PR
   ↓
PR Merged/Closed
   ↓
[GitHub Actions: preview-db-cleanup.yml]
   ├─ Find preview project by PR number
   ├─ Delete Supabase project via API
   └─ Confirm deletion to PR
```

### Naming Convention

**Pattern**: `preview-pr-{PR_NUMBER}`

**Examples**:
- PR #1038 → `preview-pr-1038`
- PR #2000 → `preview-pr-2000`

This naming ensures:
- **Uniqueness**: One database per PR
- **Traceability**: Easy to identify which PR owns which database
- **Automatic cleanup**: Deterministic name for deletion workflow

## Workflows

### 1. `preview-db-create.yml` — Database Provisioning

**Trigger**: PR opened or updated

**Actions**:
1. Check if preview database already exists for this PR
2. Create Supabase project via Management API if needed
3. Apply Phase 2 migrations (dsg_gate_decisions table)
4. Post comment to PR with database URL and credentials
5. Set up environment variables for downstream workflows

**Secrets Required**:
- `SUPABASE_ACCESS_TOKEN` — Supabase Management API token
- `SUPABASE_ORG_ID` — Organization ID for project creation

### 2. `preview-db-tests.yml` — Test Execution

**Trigger**: PR opened/updated, or after preview-db-create completes

**Actions**:
1. Wait for preview database to be ACTIVE (up to 10 minutes)
2. Run integration tests with preview database credentials
3. Run deterministic gate tests against preview schema
4. Run load tests if Phase 3 is enabled
5. Upload test results as artifacts
6. Post summary comment to PR

**Environment Variables**:
- `SUPABASE_URL` — Preview database URL
- `SUPABASE_ANON_KEY` — Anonymous client key
- `SUPABASE_SERVICE_ROLE_KEY` — Admin key
- `RUN_PREVIEW_DB_TESTS` — Flag to enable preview DB tests

### 3. `preview-db-cleanup.yml` — Database Cleanup

**Trigger**: PR closed (merged or dismissed)

**Actions**:
1. Query Supabase API for preview project matching PR number
2. Delete the project via Management API
3. Verify deletion with follow-up API call
4. Post cleanup confirmation to PR

## Setup Instructions

### Prerequisites

1. **Supabase Account**: Must be part of the same organization as production database
2. **Management API Token**: Generate at supabase.com/dashboard/account/tokens
3. **Organization ID**: Available in Supabase dashboard settings

### GitHub Secrets Configuration

Add these secrets to the repository (`Settings` → `Secrets and variables` → `Actions`):

```
SUPABASE_ACCESS_TOKEN    # Supabase Management API token (required)
SUPABASE_ORG_ID          # Organization ID for preview project creation (required)
PREVIEW_DB_ANON_KEY      # Anonymous key for preview databases (if using static keys)
PREVIEW_DB_SERVICE_ROLE_KEY  # Service role key for preview databases (if using static keys)
```

**Note**: If using per-database keys, these can be fetched from the created project's settings dynamically.

### Environment Variables in Tests

Update `.env.example`:
```bash
# Preview database (auto-populated by workflow)
SUPABASE_URL=https://preview-pr-{PR_NUMBER}.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RUN_PREVIEW_DB_TESTS=false  # Set to true in GitHub Actions
```

## Test Execution Strategy

### Phase 1: Database Readiness Check (5 min)
- Poll Supabase API for project status
- Wait until `status == ACTIVE`
- Bail out gracefully if timeout

### Phase 2: Schema Validation (2 min)
- Verify migrations applied successfully
- Check dsg_gate_decisions table exists
- Validate RLS policies are in place

### Phase 3: Integration Tests (5-10 min)
- Test audit trail recording
- Test RLS policy enforcement
- Test Supabase client connectivity

### Phase 4: Deterministic Gate Tests (5 min)
- Test cache key generation
- Test proof recording
- Test multi-tenant isolation

### Phase 5: Load Tests (Optional, 10 min)
- Run k6 load test against preview database
- Verify cache performance
- Check latency SLAs

## Cost & Quota Considerations

### Per-PR Database Cost

Each preview database:
- **Storage**: ~50 MB (minimal schema)
- **Compute**: Micro tier ($0 for free tier, $7/month if metered)
- **Bandwidth**: Minimal (test traffic only)
- **Requests**: Counted against Supabase quota

**Recommendation**: Use Supabase free tier for development PRs, upgrade to Pro for critical paths.

### Quota Management

To avoid hitting quotas:
1. Set maximum of 5 concurrent preview databases
2. Auto-delete preview databases after 24 hours (if PR not merged)
3. Monitor Supabase dashboard for active projects
4. Use cleanup workflow to delete after PR merged

**Automated Cleanup**:
- Cleanup workflow runs immediately on PR close
- Ensures 24-hour max lifetime for abandoned PRs

## Troubleshooting

### Preview database not created

**Symptom**: Comment says "Manual setup required"

**Causes**:
- API token invalid or expired
- Organization ID incorrect
- Supabase API rate limit hit

**Fix**:
1. Verify `SUPABASE_ACCESS_TOKEN` is valid and not expired
2. Check `SUPABASE_ORG_ID` matches your organization
3. Check GitHub Actions logs for API errors
4. Manually create database if needed: `preview-pr-{NUMBER}`

### Tests failing with "database not ready"

**Symptom**: Tests timeout or connection errors

**Causes**:
- Database provisioning taking > 10 minutes
- Network connectivity issue
- Database region mismatch

**Fix**:
1. Increase wait timeout in `preview-db-tests.yml` (max 30 min)
2. Verify database region is `ap-southeast-2` (production region)
3. Check Supabase project health on dashboard
4. Manually verify database is ACTIVE before re-running tests

### Cleanup workflow failing

**Symptom**: Preview databases accumulating in Supabase

**Causes**:
- API token doesn't have delete permissions
- Project ID not found
- Cleanup workflow not triggered

**Fix**:
1. Verify API token has "Delete project" permission
2. Check project name matches `preview-pr-{NUMBER}` pattern
3. Manually delete unused projects from dashboard
4. Trigger cleanup workflow manually via GitHub UI

## Monitoring & Alerts

### Dashboard View

Create a Supabase dashboard view to monitor preview projects:
```sql
SELECT name, status, created_at
FROM projects
WHERE name LIKE 'preview-pr-%'
ORDER BY created_at DESC;
```

### Automatic Alerts

Set up alerts for:
- Projects with name pattern `preview-pr-*` older than 24 hours
- Failed cleanup workflows
- API quota exceeded

## Cost Optimization

### Strategies to reduce costs:

1. **Shared preview environment** (optional):
   - Use single preview database for all PRs
   - Less isolation but zero variable cost
   - Trade-off: potential cross-PR contamination

2. **Time-based auto-deletion**:
   - Add cron job to delete preview DBs > 24 hours old
   - Handles abandoned PRs

3. **Selective testing**:
   - Only run full tests on ready-for-review PRs
   - Skip tests for draft PRs

4. **Batch testing**:
   - Schedule load tests once per night instead of per-PR
   - Use production staging environment for load

## Next Steps (Phase 5+)

- **Phase 5**: Automated production deployment gate (GO/NO-GO automation)
- **Phase 6**: Compliance evidence collection for audit trails
- **Phase 7**: Multi-region failover testing (disaster recovery)

## References

- [Supabase Management API](https://supabase.com/docs/reference/api/introduction)
- [GitHub Actions Workflows](https://docs.github.com/en/actions/using-workflows)
- [Preview Deployment Best Practices](https://vercel.com/docs/deployments/preview-deployments)
