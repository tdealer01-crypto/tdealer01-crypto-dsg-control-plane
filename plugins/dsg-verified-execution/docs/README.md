# DSG Verified Execution Plugin

**Version**: 1.0.0  
**Status**: Agent Plugins 1.0 compatible  
**Distribution**: Copilot, VS Code, Claude Code, GitHub CLI

## Overview

DSG Verified Execution is an AI agent governance plugin that gates, aligns, and proves agent actions before execution. It bridges agent intent (what an agent wants to do) with deterministic policy constraints (what it's allowed to do), capturing cryptographic proof and audit trails for compliance.

### Core flow

```
Agent intent
    ↓
[Plan Alignment Check] ← Verify against approved plan
    ↓ approved
[Constraint Evaluation] ← DSG deterministic gate
    ↓ allowed/review
[Human Approval?] ← If REVIEW decision
    ↓ approved
[Execute Action] ← Route through DSG spine
    ↓ executed
[Generate Proof] ← Cryptographic proof of execution
    ↓
[Collect Evidence] ← Audit trail + proof + lineage
```

### Key properties

- **Deterministic**: Same input → same decision (suitable for formal verification)
- **Evidence-first**: Every execution generates cryptographic proof
- **Audit-ready**: Full lineage trail captured for compliance/regulatory review
- **Policy-aligned**: Constraints defined in DSG ONE control plane
- **Plan-aware**: Verifies execution aligns with agent's approved plan

## Installation

### Via Copilot / Claude Code

```bash
# Install the plugin
/plugin install dsg-verified-execution@dsg-plugins

# Or for Copilot marketplaces
copilot plugin install dsg-verified-execution
```

### Configuration

Set required environment variables:

```bash
DSG_API_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
DSG_API_KEY="bearer_token_for_spine_execute"
```

For enterprise deployments, set via:
- Copilot admin console (Settings → Plugins → Environment)
- VS Code settings
- `.env` in project root

## Usage

### Basic execution with proof

```typescript
// Using MCP tools directly
const result = await mcp.callTool("execution_proof_request", {
  agent_id: "agent-uuid-123",
  action: "update_database_config",
  result: { updated: true, changes: 42 },
  plan_hash: "sha256:abc123...",
});

// Response includes:
// {
//   decision: "ALLOW",
//   reason: "Action aligns with approved plan and satisfies constraints",
//   proof: { hash: "...", schema: "ccvs-makk8-...", timestamp: "..." },
//   evidence: { execution_trace: {...}, lineage: [...] }
// }
```

### Via skill (recommended)

```typescript
// Using the DSG Verified Execute skill
const execution = await skill.dsgVerifiedExecute({
  agent_id: "agent-uuid-123",
  action: "update_config",
  plan_hash: "sha256:abc123...",
  risk_level: "medium",
});

// Step 1: Plan alignment check
// Step 2: Constraint evaluation
// Step 3: Human approval (if REVIEW)
// Step 4: Execute through spine
// Step 5: Generate proof
// Step 6: Collect evidence
```

### Constraint evaluation only

```typescript
// Check if an action would be allowed (without executing)
const decision = await mcp.callTool("constraint_evaluate", {
  agent_id: "agent-123",
  action: "delete_user_account",
  target_resource: "users_table",
  risk_level: "high",
});

// Returns ALLOW | BLOCK | REVIEW
```

## MCP Tools Reference

### `plan_alignment`

Check if execution aligns with approved plan.

**Inputs:**
- `agent_id` (string, required): Agent identifier
- `action` (string, required): Action to verify
- `plan_hash` (string, required): Approved plan hash
- `context` (object, optional): Execution context

**Outputs:**
- `decision`: ALLOW | BLOCK | REVIEW
- `reason`: Explanation
- `alignment_score`: 0–100 (how closely aligned)

### `constraint_evaluate`

Evaluate DSG governance constraints.

**Inputs:**
- `agent_id` (string, required)
- `action` (string, required)
- `target_resource` (string, required): What's being modified
- `risk_level` (string, optional): low | medium | high

**Outputs:**
- `decision`: ALLOW | BLOCK | REVIEW
- `reason`: Constraint violation detail (if BLOCK)
- `violated_constraints`: List of failed constraints

### `execution_proof_request`

Submit execution and request proof.

**Inputs:**
- `agent_id` (string, required)
- `action` (string, required)
- `result` (object, required): Execution result
- `plan_hash` (string, optional)
- `timestamp` (string, optional): ISO 8601

**Outputs:**
- `decision`: Final decision
- `proof`: Cryptographic proof object
- `evidence`: Execution trace + audit lineage

### `evidence_retrieve`

Get audit trail and execution history.

**Inputs:**
- `agent_id` (string, required)
- `execution_id` (string, optional): Specific execution
- `time_range` (object, optional): start/end timestamps
- `include_proofs` (boolean, optional): Include proofs

**Outputs:**
- `evidence`: Array of execution records
- `proofs`: Cryptographic proofs (if requested)
- `lineage`: Complete audit chain

## Policies and decisions

### Decision types

| Decision | Meaning | Action |
|----------|---------|--------|
| **ALLOW** | Action is authorized, execute immediately | Proceed to execution |
| **BLOCK** | Action violates constraints, do not execute | Stop, report reason |
| **REVIEW** | Action requires human approval before execution | Request approval, then re-check |

### Constraint mapping

DSG constraints (defined in control plane) map to:
- **Plan alignment**: Action must match approved plan scope
- **Resource constraints**: Only allowed targets can be modified
- **Rate/quota limits**: Execution counts checked against limits
- **Time-based policies**: Execution restricted to allowed time windows
- **Approval chain**: High-risk actions need explicit approval

## Enterprise features

### Allow/block policies

Admins can configure which agents/actions are allowed:

```json
{
  "agent_rules": {
    "agent-uuid-123": {
      "allowed_actions": ["read_config", "write_logs"],
      "blocked_actions": ["delete_user", "modify_billing"],
      "risk_threshold": "medium"
    }
  }
}
```

### Audit and compliance

All executions are recorded with:
- Agent ID, action, timestamp
- Decision and reasoning
- Plan hash (if applicable)
- Execution result (success/failure)
- Cryptographic proof
- Full lineage/sequence

Access audit logs via:

```typescript
const logs = await mcp.callTool("evidence_retrieve", {
  agent_id: "agent-123",
  time_range: { start: "2024-08-01", end: "2024-08-31" },
  include_proofs: true,
});
```

## Production deployment

### Prerequisites

1. **DSG ONE control plane running** and accessible at `DSG_API_URL`
2. **Valid API key** with spine/execute permissions (`DSG_API_KEY`)
3. **Agent registered** in DSG ONE control plane with active status
4. **Policy definitions** loaded in control plane database

### Verification

Check readiness:

```bash
curl -H "Authorization: Bearer ${DSG_API_KEY}" \
  "${DSG_API_URL}/api/agent/status"

# Expected: 200 OK with deployment info
```

### Monitoring

Monitor execution decisions and failures:

```bash
# Get execution stats
curl -H "Authorization: Bearer ${DSG_API_KEY}" \
  "${DSG_API_URL}/api/usage?agent_id=agent-123"

# Get audit trail
curl -H "Authorization: Bearer ${DSG_API_KEY}" \
  "${DSG_API_URL}/api/audit?agent_id=agent-123"
```

## Troubleshooting

### 401 Unauthorized

**Cause**: `DSG_API_KEY` is invalid or expired.  
**Fix**: Regenerate key in DSG ONE control plane, update environment.

### 403 Forbidden

**Cause**: Agent not registered or lacks permissions.  
**Fix**: Verify agent is active in control plane and has `execute` permission.

### BLOCK decision on valid action

**Cause**: Constraints not aligned with intended action.  
**Fix**: Check policy definitions in control plane; update plan hash if plan changed.

### Proof generation fails

**Cause**: Execution trace missing or malformed.  
**Fix**: Verify `result` object is JSON serializable; check logs at `DSG_API_URL/api/execution-logs`.

## Support

- **Issues**: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues
- **Documentation**: See `docs/` in this plugin
- **Contact**: t.dealer01@dsg.pics

## License

Proprietary. DSG ONE / ProofGate. All rights reserved.
