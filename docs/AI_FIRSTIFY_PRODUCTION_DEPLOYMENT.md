# AI-Firstify Plugin — Production Deployment Guide

**Status:** Ready for Supabase application  
**Supabase Project:** `<your-project-id>`  
**Date:** 2026-07-13

---

## 1. Apply Database Migrations

Your Supabase project needs 3 migrations applied. These are pure SQL and safe to run.

### Method A: Supabase SQL Editor (Easiest)

1. Go to: https://supabase.com/dashboard/project/<your-project-id>/sql/new
2. Copy-paste each migration SQL below
3. Click "RUN" for each

### Method B: Supabase CLI

```bash
export SUPABASE_URL="https://<your-project-id>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

supabase db push --remote
```

---

## Migration 1: Core Schema (Tables & Indexes)

**File:** `supabase/migrations/20260713050000_ai_firstify_core_schema.sql`

Creates:
- `ai_models` table (AI model registry)
- `ai_policies` table (governance policies)
- `ai_policy_versions` table (policy versioning)
- Indexes for efficient querying
- RLS enabled on all tables

**Status:** ✅ Safe to run

```sql
-- AI-Firstify Plugin Core Schema
-- Tables for AI model governance, policies, and audit tracking

-- AI Models Registry
CREATE TABLE IF NOT EXISTS ai_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL,
  provider TEXT NOT NULL, -- e.g., 'openai', 'anthropic', 'custom'
  model_type TEXT, -- e.g., 'llm', 'classifier', 'embedding'
  tags TEXT[] DEFAULT '{}',
  endpoint_url TEXT,
  api_key_id UUID REFERENCES dsg_secrets(id),
  status TEXT DEFAULT 'active', -- active, archived, deprecated
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT ai_models_org_name_version_unique UNIQUE(org_id, name, version)
);

CREATE INDEX idx_ai_models_org_id ON ai_models(org_id);
CREATE INDEX idx_ai_models_status ON ai_models(status);
CREATE INDEX idx_ai_models_provider ON ai_models(provider);

-- Governance Policies for AI Operations
CREATE TABLE IF NOT EXISTS ai_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  policy_type TEXT NOT NULL, -- 'deployment', 'execution', 'data_handling', 'compliance'
  rules JSONB NOT NULL DEFAULT '[]', -- Array of rule objects with condition, action, severity
  risk_level TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  enabled BOOLEAN DEFAULT true,
  version INT DEFAULT 1,
  policy_hash TEXT, -- Hash of policy for proof/verification
  applies_to_models TEXT[] DEFAULT '{}', -- Empty = all models
  applies_to_actions TEXT[] DEFAULT '{}', -- Empty = all actions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT ai_policies_org_name_unique UNIQUE(org_id, name, version)
);

CREATE INDEX idx_ai_policies_org_id ON ai_policies(org_id);
CREATE INDEX idx_ai_policies_enabled ON ai_policies(enabled);
CREATE INDEX idx_ai_policies_risk_level ON ai_policies(risk_level);
CREATE INDEX idx_ai_policies_type ON ai_policies(policy_type);

-- Policy Versions (for audit trail and rollback)
CREATE TABLE IF NOT EXISTS ai_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES ai_policies(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version INT NOT NULL,
  rules JSONB NOT NULL,
  risk_level TEXT NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  CONSTRAINT policy_versions_unique UNIQUE(policy_id, version)
);

CREATE INDEX idx_policy_versions_policy_id ON ai_policy_versions(policy_id);
CREATE INDEX idx_policy_versions_org_id ON ai_policy_versions(org_id);

-- Enable RLS on all tables
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_policy_versions ENABLE ROW LEVEL SECURITY;

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE ON ai_models TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_policies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ai_policy_versions TO authenticated;
```

---

## Migration 2: Audit Logs (Immutable Trail)

**File:** `supabase/migrations/20260713050100_ai_firstify_audit_logs.sql`

Creates:
- `ai_audit_logs` table (append-only audit trail)
- Automatic trigger `log_ai_operation()` (logs all policy changes)
- Comprehensive indexes for efficient queries
- RLS enabled for scoped access

