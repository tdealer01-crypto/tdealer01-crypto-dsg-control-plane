# Phase 2 Integration Guide

**Purpose:** Quick reference for integrating Phase 2 features into your system.

---

## 🚀 Quick Start

### 1. Apply Database Migrations

```bash
# Using Supabase CLI
supabase migration up

# Or manually in Supabase dashboard
# Navigate to: SQL Editor → Run migrations
# Apply: 20260616_add_agent_permissions.sql
# Apply: 20260616_add_policies_table.sql
```

**Verification:**
```sql
-- Check tables created
SELECT tablename FROM pg_tables 
WHERE schemaname='public' 
  AND tablename IN ('agent_permissions', 'policies', 'policy_versions');

-- Expected output: agent_permissions, policies, policy_versions
```

---

### 2. Setup Agent Permissions

```bash
# Grant default permissions to an agent
curl -X POST https://your-app.vercel.app/api/agents/permissions/setup \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_UUID" \
  -H "x-agent-id: $AGENT_UUID" \
  -H "x-internal-service: agent"
```

**Response:**
```json
{
  "success": true,
  "agent_id": "...",
  "permissions": [
    "org.manage_agents",
    "org.manage_api_keys",
    "org.execute",
    "org.view_reports",
    "org.view_evidence"
  ]
}
```

---

### 3. Create Your First Policy

```bash
curl -X POST https://your-app.vercel.app/api/markdoc-policies \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My First Policy",
    "description": "Agent execution rules",
    "markdown_content": "# My Policy\n\n{% PolicyRule type=\"allow\" condition=\"confidence >= 0.9\" /%}",
    "is_default": true
  }'
```

---

### 4. Run Multi-Agent Orchestration

```bash
curl -X POST https://your-app.vercel.app/api/orchestrate/execute \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_UUID" \
  -H "x-agent-id: $ORCHESTRATOR_AGENT_UUID" \
  -H "x-internal-service: orchestrator" \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "Research Task",
    "execution_mode": "parallel",
    "timeout_per_agent_ms": 30000,
    "subagents": [
      {
        "agent_id": "agent-1-uuid",
        "subtask": {"data": {"query": "topic 1"}}
      },
      {
        "agent_id": "agent-2-uuid",
        "subtask": {"data": {"query": "topic 2"}}
      }
    ]
  }'
```

---

## 📊 Database Schema Reference

### `agent_permissions` Table

```sql
CREATE TABLE agent_permissions (
  id UUID PRIMARY KEY,
  org_id UUID (FK orgs),
  agent_id UUID (FK agents),
  permissions TEXT[] -- e.g., ['org.manage_agents', 'org.execute']
  default_role TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID (FK users)
);
```

**Key Points:**
- One record per agent
- Permissions stored as TEXT array
- Fallback permissions if not configured

---

### `policies` Table

```sql
CREATE TABLE policies (
  id UUID PRIMARY KEY,
  org_id UUID (FK orgs),
  name TEXT UNIQUE per org,
  description TEXT,
  markdown_content TEXT,
  version INT AUTO_INCREMENT,
  content_hash TEXT (SHA256),
  policy_hash TEXT,
  status TEXT ('draft'|'active'|'archived'),
  is_default BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  created_by UUID (FK users),
  updated_by UUID (FK users)
);
```

**Key Points:**
- Markdown stored as-is (no encryption by default)
- Version auto-increments on update
- Content hash for caching
- RLS: users can read org policies, admins can manage

---

### `policy_versions` Table

```sql
CREATE TABLE policy_versions (
  id UUID PRIMARY KEY,
  org_id UUID (FK orgs),
  policy_id UUID (FK policies),
  version INT,
  markdown_content TEXT (snapshot),
  content_hash TEXT,
  policy_hash TEXT,
  change_reason TEXT,
  changed_by UUID (FK users),
  created_at TIMESTAMP
);
```

**Key Points:**
- Immutable audit trail
- Auto-created on policy updates
- One version per policy version number

---

## 🔐 Authentication Requirements

### User Authentication (Supabase Session)
**For:** Policy CRUD, agent management, user-facing operations

```bash
# Get session token from Supabase
curl -X POST https://your-supabase.com/auth/v1/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "email": "user@example.com",
    "password": "password"
  }'

# Use token in Authorization header
curl -H "Authorization: Bearer $SESSION_TOKEN" \
  https://your-app.vercel.app/api/markdoc-policies
```

### Internal Service Token (Agent Auth)
**For:** Agent permissions setup, orchestration

