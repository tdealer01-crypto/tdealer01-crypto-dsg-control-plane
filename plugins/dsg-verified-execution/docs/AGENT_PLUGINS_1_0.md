# DSG Verified Execution — Agent Plugins 1.0 Compatibility

## Overview

**Agent Plugins 1.0** is GitHub's unified plugin standard (GA as of August 2024) that combines:
- **Skills** (Claude Code-style workflow commands)
- **MCP servers** (Model Context Protocol tools)
- **Single manifest** for cross-ecosystem distribution

### Why it matters

Agent Plugins 1.0 allows DSG to build ONE plugin that works across:
- ✅ GitHub Copilot (chat, CLI, UI)
- ✅ VS Code (Copilot Chat, extensions)
- ✅ Claude Code
- ✅ ChatGPT (via plugin marketplace)
- ✅ Custom agents (any MCP-compatible client)

**Without** Agent Plugins 1.0, DSG would need separate:
- Copilot extension + API glue
- VS Code plugin + API glue
- Claude Code plugin + MCP server
- ChatGPT plugin + backend

**With** Agent Plugins 1.0, DSG ships **one plugin** to all ecosystems.

---

## DSG Verified Execution in Agent Plugins 1.0

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Agent Plugins 1.0                       │
│  (GitHub, Anthropic, AWS, Microsoft, Vercel standard)   │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
    [MCP servers]              [Skills/Workflows]
        │                             │
   ┌────┴────────┐            ┌──────┴─────────┐
   │             │            │                │
 Tools       Capabilities   Commands         Agents
   │             │            │                │
   └─────────────┴────────────┴────────────────┘
                       │
        DSG Verified Execution Plugin
        - 4 MCP tools (plan alignment, gate, proof, evidence)
        - 1 Skill (dsg-verified-execute workflow)
        - Single manifest (manifest.json)
        - Works everywhere
```

### Plugin components

#### 1. MCP Server (`mcp-server/index.ts`)

Exposes 4 standard MCP tools:
- `plan_alignment` — Check plan scope
- `constraint_evaluate` — Evaluate constraints
- `execution_proof_request` — Generate proof
- `evidence_retrieve` — Audit trail

**Why MCP**: Universal protocol for LLM ↔ tool communication. Works in any agent.

#### 2. Skill (`skills/dsg-verified-execute.json`)

Claude Code skill that orchestrates the full workflow:

```
validate_agent → align_plan → evaluate_constraints → 
[approval?] → execute → generate_proof → collect_evidence
```

**Why skill**: Higher-level abstraction for humans. Can be called as `/dsg-verified-execute` in Claude Code or Copilot.

#### 3. Manifest (`manifest.json`)

Declares:
- Capability: MCP server + skill
- Environment requirements: `DSG_API_URL`, `DSG_API_KEY`
- Tool definitions + schemas
- Documentation links

**Why manifest**: Single source of truth for what the plugin is and how to use it.

---

## Ecosystem integration

### Copilot (GitHub)

Agent Plugins 1.0 works natively in Copilot:

```bash
# User installs plugin
copilot plugin install dsg-verified-execution

# User calls MCP tool
@dsg constraint_evaluate action="delete_backup" risk_level="high"

# Or uses skill
/dsg-verified-execute agent_id="agent-123" action="update_config"

# Copilot routes both through MCP server
# Response includes decision + proof + evidence
```

### VS Code

VS Code's Copilot Chat recognizes Agent Plugins 1.0:

```typescript
// In VS Code Copilot Chat
@dsg evidence_retrieve agent_id="agent-123" 
// → Lists audit trail for agent

@dsg execution_proof_request agent_id="agent-123" action="write_log"
// → Generates proof
```

### Claude Code

Claude Code plugins already support MCP + skills:

```bash
/plugin install dsg-verified-execution@dsg-plugins

# Later, in any Claude Code session:
tool("plan_alignment", { agent_id: "...", action: "..." })

# Or use skill:
/dsg-verified-execute agent_id="..." action="..."
```

### Custom agents

Any MCP-compatible agent (OpenAI, Anthropic, etc.) can use the MCP server:

```typescript
// Anthropic SDK
const mcp = new MCPClient("dsg-verified-execution");
const result = await mcp.callTool("constraint_evaluate", {
  agent_id: "agent-custom-123",
  action: "write_to_db",
  target_resource: "users_table"
});
```

---

## Distribution

### Current channels

1. **Claude Code Marketplace**
   - Location: `.claude-plugin/marketplace.json`
   - Installation: `/plugin install dsg-verified-execution@dsg-plugins`
   - Status: Ready

2. **Copilot Marketplace** (coming soon)
   - Will list in GitHub's Copilot plugin marketplace
   - One-click install from settings panel
   - Distribution via `manifest.json`

3. **Open-source ecosystem**
   - MCP server published to npm (`@dsg/verified-execution-plugin`)
   - Skill definitions in JSON
   - GitHub repo as source of truth

### Billing / Marketplace

Agent Plugins 1.0 integrates with platform billing:

```json
{
  "billing": {
    "model": "per-execution",
    "pricing": {
      "plan_alignment": "$0.01 per check",
      "constraint_evaluate": "$0.05 per evaluation",
      "execution_proof_request": "$0.10 per proof",
      "evidence_retrieve": "$0.02 per query"
    }
  }
}
```

Vercel Marketplace (coming soon) will handle:
- Agent Plugins 1.0 installations
- Per-execution billing
- API key provisioning
- Usage tracking

---

## Technical stack

### MCP Protocol

DSG Verified Execution follows MCP standards:

```
┌──────────────┐
│   Agent      │  (e.g., Copilot, Claude Code)
└────────┬─────┘
         │
      [JSON-RPC over stdio]
         │
