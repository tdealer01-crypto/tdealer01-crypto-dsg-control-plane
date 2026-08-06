# Phase 2: n2n Agent Control Plane

**Status:** ✅ Production Ready  
**Version:** 2.0.0  
**Deployed:** 2026-06-16  
**Commit:** da60c4d

---

## 🎯 What is Phase 2?

Phase 2 transforms agents from **executers to autonomous managers**:

- ✅ **Agent Parity** — Agents have same permissions as users
- ✅ **Markdoc Policies** — Markdown-based governance with versioning
- ✅ **Dashboard UI** — Customer-friendly (no curl, no tokens)
- ✅ **Multi-Agent Orchestration** — 1-100 agents in parallel
- ✅ **Audit Trail** — Immutable version history + hashing

---

## 📊 Complete Feature Set

### Backend (APIs)

**Markdoc Policies:**
```
POST   /api/markdoc-policies              Create policy
GET    /api/markdoc-policies              List policies
GET    /api/markdoc-policies/[id]         Fetch markdown
POST   /api/markdoc-policies/[id]         Render with Markdoc
PUT    /api/markdoc-policies/[id]         Update policy
DELETE /api/markdoc-policies/[id]         Delete policy
```

**Agent Management:**
```
POST   /api/agents/permissions/setup      Grant permissions
GET    /api/agents/permissions/setup      Check permissions
POST   /api/agents                        Create agent
GET    /api/agents                        List agents
```

**Orchestration:**
```
POST   /api/orchestrate/execute           Run 1-100 agents parallel/serial
GET    /api/orchestrate/status            Check execution status
```

**Health:**
```
GET    /api/health                        Service health
GET    /api/deployment-info               Deployment metadata
```

### Frontend (Dashboard)

**Markdoc Policies:**
```
/dashboard/markdoc-policies              List all policies
/dashboard/markdoc-policies/new           Create policy (form + markdown editor)
/dashboard/markdoc-policies/[id]          View/Edit policy (rendered + markdown tabs)
```

**Agents:**
```
/dashboard/agents                         List agents with status
/dashboard/agents/connect                 Connect new agent (wizard)
/dashboard/agents/[id]/permissions       Manage agent permissions (granular)
```

---

## 🚀 Customer Quick Start

### Step 1: Create Policy (No Code)

```
1. Login → Dashboard
2. Click "Markdoc Policies"
3. Click "+ Create Policy"
4. Fill form:
   Name: Agent Execution Policy
   Description: Rules for agent actions
   Markdown: [use template or write custom]
5. Click "Save"
6. See rendered output live
```

### Step 2: Connect Agent (No Token Export)

```
1. Dashboard → Agents
2. Click "+ Connect Agent"
3. Select type (Claude / ChatGPT / Custom / MCP)
4. Enter agent name
5. Click "Connect"
6. Get token (one-time, copy to clipboard)
7. Token hidden after - no manual management needed
```

### Step 3: Set Permissions (No JSON)

```
1. Dashboard → Agents → [Agent] → Permissions
2. Toggle permissions:
   ✓ org.execute (run actions)
   ✓ org.view_reports (see analytics)
   ✓ org.view_evidence (see audit logs)
   ✓ org.manage_agents (if admin agent)
3. Click "Save"
```

---

## 🔐 Permissions Model

### Granular Per-Agent Permissions

```
Core Capabilities:
├─ org.execute              Run and execute actions

Administrative:
├─ org.manage_agents        Create/edit agents
├─ org.manage_api_keys      Manage API keys
├─ org.manage_policies      CRUD policies

Viewing & Reporting:
├─ org.view_reports         See execution analytics
├─ org.view_evidence        See audit logs
```

### Default (New Agents)
```
✓ org.execute
✓ org.view_reports
✓ org.view_evidence
```

---

## 📋 Database Schema

### policies_markdoc (Governance)
```sql
- id UUID
- org_id UUID
- name TEXT (unique per org)
- markdown_content TEXT (Markdoc syntax)
- version INT (auto-increment)
- status TEXT (draft|active|archived)
- is_default BOOLEAN
- content_hash TEXT (SHA256)
- policy_hash TEXT (constraint hash)
- created_at, updated_at, created_by, updated_by
```

### policy_markdoc_versions (Audit Trail)
```sql
- id UUID
- policy_id UUID FK
- version INT (immutable)
- markdown_content TEXT (snapshot)
- content_hash TEXT
- policy_hash TEXT
- change_reason TEXT
- changed_by UUID
- created_at
```

### agent_permissions (Access Control)
```sql
- id UUID
- org_id UUID
- agent_id TEXT (FK)
- permissions TEXT[] (array)
- default_role TEXT
- Fallback: org.execute, org.view_reports, org.view_evidence
```

---

