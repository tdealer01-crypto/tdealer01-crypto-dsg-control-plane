# dsg-one-sdk

TypeScript client for the **DSG ONE** (Deterministic Security Gateway) governed execution API.

> **DSG ONE** sits between your AI agent and your systems — inspecting every action before execution, recording a tamper-evident audit trail, and blocking anything unauthorized. EU AI Act Art. 12/14 evidence pack included.

## Installation

```bash
npm install @dsg-one/sdk
# or
yarn add @dsg-one/sdk
# or
pnpm add @dsg-one/sdk
```

Requires Node.js 18+

## Quick Start

```typescript
import { DsgOneClient } from "@dsg-one/sdk";

// Initialize with your API key (format: dsg_live_...)
const client = new DsgOneClient({ 
  apiKey: process.env.DSG_API_KEY!  // "dsg_live_..."
});

// Create an agent
const agent = await client.createAgent({ 
  name: "My Trading Bot",
  monthlyLimit: 50000 
});
console.log("Agent created:", agent.agent_id, "Key:", agent.api_key);

// Execute a governed action
const result = await client.execute({
  agentId: agent.agent_id,
  action: "trade",
  input: { symbol: "ETH", amount: 1.5, side: "buy" },
  context: { userId: "user_123", sessionId: "sess_456" }
});

if (result.decision === "ALLOW") {
  console.log("✅ Action allowed:", result.audit_id);
} else {
  console.log("🚫 Blocked:", result.reason, "- Proof:", result.proof.proof_hash);
}

// Check quota
const quota = await client.getQuota();
console.log("Monthly usage:", quota);
```

## API Reference

### `new DsgOneClient(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | `string` | `"https://tdealer01-crypto-dsg-control-plane.vercel.app"` | DSG ONE API base URL |
| `apiKey` | `string` | `undefined` | Your `dsg_live_...` API key |
| `defaultHeaders` | `Record<string, string>` | `{}` | Headers to include in all requests |
| `timeout` | `number` | `30000` | Request timeout in milliseconds |

### `client.createAgent(options)`

Creates a new governed agent.

```typescript
const agent = await client.createAgent({
  name: "Risk Scanner",           // 2-80 characters
  monthlyLimit: 10000,            // Optional, default: 10000
  policyId: "policy_strict"       // Optional
});

// Returns:
{
  agent_id: "agent_abc123",
  name: "Risk Scanner",
  policy_id: "policy_strict",
  status: "active",
  monthly_limit: 10000,
  api_key: "dsg_live_xyz789...",  // ⚠️ Shown ONCE - store securely!
  api_key_preview: "dsg_live_xy..."
}
```

### `client.execute(input)`

Executes an action through the spine governance engine. Every execution is checked against policies and recorded in the WORM audit trail.

```typescript
const result = await client.execute({
  agentId: "agent_abc123",
  action: "transfer",
  input: { from: "wallet_a", to: "wallet_b", amount: 1000 },
  context: { userId: "user_123", sessionId: "sess_456" }
});

// Returns ExecuteResponse:
{
  ok: true,
  request_id: "req_...",
  audit_id: "audit_...",           // Tamper-evident audit record ID
  decision: "ALLOW" | "STABILIZE" | "BLOCK",
  decision_normalized: "ALLOW",
  reason: null | "...",
  latency_ms: 42,
  policy_version: "1.0",
  replayed: false,
  ledger_sequence: 12345,
  truth_sequence: 67890,
  usage: { used: 100, limit: 10000, remaining: 9900 },
  proof: {
    proof_hash: "sha256:...",
    proof_version: "1.0",
    theorem_set_id: "spine_v1",
    solver: "static_check"
  },
  authoritative_plugin_id: "spine",
  pipeline_trace: [
    { plugin_id: "spine", decision: "ALLOW", reason: "...", latency_ms: 12, proof_hash: "..." }
  ]
}
```

### `client.executeWithIntent(input)`

For approval-required actions. First call returns `STABILIZE` with an intent; second call with the same intent executes after approval.

### `client.getQuota()`

Returns usage information for all agents in the organization.

```typescript
const quotas = await client.getQuota();

/*
[
  {
    agent_id: "agent_abc123",
    billing_period: "2026-06",
    executions: 1234,
    limit: 10000,
    remaining: 8766,
    overage_rate_usd: 0.001,
    plan_key: "pro"
  }
]
*/
```

### Agent Management

```typescript
// List all agents
const agents = await client.listAgents({ page: 1, perPage: 20 });

// Get single agent
const agent = await client.getAgent("agent_abc123");

// Rotate API key (returns new key)
const { api_key, api_key_preview } = await client.rotateAgentKey("agent_abc123");

// Disable agent
await client.deleteAgent("agent_abc123");
```

## Decision Types

| Decision | Meaning |
|----------|---------|
| `ALLOW` | Action passed all policy checks — proceed |
| `STABILIZE` | Action needs human approval — re-call with same intent after approval |
| `BLOCK` | Action violates policy — do not proceed |

## Error Handling

```typescript
import { DsgOneError } from "dsg-one-sdk";

try {
  await client.execute({ ... });
} catch (err) {
  if (err instanceof DsgOneError) {
    switch (err.code) {
      case "RATE_LIMITED":
        // Too many requests - back off
        break;
      case "UNAUTHENTICATED":
        // Missing or invalid API key
        break;
      case "INVALID_CREDENTIALS":
        // Wrong agent_id or API key
        break;
      case "AGENT_INACTIVE":
        // Agent is disabled
        break;
      case "QUOTA_EXCEEDED":
        // Monthly limit reached
        break;
      default:
        // Other API errors
    }
    console.error(err.message, err.status, err.details);
  }
}
```

## Production URLs

| Environment | Base URL |
|-------------|----------|
| Production | `https://tdealer01-crypto-dsg-control-plane.vercel.app` |
| Staging (if configured) | Set `DSG_BASE_URL` env var |

## Authentication

The SDK uses **Bearer token** authentication. Your API key (`dsg_live_...`) must be included in the `Authorization` header:

```
Authorization: Bearer dsg_live_xxx...
```

The API key is returned **once** when creating an agent via `POST /api/agents`. Store it securely.

## TypeScript Support

Full TypeScript definitions included. The package exports types for all requests and responses.

## Links

- **Documentation**: https://tdealer01-crypto-dsg-control-plane.vercel.app
- **API Status**: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
- **Delivery Proof**: https://tdealer01-crypto-dsg-control-plane.vercel.app/delivery-proof
- **Compliance Evidence**: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/compliance-evidence-pack/annex4
- **Repository**: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
- **Issues**: https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues

## License

MIT © DSG ONE Team