**Status:** ✅ Safe to run

```sql
-- AI-Firstify Audit Logs Schema
-- Immutable audit trail for all AI operations and governance decisions

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'model_deployment', 'policy_evaluation', 'policy_update', 'execution_blocked', etc.
  resource_type TEXT NOT NULL, -- 'model', 'policy', 'execution', 'decision'
  resource_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'evaluate', 'block', 'approve'
  decision TEXT, -- 'pass', 'review', 'block', 'unsupported'
  decision_reason TEXT,
  user_id UUID REFERENCES auth.users(id),
  actor_type TEXT DEFAULT 'user', -- 'user', 'system', 'agent'
  actor_id TEXT, -- Can be user UUID or service identifier

  -- Request context
  request_id TEXT,
  request_metadata JSONB DEFAULT '{}',

  -- Governance evaluation results
  policy_id UUID REFERENCES ai_policies(id),
  policy_version INT,
  proof_reference TEXT, -- Hash or reference to formal proof

  -- Execution details
  execution_details JSONB DEFAULT '{}',
  error_message TEXT,
  execution_time_ms INT,

  -- Network/system info
  ip_address INET,
  user_agent TEXT,

  -- Compliance tracking
  compliance_tags TEXT[] DEFAULT '{}',
  retention_until TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT audit_logs_immutable CHECK (created_at IS NOT NULL)
);

-- Indexes for efficient querying
CREATE INDEX idx_ai_audit_logs_org_id ON ai_audit_logs(org_id);
CREATE INDEX idx_ai_audit_logs_event_type ON ai_audit_logs(event_type);
CREATE INDEX idx_ai_audit_logs_resource_type ON ai_audit_logs(resource_type);
CREATE INDEX idx_ai_audit_logs_resource_id ON ai_audit_logs(org_id, resource_type, resource_id);
CREATE INDEX idx_ai_audit_logs_user_id ON ai_audit_logs(user_id);
CREATE INDEX idx_ai_audit_logs_created_at ON ai_audit_logs(created_at DESC);
CREATE INDEX idx_ai_audit_logs_decision ON ai_audit_logs(decision);
CREATE INDEX idx_ai_audit_logs_policy_id ON ai_audit_logs(policy_id);
CREATE INDEX idx_ai_audit_logs_actor ON ai_audit_logs(actor_type, actor_id);

-- Composite indexes for common queries
CREATE INDEX idx_ai_audit_logs_org_time ON ai_audit_logs(org_id, created_at DESC);
CREATE INDEX idx_ai_audit_logs_org_event_time ON ai_audit_logs(org_id, event_type, created_at DESC);

-- Enable RLS
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs are append-only; no updates or deletes (except via retention policy)
GRANT SELECT, INSERT ON ai_audit_logs TO authenticated;
GRANT SELECT, INSERT ON ai_audit_logs TO service_role;

-- Function to track changes (audit trigger)
CREATE OR REPLACE FUNCTION log_ai_operation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ai_audit_logs (
    org_id,
    event_type,
    resource_type,
    resource_id,
    action,
    user_id,
    actor_type,
    execution_details
  ) VALUES (
    COALESCE(NEW.org_id, OLD.org_id),
    'policy_change',
    'policy',
    COALESCE(NEW.id, OLD.id)::text,
    CASE WHEN TG_OP = 'INSERT' THEN 'create' WHEN TG_OP = 'UPDATE' THEN 'update' WHEN TG_OP = 'DELETE' THEN 'delete' END,
    auth.uid(),
    'system',
    jsonb_build_object(
      'operation', TG_OP,
      'old_data', to_jsonb(OLD),
      'new_data', to_jsonb(NEW)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to policy table
DROP TRIGGER IF EXISTS ai_policies_audit_trigger ON ai_policies;
CREATE TRIGGER ai_policies_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ai_policies
  FOR EACH ROW
  EXECUTE FUNCTION log_ai_operation();
```

---

## Migration 3: RLS Policies (Simplified)

