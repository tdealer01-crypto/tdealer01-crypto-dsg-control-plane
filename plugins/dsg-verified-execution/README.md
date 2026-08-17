# DSG Verified Execution Plugin

**DSG Verified Execution** is an Agent Plugins 1.0 compatible governance plugin that gates, verifies, and proves AI agent actions before execution.

Quick links:
- **Installation**: See `docs/README.md` → "Installation"
- **API Reference**: See `docs/API_INTEGRATION.md`
- **MCP Tools**: See `docs/MCP_TOOLS.md`
- **Contributing**: See `CONTRIBUTING.md` (coming soon)

---

## What it does

```
Agent Intent  →  Plan Alignment  →  Constraint Gate  →  Approval?  →  Execute  →  Proof + Evidence
```

1. **Plan Alignment**: Verify the action stays within the agent's approved plan
2. **Constraint Evaluation**: Check DSG governance constraints (resources, risk, quotas, etc.)
3. **Approval Chain**: Route high-risk actions for human review
4. **Execution**: Route through DSG ONE spine (centralized governance)
5. **Proof Generation**: Cryptographic proof of what was executed
6. **Audit Trail**: Full lineage captured for compliance

---

## Installation

### For Claude Code / Local Development

```bash
/plugin install dsg-verified-execution@dsg-plugins
```

### For Copilot / VS Code / GitHub CLI

Install via Copilot marketplace or settings panel (coming soon).

### Configuration

Set environment variables:

```bash
# Required
DSG_API_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
DSG_API_KEY="sk_live_..."  # Bearer token with spine/execute permissions

# Optional
LOG_LEVEL="info"  # debug | info | warn | error
```

---

## Usage

### MCP Tools (4 tools)

#### 1. `plan_alignment`

Check if an action aligns with the agent's approved plan.

```bash
# Tool call via MCP
tool: plan_alignment
inputs:
  agent_id: "agent-copilot-123"
  action: "update_database_config"
  plan_hash: "sha256:abc123..."
  context:
    table: "feature_config"
    key: "max_concurrent_users"
    new_value: 500
```

#### 2. `constraint_evaluate`

Evaluate DSG constraints (independent of plan).

```bash
tool: constraint_evaluate
inputs:
  agent_id: "agent-copilot-123"
  action: "delete_backup"
  target_resource: "backup_storage"
  risk_level: "high"
```

#### 3. `execution_proof_request`

Submit execution result and get cryptographic proof.

```bash
tool: execution_proof_request
inputs:
  agent_id: "agent-copilot-123"
  action: "write_audit_log"
  result:
    success: true
    rows_affected: 1
  plan_hash: "sha256:abc123..."
  timestamp: "2024-08-17T12:34:56Z"
```

#### 4. `evidence_retrieve`

Get audit trail and execution history.

```bash
tool: evidence_retrieve
inputs:
  agent_id: "agent-copilot-123"
  time_range:
    start: "2024-08-01T00:00:00Z"
    end: "2024-08-31T23:59:59Z"
  include_proofs: true
```

### Skill: `dsg-verified-execute`

Full workflow from plan alignment → proof generation.

```bash
/dsg-verified-execute
  agent_id: "agent-copilot-123"
  action: "update_config"
  plan_hash: "sha256:abc123..."
  risk_level: "medium"
```

The skill handles:
1. Agent validation
2. Plan alignment check
3. Constraint evaluation
4. Human approval (if REVIEW)
5. Action execution
6. Proof generation
7. Evidence collection

---

## Decisions

| Decision | Meaning | Next step |
|----------|---------|-----------|
| **ALLOW** | Authorized, execute immediately | Proceed with execution |
| **BLOCK** | Violates constraints, do not execute | Stop, address constraint violation |
| **REVIEW** | Requires human approval | Request approval from chain, retry after approval |

---

## File structure

```
plugins/dsg-verified-execution/
├── manifest.json                  # Claude Code plugin manifest
├── package.json                   # npm metadata
├── README.md                      # This file
├── mcp-server/
│   └── index.ts                   # MCP server (4 tools)
├── skills/
│   └── dsg-verified-execute.json  # Workflow skill definition
└── docs/
    ├── README.md                  # Installation, usage, features
    ├── API_INTEGRATION.md         # Detailed API reference
    └── MCP_TOOLS.md               # MCP tool specifications
```

---

## Development

### Running the MCP server locally

```bash
# Development mode (debug logs)
npm run mcp:server:dev

# Or with custom DSG URL
DSG_API_URL="http://localhost:3000" \
DSG_API_KEY="test_key" \
npm run mcp:server
```

### Validating the plugin

```bash
# Validate manifest against Claude Code schema
npm run validate

# From root repo (if installed)
claude plugin validate ./plugins/dsg-verified-execution
```

### Type checking

```bash
npm run type-check
```

---

## Requirements

- **Node.js** 18+
- **DSG ONE Control Plane** running at `DSG_API_URL`
- **Valid API key** (`DSG_API_KEY`) with:
  - `read:policies` — Read policy definitions
  - `execute:action` — Execute through spine
  - `write:evidence` — Write audit trail
- **Agent registered** in DSG ONE with active status

---

## Troubleshooting

### Plugin not loading

1. Check `DSG_API_KEY` is set and valid
2. Verify DSG control plane is reachable: `curl -H "Authorization: Bearer $DSG_API_KEY" $DSG_API_URL/api/agent/status`
3. Run `npm run validate` to check manifest
4. Check plugin logs for errors

### 401 Unauthorized

- Regenerate `DSG_API_KEY` in DSG ONE control plane
- Verify agent has `execute` permission

### 403 Forbidden

- Check agent is registered and active in control plane
- Verify API key has required permissions

### BLOCK decisions

- Review constraint violations in response
- Update policy in control plane or adjust action
- See `docs/API_INTEGRATION.md` error handling section

---

## Enterprise features

### Allow/block policies

Admins can configure agent permissions via control plane:

```json
{
  "agent_id": "agent-copilot-123",
  "allowed_actions": ["read_config", "write_logs"],
  "blocked_actions": ["delete_user"],
  "risk_threshold": "medium"
}
```

### Audit & compliance

All executions logged with:
- Agent ID, action, timestamp
- Decision and reasoning
- Plan hash (if applicable)
- Execution result
- Cryptographic proof
- Full lineage/sequence

Query via `evidence_retrieve` tool.

---

## Status & roadmap

**Status**: Agent Plugins 1.0 compatible (v1.0.0)

### Current

- ✅ 4 MCP tools (plan alignment, constraint eval, proof generation, evidence retrieval)
- ✅ Skill: full execution workflow
- ✅ API integration with DSG ONE spine
- ✅ Deterministic proof generation
- ✅ Audit trail capture

### Next

- 🔜 Copilot Marketplace listing
- 🔜 VS Code extension integration
- 🔜 GitHub Actions support (via skill)
- 🔜 Formal verification mode (Z3/SMT proving)

---

## Support

- **Issues**: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues
- **Documentation**: See `docs/` in this directory
- **Contact**: t.dealer01@dsg.pics

---

## License

Proprietary. DSG ONE / ProofGate. All rights reserved.
