# DSG Context Discovery MCP Server

**Enterprise Agent Context Platform for DSG ONE**

A Model Context Protocol (MCP) server that enables agents to access governed memory, policy, and audit data for intelligent decision-making.

## Overview

The DSG Context Discovery MCP Server provides agents with access to:

- **Agent Memory** — Previous episodes, decisions, and learned patterns
- **Governance Policies** — Active policies filtered by organization and risk level
- **Audit Trails** — Historical decision logs and execution patterns
- **Context Packs** — Pre-built context bundles for specific purposes (planning, approval, execution, verification)

This enables agents to make decisions grounded in real organizational history and governance rules, rather than relying on hallucination or generic training data.

## Architecture

```
Agent
  │
  ├── MCP Client
  │     │
  │     └─── query_memory_events
  │     └─── query_policies
  │     └─── query_audit_logs
  │     └─── get_context_pack
  │
  └─── MCP Server (dsg-context-discovery)
        │
        └─── Supabase (service-role auth)
              │
              ├── dsg_memory_events (Agent Memory)
              ├── ai_policies (Governance Rules)
              ├── ai_audit_logs (Decision History)
              └── dsg_memory_context_packs (Context Bundles)
```

## Tools

### 1. query_memory_events

Search agent memory events to discover previous episodes, decisions, and patterns.

**Parameters:**
- `workspace_id` (required) — Workspace to query within
- `memory_kind` — Type of memory: `policy`, `decision`, `evidence`, `workflow`, `command`, `all`
- `trust_level` — Filter by confidence: `observed`, `verified`, `user_supplied`, `system_generated`
- `limit` — Maximum results (default: 10)
- `days_back` — Search window in days (default: 30)

**Example:**
```json
{
  "workspace_id": "ws_123",
  "memory_kind": "decision",
  "trust_level": "verified",
  "limit": 5
}
```

**Response:**
```
Found 3 memory events (decision):
- [verified] decision: Agent deployed service with approval from ops team
- [verified] decision: Cost spike detected, escalated to finance
- [verified] decision: Security scan passed, deployment cleared
```

### 2. query_policies

Retrieve active governance policies applicable to an organization.

**Parameters:**
- `org_id` (required) — Organization ID
- `policy_type` — Filter by type: `deployment`, `execution`, `data_handling`, `compliance`, `all`
- `risk_level` — Filter by minimum risk: `low`, `medium`, `high`, `critical`, `all`
- `enabled_only` — Return only enabled policies (default: true)

**Example:**
```json
{
  "org_id": "org_456",
  "policy_type": "deployment",
  "risk_level": "high"
}
```

**Response:**
```
Found 2 policies:
- [high] Deployment Gate (v3): Require approval for production changes
- [critical] Cost Limit (v5): Block deployments exceeding $10k/month
```

### 3. query_audit_logs

Search audit trail to understand decision history and patterns.

**Parameters:**
- `org_id` (required) — Organization ID
- `event_type` — Filter by event type (e.g., `policy_evaluation`, `execution_blocked`)
- `decision` — Filter by outcome: `pass`, `review`, `block`, `unsupported`
- `days_back` — Search window in days (default: 7)
- `limit` — Maximum results (default: 10)

**Example:**
```json
{
  "org_id": "org_456",
  "decision": "block",
  "days_back": 7
}
```

**Response:**
```
Found 2 audit entries:
- [block] policy_evaluation (evaluate): Cost limit exceeded
- [block] execution_blocked (execute): Approval missing
```

### 4. get_context_pack

Build a context bundle from memory, policies, and audit history for decision-making.

**Parameters:**
- `workspace_id` (required) — Workspace ID for context scope
- `org_id` (required) — Organization ID for policy/audit scope
- `purpose` (required) — Purpose: `planning`, `approval_review`, `runtime_execution`, `verification`
- `topic` — Topic to focus gathering (e.g., `deployment_failure`, `cost_spike`)

**Example:**
```json
{
  "workspace_id": "ws_123",
  "org_id": "org_456",
  "purpose": "runtime_execution",
  "topic": "deployment_approval"
}
```

**Response:**
```
Context pack created (pack_789):

Context Pack for: runtime_execution
Topic: deployment_approval

RECENT DECISIONS:
- policy_evaluation: pass (All policies approved)
- execution_blocked: block (Cost limit exceeded)

ACTIVE POLICIES:
- Deployment Gate [high]: Require approval for production changes
- Cost Limit [critical]: Block deployments exceeding $10k/month

MEMORY CONTEXT:
- [decision] Agent deployed service with approval from ops team
- [evidence] Cost analysis shows 15% increase in usage
```

## Setup

### 1. Installation

The MCP server is part of the DSG Platform monorepo.

```bash
# Ensure dependencies are installed
npm ci

# Build the MCP server (TypeScript → JavaScript)
npm run mcp:build:context-discovery
```

### 2. Configuration

Add the MCP server to your `.mcp.json`:

```json
{
  "mcpServers": {
    "dsg-context-discovery": {
      "type": "stdio",
      "command": "node",
      "args": ["--loader", "ts-node/esm", "mcp-server/dsg-context-discovery.ts"],
      "env": {
        "SUPABASE_URL": "${SUPABASE_URL}",
        "SUPABASE_SERVICE_KEY": "${SUPABASE_SERVICE_KEY}"
      }
    }
  }
}
```

### 3. Environment Variables

Required environment variables:

- `SUPABASE_URL` — Your Supabase project URL
- `SUPABASE_SERVICE_KEY` — Service-role key (server-side only)

**⚠️ Security:** Never commit service keys. Use environment variable injection or secure secret management.

### 4. Running the Server

```bash
# Run directly (stdio transport)
npm run mcp:serve:context-discovery

# Or configure in Claude Code / MCP client
```