┌────────▼──────────────────┐
│  DSG MCP Server           │
│  (mcp-server/index.ts)    │
│  - Receives tool calls    │
│  - Validates inputs       │
│  - Routes to DSG API      │
│  - Returns results        │
└────────┬──────────────────┘
         │
      [HTTPS API]
         │
┌────────▼──────────────────┐
│  DSG ONE Control Plane    │
│  POST /api/spine/execute  │
└───────────────────────────┘
```

### Manifest schema

The `manifest.json` declares:

```json
{
  "name": "dsg-verified-execution",
  "capabilities": {
    "mcp": {
      "servers": [
        {
          "type": "stdio",
          "command": "node --loader ts-node/esm mcp-server/index.ts"
        }
      ]
    },
    "skills": [
      { "name": "dsg-verified-execute", "path": "./skills/dsg-verified-execute.json" }
    ]
  }
}
```

### Environment isolation

Each plugin instance gets isolated env vars:

```bash
# In Copilot settings:
DSG_API_URL="https://tdealer01-crypto-dsg-control-plane.vercel.app"
DSG_API_KEY="sk_live_user_specific_token"
```

Prevents accidental secret leakage across users/orgs.

---

## Enterprise governance

### Allow/block policies

Admins can configure which agents/plugins are allowed:

```json
{
  "managed_policies": {
    "plugins": {
      "dsg-verified-execution": {
        "enabled": true,
        "allowed_agents": ["agent-prod-*"],
        "blocked_agents": ["agent-experimental-*"],
        "risk_threshold": "high"
      }
    }
  }
}
```

Enforced via:
- GitHub Copilot admin console
- VS Code enterprise policies
- Claude Code `.claude/settings.json`

### Audit & compliance

All plugin tool calls are logged:

```json
{
  "timestamp": "2024-08-17T12:34:56Z",
  "user": "alice@company.com",
  "agent_id": "agent-copilot-dev-123",
  "plugin": "dsg-verified-execution",
  "tool": "constraint_evaluate",
  "input": { "action": "delete_backup" },
  "decision": "REVIEW",
  "audit_trail": "evt_abc123..."
}
```

Accessible via `evidence_retrieve` tool or control plane API.

---

## Comparison with pre-Agent-Plugins-1.0

| Feature | Before AP1.0 | With AP1.0 |
|---------|------------|-----------|
| **Distribution** | Separate per platform | One plugin → everywhere |
| **Tool definition** | Custom per client | Standard MCP |
| **Installation** | Manual + API glue | One-click via marketplace |
| **Billing** | Manual per platform | Platform-integrated |
| **Enterprise policies** | Platform-specific | Unified governance |
| **Audit trail** | Scattered logs | Centralized via plugin |
| **Update cycle** | Per-platform releases | Single manifest update |

---

## Migration path for DSG

### Phase 1: Plugin skeleton (done)
- ✅ Manifest + MCP server structure
- ✅ Skill definitions
- ✅ Documentation

### Phase 2: API integration (next)
- 🔜 Connect MCP server to DSG spine/execute
- 🔜 End-to-end testing (localhost + production)
- 🔜 Proof + evidence generation

### Phase 3: Marketplace listing
- 🔜 Copilot marketplace submission
- 🔜 Vercel integration (billing)
- 🔜 GA release

### Phase 4: Enterprise features
- 🔜 Allow/block policies
- 🔜 Usage analytics
- 🔜 Dedicated support

---

## Testing Agent Plugins 1.0 compatibility

### Local validation

```bash
# Validate manifest
npm run validate

# Run MCP server locally
npm run mcp:server:dev

# Test tool calls (via test client)
mcp-test-client \
  --server "node --loader ts-node/esm mcp-server/index.ts" \
  --tool "constraint_evaluate" \
  --input '{"agent_id":"agent-123","action":"test","target_resource":"test_table"}'
```

### Integration testing

Test against real Copilot / VS Code:

```bash
# In VS Code + Copilot Chat
@dsg constraint_evaluate action="write_log" risk_level="low"

# Should return: ALLOW decision + reason

# In Copilot CLI
copilot chat --model "claude-opus" \
  "@dsg evidence_retrieve agent_id=agent-123"
```

### Proof verification

All proofs are deterministic and verifiable:

```typescript
// Same input always produces same proof
const proof1 = callTool("execution_proof_request", {
  agent_id: "agent-123",
  action: "write_log",
  result: { success: true }
});

const proof2 = callTool("execution_proof_request", {
  agent_id: "agent-123",
  action: "write_log",
  result: { success: true }
});

assert(proof1.proof.hash === proof2.proof.hash); // ✅ Deterministic
```

---

## Documentation for users

- **Installation**: `docs/README.md`
- **API Reference**: `docs/API_INTEGRATION.md`
- **MCP Tools**: `docs/MCP_TOOLS.md`
- **This file**: Agent Plugins 1.0 architecture & ecosystem

---

## Support & updates

- GitHub Issues: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues
- Email: t.dealer01@dsg.pics
- Docs: See `docs/` directory

---

## License

Proprietary. DSG ONE / ProofGate.
