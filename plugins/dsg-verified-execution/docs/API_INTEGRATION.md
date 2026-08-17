# DSG Verified Execution — API Integration Guide

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AI Agent (Copilot, Claude Code, Codex, custom agent)       │
└────────────────┬────────────────────────────────────────────┘
                 │
         [DSG Verified Execution Plugin]
                 │
         ┌───────┴────────────────┐
         │                        │
    [MCP Server]            [Skill / CLI]
         │                        │
    4 MCP tools               Workflow
         │                        │
    ┌────┴────────────────────────┘
    │
POST /api/spine/execute
    │
┌───┴──────────────────────────────────────────────┐
│     DSG ONE Control Plane                         │
│  • Runtime spine pipeline                        │
│  • Deterministic gate evaluation                 │
│  • Policy/constraint checking                    │
│  • Proof generation                              │
│  • Audit trail recording                         │
└───────────────────────────────────────────────────┘
```

## Integration points

### 1. MCP Server (default)

The plugin provides an MCP server that agents communicate with via standard MCP protocol.

**Entry**: `mcp-server/index.ts`  
**Command**: `node --loader ts-node/esm mcp-server/index.ts`  
**Transport**: stdio (JSON-RPC)

**Tools exposed**:
- `plan_alignment`
- `constraint_evaluate`
- `execution_proof_request`
- `evidence_retrieve`

### 2. Direct HTTP API (alternative)

Agents can also call DSG directly without MCP:

```bash
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/spine/execute" \
  -H "Authorization: Bearer ${DSG_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-uuid-123",
    "action": "update_config",
    "params": {
      "tool": "constraint_evaluate",
      "target_resource": "config_table"
    }
  }'
```

### 3. Skill-based workflow

The bundled `dsg-verified-execute` skill orchestrates the full flow:

```
validate_agent → align_plan → evaluate_constraints → 
[approval?] → execute → generate_proof → collect_evidence
```

## API contract: POST /api/spine/execute

This is the canonical entry point that the plugin calls.

### Request

```json
{
  "agent_id": "agent-uuid-123",
  "action": "update_database_row",
  "params": {
    "tool": "constraint_evaluate",
    "target_resource": "users",
    "risk_level": "low"
  },
  "plan_hash": "sha256:abc123...",
  "evidence_request": false
}
```

**Fields**:
- `agent_id` (string, required): Unique agent identifier
- `action` (string, required): Action being executed
- `params` (object, required): Tool parameters (varies by tool)
  - `tool` (string): MCP tool name (plan_alignment | constraint_evaluate | execution_proof_request | evidence_retrieve)
- `plan_hash` (string, optional): Approved plan hash for alignment
- `evidence_request` (boolean, optional): Include audit trail in response

### Response

```json
{
  "decision": "ALLOW",
  "reason": "Action aligns with plan and satisfies all constraints",
  "proof": {
    "hash": "sha256:def456...",
    "schema": "ccvs-makk8-z3-proof-v1",
    "timestamp": "2024-08-17T12:34:56Z"
  },
  "evidence": {
    "execution_trace": {
      "plan_alignment_score": 0.98,
      "constraints_checked": 12,
      "constraints_passed": 12
    },
    "lineage": [
      "intent:agent-123:2024-08-17T12:34:00Z",
      "gate:constraint_evaluate:2024-08-17T12:34:05Z",
      "proof:generate:2024-08-17T12:34:10Z"
    ]
  }
}
```

**Fields**:
- `decision` (string): ALLOW | BLOCK | REVIEW
- `reason` (string): Human-readable explanation
- `proof` (object, optional): Cryptographic proof
  - `hash`: Deterministic proof hash
  - `schema`: Proof schema version
  - `timestamp`: ISO 8601 timestamp
- `evidence` (object, optional): Audit trail (if `evidence_request: true`)

## Tool specifications

### `plan_alignment`

Verify execution aligns with approved plan.

**Request**:
```json
{
  "params": {
    "tool": "plan_alignment",
    "agent_id": "agent-123",
    "action": "modify_config",
    "plan_hash": "sha256:abc...",
    "context": {
      "config_key": "feature_flags",
      "value": { "new_feature": true }
    }
  }
}
```

**Response**:
```json
{
  "decision": "ALLOW",
  "reason": "Action modifies only approved keys in the plan",
  "alignment_score": 0.95
}
```

### `constraint_evaluate`

Check governance constraints without plan reference.

**Request**:
```json
{
  "params": {
    "tool": "constraint_evaluate",
    "agent_id": "agent-123",
    "action": "delete_user_record",
    "target_resource": "users_table",
    "risk_level": "high"
  }
}
```

**Response**:
```json
{
  "decision": "REVIEW",
  "reason": "High-risk deletion requires approval",
  "violated_constraints": [
    "approval_required_for_high_risk"
  ]
}
```

### `execution_proof_request`

Submit execution result and generate proof.

**Request**:
```json
{
  "params": {
    "tool": "execution_proof_request",
    "agent_id": "agent-123",
    "action": "write_audit_log",
    "result": {
      "success": true,
      "rows_affected": 1,
      "timestamp": "2024-08-17T12:34:56Z"
    },
    "plan_hash": "sha256:abc...",
    "timestamp": "2024-08-17T12:34:56Z"
  }
}
```

**Response**:
```json
{
  "decision": "ALLOW",
  "proof": {
    "hash": "sha256:def456...",
    "schema": "ccvs-makk8-z3-proof-v1",
    "timestamp": "2024-08-17T12:34:56Z"
  },
  "evidence": {
    "execution_trace": {...},
    "lineage": [...]
  }
}
```

### `evidence_retrieve`

Fetch audit trail and proofs.

**Request**:
```json
{
  "params": {
    "tool": "evidence_retrieve",
    "agent_id": "agent-123",
    "execution_id": "exec-789",
    "time_range": {
      "start": "2024-08-01T00:00:00Z",
      "end": "2024-08-31T23:59:59Z"
    },
    "include_proofs": true
  }
}
```

**Response**:
```json
{
  "decision": "ALLOW",
  "evidence": {
    "execution_trace": [
      {
        "execution_id": "exec-789",
        "agent_id": "agent-123",
        "action": "write_log",
        "timestamp": "2024-08-17T12:34:56Z",
        "result": "success"
      }
    ],
    "proofs": [
      {
        "hash": "sha256:def456...",
        "timestamp": "2024-08-17T12:34:56Z"
      }
    ],
    "lineage": [...]
  }
}
```

## Authentication

All requests require Bearer token authentication:

```bash
Authorization: Bearer ${DSG_API_KEY}
```

The token must have:
- `read:policies` — Read policy/plan definitions
- `execute:action` — Execute actions through spine
- `write:evidence` — Write audit trail
- `read:evidence` — (For evidence_retrieve tool)

## Error handling

### 401 Unauthorized

**Cause**: Missing or invalid Bearer token.  
**Response**:
```json
{
  "error": "unauthorized",
  "message": "Invalid or missing Authorization header"
}
```

### 403 Forbidden

**Cause**: Agent lacks permissions.  
**Response**:
```json
{
  "error": "forbidden",
  "message": "agent-123 does not have execute permissions",
  "required_permission": "execute:action"
}
```

### 400 Bad Request

**Cause**: Invalid request parameters.  
**Response**:
```json
{
  "error": "bad_request",
  "message": "Missing required field: plan_hash",
  "invalid_fields": ["plan_hash"]
}
```

### 500 Internal Server Error

**Cause**: Control plane error (database, policy engine, proof generation).  
**Response**:
```json
{
  "error": "internal_error",
  "message": "Failed to evaluate constraints",
  "request_id": "req-12345",
  "support": "Contact t.dealer01@dsg.pics with request_id"
}
```

## Rate limiting

Default limits per API key:

| Endpoint | Limit | Window |
|----------|-------|--------|
| plan_alignment | 1000 req | 1 hour |
| constraint_evaluate | 5000 req | 1 hour |
| execution_proof_request | 100 req | 1 hour |
| evidence_retrieve | 500 req | 1 hour |

Exceeded limits return:

```json
{
  "error": "rate_limit_exceeded",
  "retry_after": 60
}
```

## Proof verification

Proofs are deterministic and replayable:

```typescript
// Verify a proof offline
import crypto from 'crypto';

