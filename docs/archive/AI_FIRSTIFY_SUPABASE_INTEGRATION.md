# AI-Firstify Plugin × Supabase Integration Guide

This document tracks the Supabase integration for the AI-Firstify governance plugin.

## Schema Overview

### Tables Created

1. **ai_models** - AI model registry
   - Stores model metadata, provider info, versions
   - Linked to credentials via `dsg_secrets`
   - Org-scoped with creator tracking

2. **ai_policies** - Governance policies
   - Rules for model deployment, execution, data handling, compliance
   - Versioned with policy hashing for proof/verification
   - Can target specific models or actions
   - RLS enforces admin-only writes

3. **ai_policy_versions** - Policy audit trail
   - Immutable record of policy changes
   - Enables rollback and historical analysis
   - Linked to policy and org

4. **ai_audit_logs** - Immutable audit trail
   - Every governance decision logged
   - Includes decision reason, proof reference, execution time
   - Compliance tags for retention policies
   - Queryable by event type, resource, decision
   - Trigger auto-logs policy changes

### RLS Policies

**AI Models:**
- Owners/Admins: Full access
- Members: Read-only
- Creators: Can update own models

**AI Policies:**
- Owners/Admins: Full access
- Operators/Members: Read-only
- Insert/Update: Admin-only

**AI Audit Logs:**
- Members: Read own actions + policy audit logs
- Admins: Read all
- Insert: Service role only (immutable)

## Integration Checklist

### Phase 1: Schema & Types ✅
- [x] Create migrations (ai_models, ai_policies, ai_audit_logs, RLS)
- [ ] Apply migrations to Supabase project
- [ ] Generate TypeScript types: `npm run db:types`
- [ ] Update `lib/database.types.ts`

### Phase 2: Handler Implementation
- [ ] Update `src/handlers/policy-handler.ts`
  - Replace in-memory Map with Supabase queries
  - Use org_id from request context
  - Enforce RLS via authenticated client
  
- [ ] Update `src/handlers/audit-handler.ts`
  - Log all events to ai_audit_logs
  - Include proof references
  - Handle retention policies

- [ ] Update `src/lib/dsg-client.ts`
  - Query ai_models for registry
  - Fetch active policies for evaluation

### Phase 3: Testing
- [ ] Add integration tests with live Supabase
- [ ] Test RLS enforcement (org scoping, role-based access)
- [ ] Verify audit trail captures all operations
- [ ] Load test policy evaluation queries

### Phase 4: Deployment
- [ ] Apply migrations to staging Supabase
- [ ] Smoke test against staging
- [ ] Apply migrations to production Supabase
- [ ] Deploy updated plugin handlers
- [ ] Monitor audit logs volume and query performance

## Next Steps (After PR #899 Merges)

1. Commit migrations to `claude/supabase-ai-firstify-integration`
2. Wait for PR #899 merge completion
3. Apply migrations to staging Supabase
4. Generate types and update handlers
5. Create follow-up PR for handler implementation

## Notes

- Audit logs include automatic triggers for policy changes
- RLS enforces org isolation at database level
- Partitioning by `created_at` recommended for audit logs at scale
- Policy hashing enables formal proof verification
- Retention policies can be enforced via `retention_until` column