## 🎯 Use Cases

### Use Case 1: Compliance Agent
```
Agent reads audit logs and generates compliance reports

Setup:
1. Create policy (data access rules)
2. Connect agent
3. Grant: org.execute + org.view_evidence

Agent can:
✓ Read audit logs
✓ Generate reports
✗ Modify data
✗ Delete records
```

### Use Case 2: Multi-Agent Research (Parallel)
```
5 agents research different topics simultaneously

API Call:
POST /api/orchestrate/execute
{
  "task_name": "Market Research",
  "execution_mode": "parallel",
  "timeout_per_agent_ms": 30000,
  "subagents": [agent1, agent2, agent3, agent4, agent5]
}

Result:
✓ All execute concurrently
✓ Results in ~30 seconds
✓ Full audit trail recorded
```

### Use Case 3: Admin Agent
```
Agent manages other agents

Setup:
1. Create admin policy
2. Connect agent
3. Grant: org.execute + org.manage_agents + org.manage_api_keys + org.manage_policies

Agent can:
✓ Create new agents
✓ Revoke API keys
✓ Update policies
✓ Execute other agents
```

---

## 🔗 Key Workflows

### Workflow 1: Create & Deploy Policy

```
Dashboard Form
    ↓
POST /api/markdoc-policies
    ↓
Backend validation + hashing
    ↓
Insert policies_markdoc (v1, active)
    ↓
Return policy_id
    ↓
UI shows rendered output + version
    ↓
Agents can now use this policy
```

### Workflow 2: Connect Agent (n2n)

```
Agent Connect Wizard
    ↓
Select type (Claude/ChatGPT/Custom/MCP)
    ↓
Configure name + endpoint
    ↓
POST /api/agents/permissions/setup
    ↓
Backend generates scoped token
    ↓
Token shown once (UI: copy to clipboard)
    ↓
Token hidden automatically
    ↓
Agent ready to use (token never exposed in logs)
```

### Workflow 3: Execute Multi-Agent

```
Application calls:
POST /api/orchestrate/execute
  - task_name
  - execution_mode (parallel|sequential)
  - timeout_per_agent_ms
  - subagents array
    ↓
Check org quota + agent permissions
    ↓
Validate agent_permissions table
    ↓
Promise.all() for parallel execution
    ↓
Collect results + status
    ↓
Record audit trail (who, what, when, decision)
    ↓
Return {results, duration, proof}
```

---

## 🛡️ Security & Audit

### Authentication
- ✅ Session-based (Supabase auth)
- ✅ Internal service tokens (agent auth fallback)
- ✅ No token files/env vars exposed to users
- ✅ Scoped tokens generated once, hidden after

### Authorization
- ✅ Per-org isolation
- ✅ Per-agent permission granularity
- ✅ Role-based access control
- ✅ Permission check before execution

### Audit & Compliance
- ✅ Policy versioning (auto-increment)
- ✅ Content hashing (SHA256)
- ✅ Change tracking (who, when, what, why)
- ✅ Immutable audit trail (policy_versions table)
- ✅ Decision recording (orchestration_executions)

---

## 📈 Markdoc Components

### PolicyRule (Decision Gate)
```markdown
{% PolicyRule 
  type="allow|block|review"
  condition="confidence >= 0.90"
  resource="user_data"
  action="read"
/%}

Allows rule: execute when confidence >= 90%
Block rule: reject when condition true
Review rule: require approval when condition true
```

### GateEvaluator (Interactive Testing)
```markdown
{% GateEvaluator 
  policyId="policy-123"
  interactive=true
/%}

Live policy testing UI with JSON input
```

### Alert (Info Boxes)
```markdown
{% Alert type="info|warning|error|success" title="Title" %}
Message content
{% /Alert %}
```

---

## ✅ Verification

### Health Check
```bash
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

{
  "ok": true,
  "service": "dsg-control-plane",
  "core_ok": true,
  "db_ok": true,
  "rateLimiter": { "ok": true }
}
```

### Deployment Info
```bash
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/deployment-info | jq .

{
  "ok": true,
  "deployment": {
    "commit": "da60c4d...",
    "branch": "main",
    "environment": "production"
  },
  "service": {
    "name": "dsg-control-plane",
    "version": "2.0.0",
    "phase": "phase-2-complete"
  },
  "features": {
    "markdocPolicies": true,
    "agentPermissions": true,
    "multiAgentOrchestration": true,
    "policyVersioning": true
  }
}
```

---

## 📝 API Examples

### Create Policy
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/markdoc-policies \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Agent Policy v1",
    "description": "Rules for agent execution",
    "markdown_content": "# Policy\n\n{% PolicyRule type=\"allow\" condition=\"confidence >= 0.9\" /%}",
    "is_default": true
  }'

