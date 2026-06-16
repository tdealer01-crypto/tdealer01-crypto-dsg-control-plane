# Phase 2: Agent Parity & Multi-Agent Orchestration

**Status:** ✅ DEPLOYED TO PRODUCTION  
**Deployment Date:** 2026-06-16  
**Branch:** `claude/amazing-keller-1wua6m` → merged to `main` (commit: `3bfe2a0`)

---

## 🎯 Objective

Enable customer agents to have **feature parity with customers** — manage agents, API keys, policies, and execute in parallel without requiring operator intervention.

---

## 📦 What's Delivered

### Phase 2.1: Customer-Parity Permissions ✅

**Problem:** Agents could execute but couldn't manage other agents or modify settings.

**Solution:** 
- Created `agent_permissions` table in Supabase
- Modified `requireOrgPermission()` to accept internal service tokens (agent auth fallback)
- Agents can now use permission-gated routes

**Key Files:**
- `supabase/migrations/20260616_add_agent_permissions.sql` - Schema
- `lib/auth/require-org-permission.ts` - Fallback logic

**How It Works:**
```typescript
// Before: Only users could access permission-gated routes
const access = await requireOrgPermission('org.manage_agents');

// After: Agents also supported via fallback
const access = await requireOrgPermission('org.manage_agents');
// Tries: internal service token → user session
```

---

### Phase 2.2: Agent Permissions Setup ✅

**New Endpoints:**

#### `POST /api/agents/permissions/setup`
Grant default permissions to an agent.

**Request:**
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agents/permissions/setup \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: <ORG_UUID>" \
  -H "x-agent-id: <AGENT_UUID>" \
  -H "x-internal-service: agent"
```

**Response:**
```json
{
  "success": true,
  "agent_id": "...",
  "org_id": "...",
  "permissions": [
    "org.manage_agents",
    "org.manage_api_keys",
    "org.execute",
    "org.view_reports",
    "org.view_evidence"
  ],
  "default_role": "operator"
}
```

#### `GET /api/agents/permissions/setup?agent_id=...`
Check current agent permissions.

**Response:**
```json
{
  "agent_id": "...",
  "org_id": "...",
  "permissions": ["org.manage_agents", "org.manage_api_keys", ...],
  "default_role": "operator",
  "status": "configured"
}
```

**Key Files:**
- `app/api/agents/permissions/setup/route.ts` - Implementation

---

### Phase 2.3: Markdoc + Supabase Integration ✅

**Problem:** Policies were hard-coded; no way to store and render markdown policies.

**Solution:**
- Created `policies` table for markdown-based policy storage
- Integrated Markdoc rendering with custom DSG components
- Added policy versioning & audit trail

**New Tables:**
- `policies` - Markdown policy storage with versioning
- `policy_versions` - Audit trail of policy changes

**New Endpoints:**

#### `POST /api/markdoc-policies`
Create a new Markdoc-based policy.

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/markdoc-policies \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent Execution Policy",
    "description": "Controls when agents can execute",
    "markdown_content": "# Agent Policy\n\n{% PolicyRule type=\"allow\" condition=\"confidence >= 0.90\" /%}",
    "is_default": true
  }'
```

**Response:**
```json
{
  "success": true,
  "policy_id": "uuid",
  "policy": {
    "id": "uuid",
    "name": "Agent Execution Policy",
    "version": 1,
    "status": "active",
    "is_default": true
  }
}
```

#### `GET /api/markdoc-policies`
List all active policies.

```bash
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/markdoc-policies \
  -H "Authorization: Bearer $USER_TOKEN"
```

#### `GET /api/markdoc-policies/[id]`
Fetch policy content (markdown only).

```bash
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/markdoc-policies/$POLICY_ID \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Response:**
```json
{
  "policy": {
    "id": "...",
    "name": "...",
    "version": 1,
    "status": "active"
  },
  "markdown_content": "# Policy\n..."
}
```

#### `POST /api/markdoc-policies/[id]`
Render policy markdown to JSON/HTML (via Markdoc).

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/markdoc-policies/$POLICY_ID \
  -H "Authorization: Bearer $USER_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "policy_id": "...",
  "policy_name": "Agent Execution Policy",
  "policy_version": 1,
  "ast_nodes": 15,
  "content": "{...markdoc AST JSON...}"
}
```

**Markdoc Components Available:**

```markdown
# Policy Document

## Rules

{% PolicyRule 
  type="allow"
  condition="confidence >= 0.90"
  resource="user_data"
  action="read"
/%}

This rule allows agents to read user data when confidence >= 90%.

{% PolicyRule
  type="block"
  condition="always"
  resource="sensitive_data"
/%}

## Testing

{% GateEvaluator policyId="policy-123" interactive=true /%}

Use the evaluator above to test this policy.

## Important

{% Alert type="warning" title="Quota Limits" %}
Monthly execution limits apply. See dashboard for usage.
{% /Alert %}
```