## Usage in Agents

Once configured, agents can call the MCP tools to make context-aware decisions.

### Example: Decision with Context

```typescript
// Agent planning a deployment
const context = await mcp.callTool("get_context_pack", {
  workspace_id: "ws_123",
  org_id: "org_456",
  purpose: "runtime_execution",
  topic: "deployment_approval",
});

// Query what happened last time
const policies = await mcp.callTool("query_policies", {
  org_id: "org_456",
  risk_level: "high",
});

const history = await mcp.callTool("query_audit_logs", {
  org_id: "org_456",
  event_type: "policy_evaluation",
  days_back: 7,
});

// Now decide based on context, not guessing
if (context.decision === "pass" && history.all_approvals) {
  return EXECUTE;
} else if (policies.cost_limit && costEstimate > limit) {
  return BLOCK;
} else {
  return REVIEW;
}
```

## Data Sources

### dsg_memory_events

Stores governed memory events with trust levels and content hashing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Event ID |
| `workspace_id` | UUID | Workspace scope |
| `memory_kind` | TEXT | Type: policy, decision, evidence, workflow, command |
| `raw_text` | TEXT | Original content |
| `normalized_summary` | TEXT | Extracted summary |
| `trust_level` | TEXT | Confidence: observed, verified, user_supplied, system_generated |
| `status` | TEXT | active, stale, conflicted, redacted, blocked |
| `created_at` | TIMESTAMPTZ | Event timestamp |

### ai_policies

Governance policies for the organization.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Policy ID |
| `org_id` | UUID | Organization scope |
| `name` | TEXT | Policy name |
| `policy_type` | TEXT | Type: deployment, execution, data_handling, compliance |
| `risk_level` | TEXT | Risk: low, medium, high, critical |
| `enabled` | BOOLEAN | Is policy active |
| `rules` | JSONB | Policy rules array |
| `version` | INT | Policy version |

### ai_audit_logs

Immutable audit trail of governance decisions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Log entry ID |
| `org_id` | UUID | Organization scope |
| `event_type` | TEXT | Type of event |
| `action` | TEXT | Action: create, evaluate, block, approve |
| `decision` | TEXT | Outcome: pass, review, block, unsupported |
| `decision_reason` | TEXT | Why the decision was made |
| `actor_type` | TEXT | Actor: user, system, agent |
| `execution_details` | JSONB | Execution context |
| `created_at` | TIMESTAMPTZ | Timestamp |

### dsg_memory_context_packs

Pre-built context bundles for agent use.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Pack ID |
| `workspace_id` | UUID | Workspace scope |
| `purpose` | TEXT | Purpose: planning, approval_review, runtime_execution, verification |
| `memory_ids` | UUID[] | Referenced memory event IDs |
| `context_text` | TEXT | Full context text |
| `context_hash` | TEXT | SHA256 hash for integrity |
| `gate_status` | TEXT | Status: PASS, REVIEW, BLOCK |
| `created_at` | TIMESTAMPTZ | Timestamp |

## Best Practices

### 1. Trust Levels

Use verified memory when possible for decisions:

```typescript
// Better: High-confidence data
const verified = await mcp.callTool("query_memory_events", {
  trust_level: "verified",
  // ...
});

// Okay: Include other sources with context
const all = await mcp.callTool("query_memory_events", {
  trust_level: "observed", // Lower confidence
  // ...
});
```

### 2. Recency Matters

Filter for recent history when patterns change:

```typescript
// Last 7 days = more recent patterns
const recent = await mcp.callTool("query_audit_logs", {
  days_back: 7, // Recent
  // ...
});

// Last 90 days = long-term trends
const trends = await mcp.callTool("query_audit_logs", {
  days_back: 90, // Trends
  // ...
});
```

### 3. Context Packs for Multi-Step Tasks

Use context packs to hold state across agent steps:

```typescript
// Create once
const pack = await mcp.callTool("get_context_pack", {
  purpose: "approval_review",
  // ...
});

// Reference throughout
if (pack.gate_status === "PASS") {
  // Safe to proceed
}
```

### 4. Error Handling

Handle missing data gracefully:

```typescript
const history = await mcp.callTool("query_audit_logs", {
  // ...
});

if (history.error) {
  return REVIEW; // Default to caution
} else if (history.length === 0) {
  return REVIEW; // No precedent, need human approval
} else {
  // Decide based on history
}
```

## Troubleshooting

### "Error querying memory: missing SUPABASE_URL"

**Cause:** Environment variables not set.

**Fix:**
```bash
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_KEY="your_service_key_here"
npm run mcp:serve:context-discovery
```

### "Error: unable to connect to database"

**Cause:** Service key is invalid or Supabase is unreachable.

**Fix:**
1. Verify service key in Supabase dashboard (Settings → API)
2. Check firewall/IP allowlisting
3. Verify Supabase project is running

### "Empty results" for query_memory_events

**Cause:** No memory events in that workspace yet, or trust_level filter is too restrictive.

**Fix:**
```typescript
// First, check with looser filters
const all = await mcp.callTool("query_memory_events", {
  trust_level: "user_supplied", // Broader
  days_back: 90, // Longer window
});
```

## Next Steps

1. **Automated RCA Integration** — Add an MCP tool for automated root cause analysis using this context
2. **Memory Insights** — Build a dashboard of common patterns and anomalies
3. **Policy Recommendations** — Suggest policy updates based on audit patterns
4. **Skill Registry** — Cache successful solution approaches from memory

## References

- [DSG Memory Layer](./RUNBOOK_MEMORY.md) — Memory schema and governance
- [CLAUDE.md](../CLAUDE.md) — Truth boundary and claim policy
- [MCP Spec](https://spec.modelcontextprotocol.io) — Model Context Protocol specification
