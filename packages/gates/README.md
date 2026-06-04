# @dsg-platform/gates

**Deterministic policy gates for AI agents and workflows.**

Control execution before actions happen. Evaluate policies, enforce constraints, and maintain audit trails with verifiable proofs.

## Features

- 🎯 **Deterministic Evaluation** — No randomness, fully reproducible gate decisions with cryptographic proofs
- 🛡️ **Policy-Driven** — Define constraints (role checks, amount limits, time windows, path patterns)
- 📊 **Risk Scoring** — Automatic risk assessment (low/medium/high/critical)
- ✅ **Approval Workflows** — Route decisions to human approval when needed
- 🔍 **Audit Ready** — Every decision includes proof hash, request hash, and lineage
- 📦 **Framework Agnostic** — Works with Next.js, Express, Vercel Edge Functions, and more
- ⚡ **Zero External Dependencies** — Minimal footprint, ships with types

## Installation

```bash
npm install @dsg-platform/gates
```

## Quick Start

### Local Policy Evaluation

```typescript
import { DSGGatesClient, GatePolicyConfig } from '@dsg-platform/gates';

// Define a policy
const policy: GatePolicyConfig = {
  id: 'code-review-gate',
  version: '1.0.0',
  name: 'Code Review Gate',
  description: 'Require approval for production deployments',
  constraints: [
    {
      id: 'require-approval',
      type: 'custom_predicate',
      operator: 'custom',
      description: 'Deployment must be approved',
      riskLevel: 'high',
      isBlocker: true
    }
  ],
  defaultDecision: 'REVIEW',
  requireApproval: true,
  actionPatterns: ['deploy.*', 'merge.*'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Create client
const client = new DSGGatesClient();

// Evaluate gate
const response = await client.evaluateGate({
  executionId: 'exec-123',
  agentId: 'claude-code',
  orgId: 'my-org',
  action: 'deploy to production',
  input: { environment: 'production' }
}, policy);

console.log(response.decision); // 'REVIEW'
console.log(response.reason);   // 'Approval required by policy'
```

### Remote API Evaluation

```typescript
const client = new DSGGatesClient({
  apiKey: process.env.DSG_API_KEY,
  orgId: process.env.DSG_ORG_ID,
  baseUrl: 'https://dsg-platform.com'
});

const response = await client.evaluateGate({
  executionId: 'exec-456',
  agentId: 'agent-123',
  orgId: 'org-789',
  action: 'transfer funds',
  input: { amount: 10000 }
});
```

### Next.js Middleware

```typescript
// middleware.ts
import { createGateMiddleware } from '@dsg-platform/gates/examples';
import type { NextRequest } from 'next/server';

const gateMiddleware = createGateMiddleware({
  apiKey: process.env.DSG_API_KEY!,
  orgId: process.env.DSG_ORG_ID!,
  protectedPaths: ['/api/admin/*', '/api/deploy/*']
});

export function middleware(request: NextRequest) {
  return gateMiddleware(request);
}

export const config = {
  matcher: ['/api/:path*']
};
```

## Policy Schema

### GatePolicyConfig

```typescript
interface GatePolicyConfig {
  id: string;                          // Unique policy ID
  version: string;                     // Semver version
  name: string;
  description: string;
  constraints: PolicyConstraint[];     // List of rules to evaluate
  defaultDecision: GateDecision;        // ALLOW | BLOCK | REVIEW | UNSUPPORTED
  requireApproval: boolean;             // Require human approval for ALLOW
  approvalTimeoutMinutes?: number;      // How long before approval expires
  autoApproveRoles?: string[];          // Roles that can auto-approve
  actionPatterns: string[];             // Regex patterns of actions this applies to
  createdAt: string;
  updatedAt: string;
}
```

### PolicyConstraint

```typescript
interface PolicyConstraint {
  id: string;
  type: 'role_check' | 'amount_limit' | 'time_window' | 'path_pattern' | 'custom_predicate';
  operator: 'eq' | 'lt' | 'gt' | 'lte' | 'gte' | 'contains' | 'matches' | 'in' | 'custom';
  value?: unknown;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  isBlocker: boolean;                  // Block execution if not satisfied
}
```

## Gate Decisions