**Component Types:**
- `PolicyRule` - Show allow/block/review rules
- `GateEvaluator` - Interactive policy testing
- `Alert` - Info/warning/error/success boxes
- Standard markdown - headings, lists, code blocks, links

**Key Files:**
- `supabase/migrations/20260616_add_policies_table.sql` - Schema
- `lib/markdoc/components.tsx` - Markdoc components
- `lib/markdoc/renderer.tsx` - Rendering logic
- `app/api/markdoc-policies/route.ts` - CRUD endpoints
- `app/api/markdoc-policies/[id]/route.ts` - Get/render endpoints
- `app/policies-demo/page.tsx` - Demo page (HTTP 200 ✅)

---

### Phase 2.4: Multi-Agent Orchestration ✅

**Problem:** Agents had to execute sequentially; no way to run multiple agents in parallel.

**Solution:**
- Created orchestration endpoint that manages 1-100 concurrent subagents
- Supports parallel & sequential execution modes
- Built-in quota checking & audit trail

**New Endpoint:**

#### `POST /api/orchestrate/execute`
Orchestrate parallel multi-agent execution.

**Request:**
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/orchestrate/execute \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "x-agent-id: $ORCHESTRATOR_AGENT_ID" \
  -H "x-internal-service: orchestrator" \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "Parallel Research Task",
    "task_description": "Research multiple topics in parallel",
    "execution_mode": "parallel",
    "timeout_per_agent_ms": 30000,
    "subagents": [
      {
        "agent_id": "agent-1-uuid",
        "subtask": {
          "data": {"topic": "AI safety"},
          "policy_id": "policy-1"
        }
      },
      {
        "agent_id": "agent-2-uuid",
        "subtask": {
          "data": {"topic": "Quantum computing"},
          "policy_id": "policy-1"
        }
      },
      {
        "agent_id": "agent-3-uuid",
        "subtask": {
          "data": {"topic": "Climate science"},
          "policy_id": "policy-1"
        }
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "orchestrator_agent_id": "...",
  "org_id": "...",
  "task_name": "Parallel Research Task",
  "execution_stats": {
    "total_subagents": 3,
    "successful": 3,
    "failed": 0,
    "total_duration_ms": 2450
  },
  "execution_mode": "parallel",
  "results": [
    {
      "agent_id": "agent-1-uuid",
      "status": "success",
      "status_code": 200,
      "result": {...},
      "duration_ms": 2100
    },
    {
      "agent_id": "agent-2-uuid",
      "status": "success",
      "status_code": 200,
      "result": {...},
      "duration_ms": 2200
    },
    {
      "agent_id": "agent-3-uuid",
      "status": "success",
      "status_code": 200,
      "result": {...},
      "duration_ms": 1900
    }
  ],
  "timestamp": "2026-06-16T09:52:00Z"
}
```

#### `GET /api/orchestrate/execute?orchestration_id=...`
Query previous orchestration status.

**Features:**
- ✅ Parallel execution (1-100 agents)
- ✅ Sequential execution mode option
- ✅ Per-agent timeout support (default 30s)
- ✅ Quota validation before execution
- ✅ Partial failure handling (doesn't block response)
- ✅ Audit trail recording
- ✅ Execution timing metrics

**Key Files:**
- `app/api/orchestrate/execute/route.ts` - Implementation

---

## 🗄️ Database Schema

### `agent_permissions` Table
```sql
id UUID PRIMARY KEY
org_id UUID (FK orgs)
agent_id UUID (FK agents)
permissions TEXT[] -- e.g., ['org.manage_agents', 'org.execute', ...]
default_role TEXT -- 'operator', 'admin', etc
created_at TIMESTAMP
updated_at TIMESTAMP
created_by UUID (FK users)
```

### `policies` Table
```sql
id UUID PRIMARY KEY
org_id UUID (FK orgs)
name TEXT UNIQUE per org
description TEXT
markdown_content TEXT -- Full markdown with Markdoc tags
rendered_content JSONB -- Optional cached AST
version INT
content_hash TEXT -- SHA256 of markdown
policy_hash TEXT -- Hash of policy constraints
status TEXT -- 'draft', 'active', 'archived'
is_default BOOLEAN
created_at, updated_at TIMESTAMP
created_by, updated_by UUID (FK users)
```

### `policy_versions` Table
```sql
id UUID PRIMARY KEY
org_id UUID (FK orgs)
policy_id UUID (FK policies)
version INT
markdown_content TEXT
content_hash TEXT
policy_hash TEXT
change_reason TEXT
changed_by UUID (FK users)
created_at TIMESTAMP
```

### `orchestration_executions` Table
```sql
id UUID PRIMARY KEY
orchestrator_agent_id UUID (FK agents)
org_id UUID (FK orgs)
task_name TEXT
task_description TEXT
total_subagents INT
subagent_ids UUID[]
execution_mode TEXT -- 'parallel' or 'sequential'
successful_count INT
failed_count INT
started_at TIMESTAMP
completed_at TIMESTAMP
total_duration_ms INT
proof_hash TEXT
execution_proof JSONB
```

---

## 🚀 Getting Started

### 1. Grant Agent Permissions
```bash
# Setup agent to manage other agents
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agents/permissions/setup \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "x-agent-id: $AGENT_ID" \
  -H "x-internal-service: agent"
```

### 2. Create a Policy (User)
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/markdoc-policies \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Policy",
    "markdown_content": "# Policy\n{% PolicyRule type=\"allow\" /%}"
  }'
```

### 3. Agent Executes with Policies
```bash
# Agent can now use /api/api-keys, /api/agents, etc
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/api-keys \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "x-agent-id: $AGENT_ID"
```

### 4. Orchestrate Multi-Agent Execution
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/orchestrate/execute \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_ID" \
  -H "x-agent-id: $ORCHESTRATOR_AGENT_ID" \
  -H "x-internal-service: orchestrator" \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "Multi-Agent Task",
    "execution_mode": "parallel",
    "subagents": [
      {"agent_id": "...", "subtask": {"data": {...}}}
    ]
  }'
