# One-Pager: Dev Team (Eng Manager / CTO)
**Developer-Led Segment | Freemium Funnel | Bottom-Up Adoption**

---

## Hook
> "Your AI agent (Claude Code, OpenHands, Aider, Cursor) writes code, runs commands, calls APIs — *before you see it*. DSG ONE puts a deterministic gate in front of every action. `npm i @dsg-one/sdk` → governed execution in 10 lines."

---

## Pain (Daily Reality)
- Agent deletes production DB / pushes to wrong branch / calls paid API in loop
- No visibility into *what the agent decided to do* until after
- Rollback is manual, slow, often impossible
- "Who approved this?" = no answer

---

## Solution (SDK-First, Verified)
```typescript
// 1. Install
npm i @dsg-one/sdk

// 2. Initialize (one line with your key)
import { DsgOneClient } from "@dsg-one/sdk";
const dsg = new DsgOneClient({ apiKey: "dsg_live_..." });

// 3. Wrap every agent action
const result = await dsg.execute({
  agentId: "my-agent",
  action: "deploy",
  input: { env: "prod", service: "payments" },
  context: { userId: "dev_123", pr: "456" }
});

// 4. Gate decides BEFORE execution
if (result.decision === "ALLOW") {
  // safe to proceed
} else if (result.decision === "STABILIZE") {
  // needs human approval — show result.reason
} else {
  // BLOCKED — result.reason explains why
}

// 5. Every decision = audit record + proof hash
console.log(result.audit_id, result.proof.proof_hash);
```

---

## What the Gate Checks (Verified)
| Check | Code Location | What It Prevents |
|-------|---------------|------------------|
| Policy version | `lib/gateway/policy-engine.ts` | Wrong rule set |
| Replay protection (nonce/idempotency) | `lib/gateway/replay-protection.ts` | Duplicate execution |
| Quota enforcement | `lib/usage/quota.ts` | Runaway loops / cost overruns |
| Actor authorization | `lib/agent-auth.ts` | Unauthorized agent |
| Deterministic constraints (8 Z3 theorems: 5 core + 3 DeFi) | `tools/proofs/` | Invariant violations |

---

## Proof You Get Every Call
```typescript
// ExecuteResponse (always returned)
{
  decision: "ALLOW" | "STABILIZE" | "BLOCK",
  audit_id: "audit_abc123",           // Immutable record
  proof: { proof_hash: "sha256:..." }, // Tamper-evident
  pipeline_trace: [                   // Full decision path
    { plugin_id: "spine", decision: "ALLOW", reason: "...", latency_ms: 12 }
  ],
  usage: { used: 42, limit: 10000, remaining: 9958 },
  latency_ms: 31
}
```

---

## SDK Status (Verified)
| Component | Status |
|-----------|--------|
| `@dsg-one/sdk` package | **Built, type-checked, ready for `npm publish`** |
| TypeScript definitions | Full types for all requests/responses |
| Error handling | `DsgOneError` with typed codes (RATE_LIMITED, UNAUTHENTICATED, etc.) |
| Auth | Bearer `dsg_live_...` + SHA256 key hash |
| Edge-ready gate | `POST /api/dsg/v1/gates/evaluate` — stateless, no solver |

---

## Free Tier (Freemium)
| Limit | Value |
|-------|-------|
| **Executions/month** | 1,000 (full features) |
| **Gate latency** | <50ms p99 (edge) |
| **Agents** | 3 |
| **Audit retention** | 30 days |
| **Export** | JSON/CSV |

---

## Pricing (After Free)
| Plan | Monthly | Executions | Best For |
|------|---------|------------|----------|
| **Pro** | $99 | 10,000 | Small team, prod agents |
| **Business** | $299 | 100,000 | Multiple agents, team mgmt |
| **Enterprise** | $999 | Custom | SSO, SLA, dedicated |

---

## Setup Time
| Step | Time |
|------|------|
| `npm i @dsg-one/sdk` | 30 sec |
| Create agent (`dsg.createAgent()`) | 10 sec |
| First execute() call | 5 min |
| See Decision Explainer in dashboard | Instant |

**Total to first governed action: < 10 minutes**

---

## GitHub App (Coming with SDK)
- Install on repo → auto-gate PR deployments
- Checks run on every commit → see gate decision in PR
- `dsg_live_` key auto-provisioned per environment

---

## CTA
> `npm i @dsg-one/sdk` → create agent → wrap one action → see gate decision in dashboard → **you're governed**

---

## Truth Boundary
| ✅ Verified | ⏳ Pending |
|-------------|-----------|
| SDK builds, types work | **Ready to publish** (npm credentials required; no live npm registry entry yet) |
| Gate returns decision + proof | Metered billing wired into execution; Stripe meter env not yet configured |
| 2173 tests pass | GitHub App not yet live |
| Edge gate <50ms latency | PyPI package not built |

---

## Competitive
| Tool | Gap |
|------|-----|
| LangChain / AutoGPT | No governance, no audit |
| Cursor / Copilot | No preventive gate |
| OpenHands / Aider | Execute first, ask later |
| **DSG ONE SDK** | **One wrapper → governed execution + proof** |

---

## Next Step
**Watch for `@dsg-one/sdk` on npm** (publishing this week) → `npm i @dsg-one/sdk` → governed in 10 min.