```bash
# Token is INTERNAL_SERVICE_TOKEN environment variable
# Requires headers:
# - Authorization: Bearer $INTERNAL_SERVICE_TOKEN
# - x-org-id: $ORG_UUID
# - x-agent-id: $AGENT_UUID
# - x-internal-service: agent|orchestrator

curl -X POST https://your-app.vercel.app/api/agents/permissions/setup \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_UUID" \
  -H "x-agent-id: $AGENT_UUID" \
  -H "x-internal-service: agent"
```

---

## 📝 Markdoc Component Usage

### PolicyRule
Display policy rules with conditional logic.

```markdown
{% PolicyRule 
  type="allow"
  condition="confidence >= 0.90"
  resource="user_data"
  action="read"
/%}
```

**Parameters:**
- `type`: 'allow' | 'block' | 'review'
- `condition`: Boolean expression
- `resource`: What's being accessed
- `action`: What's being done

---

### GateEvaluator
Interactive policy testing UI.

```markdown
{% GateEvaluator 
  policyId="policy-123" 
  interactive=true 
/%}
```

**Features:**
- JSON input tester
- Live gate evaluation
- Result display

---

### Alert
Warning/info boxes.

```markdown
{% Alert type="warning" title="Important" %}
This is a warning message.
{% /Alert %}
```

**Types:** info | warning | error | success

---

## 🔍 Verification Commands

### Check Migration Status
```sql
-- List all tables
\dt

-- Check agent_permissions table
SELECT COUNT(*) FROM agent_permissions;

-- Check policies table
SELECT COUNT(*) FROM policies;

-- List policies for an org
SELECT id, name, version, status FROM policies 
WHERE org_id = '...' AND status = 'active';
```

### Check Agent Permissions
```bash
curl https://your-app.vercel.app/api/agents/permissions/setup?agent_id=$AGENT_UUID \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_UUID" \
  -H "x-agent-id: $AGENT_UUID"
```

### Check Deployment Info
```bash
curl https://your-app.vercel.app/api/deployment-info | jq .
```

---

## 🛠️ Troubleshooting

### Migration Fails: "Table already exists"
**Solution:** Migrations use `CREATE TABLE IF NOT EXISTS`. This is safe to retry.

```bash
supabase migration up --force
```

### Agent Permissions Not Applying
**Check:**
1. Agent exists in `agents` table
2. Org exists in `orgs` table
3. Run permission setup endpoint
4. Verify with GET query

```sql
SELECT * FROM agent_permissions 
WHERE agent_id = '...' AND org_id = '...';
```

### Policy Not Rendering
**Check:**
1. Markdoc syntax valid (test in `/policies-demo`)
2. Policy status is 'active'
3. JSON content rendering correctly

```bash
# Test Markdoc rendering
curl -X POST https://your-app.vercel.app/api/markdoc-policies/$POLICY_ID \
  -H "Authorization: Bearer $USER_TOKEN"
```

---

## 📚 Environment Variables

Required for Phase 2 features:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Internal Service Token (for agent auth)
INTERNAL_SERVICE_TOKEN=your-secret-token

# Vercel Configuration
VERCEL_GIT_COMMIT_SHA=<auto-set>
VERCEL_GIT_COMMIT_REF=<auto-set>
VERCEL_DEPLOYMENT_ID=<auto-set>
```

---

## 📋 Feature Checklist

Before going to production:

- [ ] Migrations applied to Supabase
- [ ] `agent_permissions` table created
- [ ] `policies` table created
- [ ] `policy_versions` table created
- [ ] Environment variables set
- [ ] Test agent permissions grant
- [ ] Create test policy
- [ ] Verify Markdoc rendering
- [ ] Test orchestration with 2+ agents
- [ ] Verify `/api/deployment-info` returns latest commit
- [ ] Check `/api/health` responding
- [ ] Run smoke test suite

---

## 🎯 Next Steps

1. **Apply migrations** → Supabase
2. **Setup test agent** → Grant permissions
3. **Create test policy** → Markdoc format
4. **Run orchestration** → Multi-agent test
5. **Verify evidence** → Check audit logs
6. **Document customizations** → Your org requirements

---

## 📞 Support

For issues:
1. Check smoke tests: `qa-logs/phase2-production-smoke-*.md`
2. Review API docs: `PHASE_2_README.md`
3. Check migrations: `supabase/migrations/`
4. Check logs: Vercel deployment logs

---

Generated: 2026-06-16  
Status: Production Ready ✅