# Response
{
  "success": true,
  "policy_id": "550e8400-e29b-41d4-a716-446655440000",
  "policy": {
    "id": "...",
    "name": "Agent Policy v1",
    "version": 1,
    "status": "active",
    "created_at": "2026-06-16T..."
  }
}
```

### Execute Parallel Agents
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/orchestrate/execute \
  -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN" \
  -H "x-org-id: $ORG_UUID" \
  -H "x-agent-id: $ORCHESTRATOR_AGENT" \
  -H "x-internal-service: orchestrator" \
  -H "Content-Type: application/json" \
  -d '{
    "task_name": "Parallel Task",
    "execution_mode": "parallel",
    "timeout_per_agent_ms": 30000,
    "subagents": [
      {"agent_id": "agent-1", "subtask": {"data": {"query": "topic 1"}}},
      {"agent_id": "agent-2", "subtask": {"data": {"query": "topic 2"}}},
      {"agent_id": "agent-3", "subtask": {"data": {"query": "topic 3"}}}
    ]
  }'

# Response
{
  "success": true,
  "orchestration_id": "orch-123",
  "results": [
    {
      "agent_id": "agent-1",
      "status": "success",
      "result": {...},
      "latency_ms": 2500
    },
    ...
  ],
  "total_duration_ms": 2500,
  "all_succeeded": true
}
```

---

## 📚 Files & Structure

```
app/api/
├── markdoc-policies/
│   ├── route.ts                 POST/GET policies
│   └── [id]/
│       ├── route.ts             GET policy markdown, POST render
│       └── update/route.ts       PUT/DELETE policy

├── agents/
│   ├── permissions/
│   │   └── setup/route.ts       POST/GET agent permissions
│   └── ...

└── orchestrate/
    └── execute/route.ts         POST execute multi-agent

app/dashboard/
├── markdoc-policies/
│   ├── page.tsx                 List policies
│   ├── new/page.tsx             Create policy form
│   └── [id]/page.tsx            View policy + render

├── agents/
│   ├── page.tsx                 List agents
│   ├── connect/page.tsx         Connect agent wizard
│   └── [id]/permissions/        Manage permissions
│       └── page.tsx

lib/markdoc/
├── components.tsx               PolicyRule, GateEvaluator, Alert
├── renderer.tsx                 Markdoc parser + renderer
└── example-policy.md            Demo policy

supabase/migrations/
├── 20260616_add_agent_permissions.sql    Agent permissions table
└── 20260616_add_policies_table.sql       Policies + versioning
```

---

## ✨ Key Improvements Over Phase 1

| Aspect | Phase 1 | Phase 2 |
|--------|---------|---------|
| **Agent Capabilities** | Execute only | Execute + manage agents |
| **Permissions** | Static role | Granular per-agent |
| **Policies** | Runtime rules only | Markdoc versioned |
| **Concurrency** | Single agent | 1-100 parallel agents |
| **Dashboard** | Minimal | Full customer UI |
| **Audit Trail** | Basic logging | Immutable versioning |
| **Token Management** | Manual export | Auto-scoped, hidden |

---

## 🎓 Customer Education

**For New Customers:**
1. Start with `/policies-demo` (see Markdoc rendering)
2. Create first policy in dashboard (copy template)
3. Connect one agent (step-by-step wizard)
4. Grant basic permissions (org.execute)
5. Execute simple task
6. View audit trail

**For Advanced Customers:**
1. Use API directly with internal service tokens
2. Implement parallel orchestration (50-100 agents)
3. Create custom policies with complex conditions
4. Build governance automation
5. Export audit logs for compliance

---

## 📞 Support

**Documentation:**
- Dashboard: `/dashboard/markdoc-policies`
- Policy Demo: `/policies-demo`
- API Docs: See section above

**Health & Monitoring:**
- Status: `/api/health`
- Deployment: `/api/deployment-info`
- Logs: `/dashboard/audit` (if available)

**Common Issues:**
- "Unauthorized" → Check agent permissions
- "Policy not found" → Verify org_id match
- "Timeout" → Increase timeout_per_agent_ms
- "Agent not found" → Ensure agent is active

---

## ✅ Production Readiness

- [x] All APIs implemented & tested
- [x] Database schema deployed
- [x] Dashboard fully functional
- [x] Session auth transparent
- [x] Scoped tokens auto-hidden
- [x] Audit trail immutable
- [x] Content hashing (SHA256)
- [x] Markdoc rendering live
- [x] TypeScript strict mode
- [x] Error handling complete
- [x] Code on main branch
- [x] Vercel deployment ready

---

**Phase 2 Status: ✅ PRODUCTION READY**

All features tested, documented, and live.

- Version: 2.0.0
- Deployed: 2026-06-16
- Commit: da60c4d
- Branch: main