```

---

## ✅ Verification Checklist

- [x] `/api/health` returns 200 OK
- [x] `/api/agent/status` returns 200 OK
- [x] `/policies-demo` returns 200 OK (Markdoc rendering)
- [x] POST `/api/markdoc-policies` returns 401 (auth required) / 201 (with token)
- [x] POST `/api/agents/permissions/setup` returns 200 (with internal token)
- [x] POST `/api/orchestrate/execute` returns 200 (with internal token)
- [x] All migrations applied to Supabase
- [x] Database types generated (post-migration)
- [x] Typecheck: PASS
- [x] Build: PASS
- [x] Deployed to production

---

## 📊 API Summary

| Method | Endpoint | Auth Required | Purpose |
|--------|----------|----------------|---------|
| POST | `/api/agents/permissions/setup` | Internal Token | Setup agent permissions |
| GET | `/api/agents/permissions/setup` | Internal Token | Check agent permissions |
| POST | `/api/markdoc-policies` | User Token | Create policy |
| GET | `/api/markdoc-policies` | User Token | List policies |
| GET | `/api/markdoc-policies/[id]` | User Token | Get policy |
| POST | `/api/markdoc-policies/[id]` | User Token | Render policy |
| POST | `/api/orchestrate/execute` | Internal Token | Execute multi-agent |
| GET | `/api/orchestrate/execute` | Internal Token | Get orchestration status |

---

## 🔐 Security Notes

- All endpoints require Bearer token authentication
- Internal endpoints require `INTERNAL_SERVICE_TOKEN` + org/agent headers
- User endpoints require valid Supabase session
- Quotas enforced before multi-agent execution
- All operations audit-logged
- RLS policies protect org/workspace isolation

---

## 📝 Known Limitations

- Markdoc policies currently stored as raw markdown (no encryption)
- Z3 solver integration not implemented (deterministic gates only)
- Agent mesh topology limited to flat hierarchy (can be extended)
- Orchestration timeout per agent fixed (not per-task)

---

## 🔮 Next Steps (Phase 3+)

1. **Frontend Dashboard** - UI for policy CRUD & management
2. **Advanced Orchestration** - Conditional branching, failure recovery
3. **Agent Mesh** - Hierarchical agent networks with auto-discovery
4. **Billing Integration** - Per-orchestration cost tracking
5. **Compliance Export** - Generate compliance reports from audit logs

---

## 📂 File Structure

```
lib/markdoc/
├── components.tsx       - Markdoc React components
├── renderer.tsx         - Rendering utilities
└── example-policy.md    - Example policy document

lib/auth/
├── require-org-permission.ts - Updated with agent fallback
└── internal-service.ts   - Agent token validation

app/api/
├── agents/permissions/setup/route.ts
├── markdoc-policies/route.ts
├── markdoc-policies/[id]/route.ts
└── orchestrate/execute/route.ts

supabase/migrations/
├── 20260616_add_agent_permissions.sql
└── 20260616_add_policies_table.sql

app/policies-demo/page.tsx - Demo page showing Markdoc rendering
```

---

## 🎯 Summary

Phase 2 delivers complete **agent feature parity** with customers:
- ✅ Agents can manage agents
- ✅ Agents can manage API keys
- ✅ Agents can read/render policies
- ✅ Agents can execute in parallel (5+ concurrent)
- ✅ All operations are audited & quota-controlled
- ✅ Full TypeScript support
- ✅ Zero breaking changes

**Status: DEPLOYED TO PRODUCTION** 🚀

---

Generated: 2026-06-16  
Deployment: https://tdealer01-crypto-dsg-control-plane.vercel.app  
Repository: tdealer01-crypto/tdealer01-crypto-dsg-control-plane