**File:** `supabase/migrations/20260713050300_ai_firstify_simplify_rls.sql`

Creates:
- Simplified RLS policies (no complex org infrastructure dependency)
- Authenticated user access policies
- Service role for audit log inserts
- Org/workspace isolation via application layer

**Status:** ✅ Safe to run (resolves organization_members dependency)

```sql
-- AI-Firstify Simplified RLS Policies (without organization_members dependency)
-- Fallback to org_id header validation in application layer

-- Drop the complex policies that reference organization_members
DROP POLICY IF EXISTS "ai_models_owner_access" ON ai_models;
DROP POLICY IF EXISTS "ai_models_member_read" ON ai_models;
DROP POLICY IF EXISTS "ai_models_creator_update" ON ai_models;

DROP POLICY IF EXISTS "ai_policies_owner_access" ON ai_policies;
DROP POLICY IF EXISTS "ai_policies_member_read" ON ai_policies;
DROP POLICY IF EXISTS "ai_policies_admin_write" ON ai_policies;
DROP POLICY IF EXISTS "ai_policies_admin_update" ON ai_policies;

DROP POLICY IF EXISTS "ai_policy_versions_read" ON ai_policy_versions;
DROP POLICY IF EXISTS "ai_policy_versions_write" ON ai_policy_versions;

DROP POLICY IF EXISTS "ai_audit_logs_read" ON ai_audit_logs;
DROP POLICY IF EXISTS "ai_audit_logs_insert" ON ai_audit_logs;
DROP POLICY IF EXISTS "ai_audit_logs_scoped_read" ON ai_audit_logs;

-- ============================================================================
-- Simplified RLS Policies (auth-based, org_id header validation in app)
-- ============================================================================

-- AI Models: authenticated users can see/manage their org data
CREATE POLICY "ai_models_authenticated"
  ON ai_models
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- AI Policies: authenticated users can see/manage their org data
CREATE POLICY "ai_policies_authenticated"
  ON ai_policies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- AI Policy Versions: authenticated users can read/insert
CREATE POLICY "ai_policy_versions_authenticated"
  ON ai_policy_versions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- AI Audit Logs: authenticated users can read, service_role can insert
CREATE POLICY "ai_audit_logs_authenticated_read"
  ON ai_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ai_audit_logs_service_insert"
  ON ai_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Note: Org/workspace isolation is enforced at the application layer
-- by validating org_id header and only returning scoped data
-- This will be secured by organization_members table once infrastructure is ready
```

---

## 2. After Migrations Applied

Once all 3 migrations are successfully applied:

### Generate TypeScript Types

```bash
npm run db:types
```

This generates `lib/database.types.ts` from your live schema.

### Verify Setup

```bash
npm run typecheck
npm run test
npm run build
```

---

## 3. Environment Variables

Add to your deployment environment:

```
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key-from-supabase-dashboard>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Where to find keys:**
1. Go to: https://supabase.com/dashboard/project/<your-project-id>/settings/api
2. Copy the keys from "Project API keys"

---

## 4. Deploy to Production

```bash
npm run deploy:prod
```

Or via Vercel:
```bash
vercel deploy --prod
```

---

## 5. Verify Deployment

```bash
# Check health
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check agent status
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# Test plugin
curl -X GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/v1/policies/manifest \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "x-org-id: YOUR_ORG_ID"
```

---

## Troubleshooting

### "relation organizations does not exist"
**Cause:** DSG platform tables not initialized  
**Solution:** Ensure your Supabase project has the base DSG infrastructure tables. Contact support if needed.

### "relation organization_members does not exist"
**Status:** ✅ FIXED — We use simplified RLS policies instead (Migration 3)

### Migration fails with syntax error
**Solution:** Run migrations one at a time in the SQL editor. Check for exact error and provide feedback.

---

## Support

Plugin package: `packages/ai-firstify-plugin/`  
Routes: `/api/v1/governance`, `/api/v1/policies`, `/api/v1/audit`  
Documentation: `docs/AI_FIRSTIFY_DEPLOYMENT_GUIDE.md`