function verifyProof(action, result, planHash, proofHash) {
  const combined = `${action}|${JSON.stringify(result)}|${planHash}`;
  const computed = crypto.createHash('sha256').update(combined).digest('hex');
  return computed === proofHash;
}

// Usage
const isValid = verifyProof(
  "write_audit_log",
  { success: true, rows_affected: 1 },
  "sha256:abc123...",
  "sha256:def456..."
);
console.log("Proof is valid:", isValid);
```

## Examples

### Example 1: Simple constraint check

Agent wants to perform an action but wants to know if it's allowed first:

```bash
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/spine/execute" \
  -H "Authorization: Bearer <your-dsg-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-copilot-dev-123",
    "action": "read_user_data",
    "params": {
      "tool": "constraint_evaluate",
      "target_resource": "users_table",
      "risk_level": "low"
    }
  }' | jq .

# Response:
# {
#   "decision": "ALLOW",
#   "reason": "Read-only action on allowed resource",
#   "proof": null,
#   "evidence": null
# }
```

### Example 2: Full execution with proof

Agent executes and wants full audit trail:

```bash
curl -X POST "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/spine/execute" \
  -H "Authorization: Bearer <your-dsg-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "agent-claude-prod-456",
    "action": "archive_old_logs",
    "params": {
      "tool": "execution_proof_request",
      "target_resource": "logs_table",
      "result": {
        "success": true,
        "archived_rows": 10000,
        "timestamp": "2024-08-17T12:34:56Z"
      }
    },
    "plan_hash": "sha256:abc123def456...",
    "evidence_request": true
  }' | jq .

# Response includes proof + full evidence lineage
```

## Monitoring and observability

### Logging

The plugin logs all tool calls to stderr. Set log level:

```bash
LOG_LEVEL=debug node --loader ts-node/esm mcp-server/index.ts
```

### Metrics

Plugin emits metrics to control plane:
- `dsg_plugin.tool_call_count` — MCP tool invocations
- `dsg_plugin.decision_distribution` — ALLOW/BLOCK/REVIEW breakdown
- `dsg_plugin.proof_generation_time_ms` — Latency for proof generation

Query via:

```bash
curl -H "Authorization: Bearer ${DSG_API_KEY}" \
  "${DSG_API_URL}/api/metrics?agent_id=agent-123"
```

## Best practices

1. **Always include `plan_hash`** for high-risk actions — enables alignment verification
2. **Use `evidence_request: true`** for critical actions — ensures audit trail
3. **Handle REVIEW decisions** with explicit human approval before retry
4. **Cache proof responses** — proofs are deterministic, same input always produces same proof
5. **Monitor decision distribution** — sudden spike in BLOCKs may indicate policy misconfiguration