| Decision | Meaning | Action |
|----------|---------|--------|
| `ALLOW` | Constraint satisfied, action allowed | Execute immediately |
| `BLOCK` | Blocking constraint failed | Reject execution |
| `REVIEW` | Requires human approval | Route to approval queue |
| `UNSUPPORTED` | Constraint type not recognized at runtime | Safe-fail to REVIEW or BLOCK |

## Constraint Types

### Role Check
Verify user has required role

```typescript
{
  id: 'require-admin',
  type: 'role_check',
  operator: 'in',
  value: ['admin', 'maintainer'],
  description: 'Only admins can approve',
  riskLevel: 'high',
  isBlocker: true
}
```

### Amount Limit
Enforce maximum transaction amount

```typescript
{
  id: 'max-transfer',
  type: 'amount_limit',
  operator: 'lte',
  value: 100000,
  description: 'Daily transfer limit: $100k',
  riskLevel: 'high',
  isBlocker: true
}
```

### Time Window
Allow actions only during certain hours

```typescript
{
  id: 'business-hours',
  type: 'time_window',
  value: { startHour: 9, endHour: 17 },
  description: 'Only during business hours',
  riskLevel: 'medium',
  isBlocker: false
}
```

### Path Pattern
Match file/path patterns

```typescript
{
  id: 'protected-paths',
  type: 'path_pattern',
  value: '(lib|src)/\\.(ts|tsx)$',
  description: 'Core library files require review',
  riskLevel: 'high',
  isBlocker: true
}
```

## Response Format

```typescript
interface GateResponse {
  decision: GateDecision;              // ALLOW | BLOCK | REVIEW | UNSUPPORTED
  reason: string;                      // Why this decision was made
  riskScore: number;                   // 0-100 risk assessment
  riskLevel: RiskLevel;                // low | medium | high | critical
  executionId: string;                 // Unique ID for tracking
  policyVersion: string;               // Policy version used
  policyHash: string;                  // SHA-256 hash of policy
  proof: {
    timestamp: string;
    requestHash: string;               // SHA-256 of request
    decisionHash: string;              // SHA-256 of decision
    lineage?: string[];                // Audit trail hashes
  };
  approvalsRequired?: number;          // If REVIEW: how many approvals needed
  approvalDeadline?: string;           // When approval must happen by
  suggestedAction?: string;            // Recommended next step
}
```

## Validation

```typescript
import { validatePolicy } from '@dsg-platform/gates';

const policy = { /* ... */ };
const { valid, errors } = client.validatePolicy(policy);

if (!valid) {
  console.error('Policy errors:', errors);
}
```

## Reproducibility

Each policy has a deterministic hash for verification:

```typescript
import { policyHash } from '@dsg-platform/gates';

const hash = policyHash(policy);
console.log(hash); // SHA-256 hex string

// Same policy = same hash
// Different policy = different hash
```

## Environment Variables

```bash
# For remote API evaluation
DSG_API_KEY=sk_live_...
DSG_ORG_ID=org_123
DSG_AGENT_ID=my-agent

# Optional
DSG_BASE_URL=https://api.dsg-platform.com
```

## Pricing

| Tier | Gates/Month | Price | Features |
|------|-------------|-------|----------|
| Freemium | 10 | Free | Local policy evaluation |
| Pro | Unlimited | $99/mo | Remote API, approval workflows, audit logs |
| Enterprise | Custom | Custom | White-label, dedicated support, SLA |

## Examples

- [Next.js middleware](#nextjs-middleware)
- [GitHub Actions integration](./examples/github-action.yml)
- [Vercel Edge Functions](./examples/vercel-edge-middleware.ts)
- [MCP server tool](./examples/mcp-policy-server.ts)

## API Reference

### DSGGatesClient

#### Constructor

```typescript
new DSGGatesClient({
  baseUrl?: string;           // Default: https://dsg-platform.com
  apiKey?: string;            // For remote evaluation
  orgId?: string;
  agentId?: string;
  defaultPolicy?: GatePolicyConfig;
  timeout?: number;           // Default: 5000ms
  validatePolicies?: boolean; // Default: true
})
```

#### Methods

- `evaluateGate(request, policy?)` → Promise<GateResponse>
- `validatePolicy(policy)` → { valid: boolean; errors: string[] }
- `getPolicyHash(policy)` → string
- `setDefaultPolicy(policy)` → void
- `getConfig()` → DSGGatesClientConfig

## License

MIT

## Support

- **Docs:** https://dsg-platform.com/docs/gates
- **Issues:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues
- **Email:** support@dsg-platform.com
