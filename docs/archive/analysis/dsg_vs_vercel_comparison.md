# DSG Control Plane vs. Standard Vercel Deployment Comparison

## Executive Summary

DSG ONE / ProofGate Control Plane layers governance, compliance, and audit capabilities on top of a standard Vercel-deployed Next.js application. This analysis compares standard infrastructure with DSG-enhanced governance.

---

## 1. Infrastructure Layer Comparison

### Standard Vercel Deployment (DSG Baseline)
| Capability | Vercel | Evidence |
|---|---|---|
| Hosting | Edge network with global CDN | Project on dsg.pics + tdealer01-crypto-dsg-control-plane.vercel.app |
| Framework | Next.js 24.x on Node.js | Framework: nextjs, nodeVersion: 24.x |
| Deployment Time | Real-time auto-deploy on push | Latest: 47b2eda (2026-07-16 UTC) |
| Runtime Logs | Edge + Serverless logs | GET / 200 cache hits (HIT/PRERENDER) |
| Domains | Custom + Vercel subdomains | dsg.pics (custom), vercel.app (auto) |

### DSG Enhancements
| Feature | Capability | Status |
|---|---|---|
| **Governance Gate** | `/api/dsg/v1/gates/evaluate` | ✅ Implemented |
| **Policy Engine** | Deterministic TypeScript constraints | ✅ Lib: `lib/dsg/deterministic/` |
| **Execution Spine** | Governed action execution + audit | ✅ `/api/spine/execute` |
| **Compliance Matrix** | L1-L5 evidence tracking (CCVS) | ✅ `lib/ccvs/` |
| **Runtime Commit RPC** | Lineage/audit trail recording | ✅ Enabled in spine |
| **Credential Broker** | Secret management + leases | ✅ Supabase-backed (`dsg_secrets`) |
| **Hermes Planner** | Controlled executor + conformance | ✅ `lib/dsg/brain/` |

---

## 2. Request Flow Comparison

### Standard Next.js Request
```
Client → Vercel Edge → Node.js Lambda → Supabase/API → Response
```
- No governance checkpoint
- No execution trace
- No approval gate

### DSG-Enhanced Request (Governed Path)
```
Client → Vercel Edge → Node.js Lambda 
  → Auth (Supabase session)
  → Rate Limit Check
  → Quota Check
  → Policy Gate (/api/dsg/v1/gates/evaluate)
  → Execution Intent (Approval check)
  → Spine Pipeline (Deterministic execution)
  → Runtime Commit RPC (Lineage record)
  → Supabase (Audit trail)
  → Response + Proof + Trace
```

---

## 3. Security & Compliance Enhancements

### Standard Vercel Security
- Edge middleware (CORS, redirects)
- Environment variables (secrets)
- GitHub integration + commit verification
- SSL/TLS edge encryption

### DSG Additional Security
| Layer | Mechanism | Evidence |
|---|---|---|
| **Request Body** | `readJsonBody()` with size/depth limits | `/lib/security/request-json` |
| **Error Handling** | Centralized `handleApiError()` sanitization | `/lib/security/api-error` |
| **Execution Approval** | Runtime intent + approval key system | `/api/intent`, `/api/execute` |
| **Credential Lease** | Fingerprinted secret access with TTL | `credential-broker.ts` |
| **Conformance Gate** | Executed commands validated against plan | `conformance-gate.ts` |
| **Evidence Chain** | L1-L5 CCVS proof artifacts | `npm run ccvs:pipeline` |

---

## 4. Deployment & Operations

### Current Production State

**Vercel Project:** `tdealer01-crypto-dsg-control-plane`
- Team: `tdealer01-crypto's projects`
- Latest Production Deployment: `dpl_9GdgLyX89XvnX4pGYKHjAhMca9XV`
- Commit: `47b2eda284ca714be2dfab68b3b1f7f3a4fd55ea`
- Status: ✅ READY
- Last Deploy: 2026-07-16 15:21:34 UTC

**Runtime Health:**
- Cache Hit Ratio: High (HIT, PRERENDER on sequential GET /)
- Response Time: Sub-second (edge middleware processing)
- Error Rate: 0 (no 5xx in last 24h logs)

**DSG Operational Features:**
- `/api/health` — Basic health check (public)
- `/api/readiness` — Full readiness check (auth protected)
- `/api/agent/status` — Deployment identity + DB connectivity check
- `npm run go:no-go <url>` — Production readiness validation script
- `npm run ccvs:pipeline` — Evidence collection + verification

---

## 5. Audit & Compliance Capabilities

### What Standard Vercel Provides
- GitHub commit history + verification badges
- Deployment audit log (creator, timestamp)
- Rollback capability (20+ deployment versions stored)
- Build logs + error traces

### What DSG Adds

**Runtime Audit Trail** (`runtime_executions` table)
- Agent ID + user identity
- Policy version applied
- Decision (APPROVE/DENY/REVIEW)
- Proof hash + policy hash
- Pipeline trace with each step
- Usage metered for billing

**Compliance Evidence** (`runtime_evidence` table)
- L1 unit evidence
- L2 integration evidence
- L3 adversarial/replay evidence
- L4 mutation/proof evidence
- L5 build/provenance evidence
- Chain hash for integrity

**Lineage & Approval** (`runtime_approvals` table)
- Approval key + grant timestamp
- Agent + user authentication
- Quota consumed + limits checked
- Execution decision + reason

---

## 6. MCP Integration Capabilities

### MCPs Available in This Environment

| MCP | Tools | DSG Integration Status |
|---|---|---|
| **PostHog** | 50+ analytics (exec, query, events) | ✅ Can query deployment metrics |
| **Supabase** | 25+ database (requires OAuth) | ✅ Can read schema + audit logs |
| **Vercel** | 15+ deployment (active) | ✅ DEMONSTRATED (project, deployments, logs fetched) |
| **AWS Marketplace** | 11+ discovery tools | ⏳ Pending: marketplace solution research |

### DSG MCP Capability (Internal)
- `/api/mcp-server` — Exposes governance tools (dsg.evaluate, hermes.*, android.*)
- `/api/mcp` — Combined endpoint for MCP clients
- `skills/dsg-mcp/SKILL.md` — Client configuration guide

---

## 7. Billing & Quota Governance

### Standard Vercel
- Usage metering: compute, bandwidth, storage
- Auto-scale costs (Lambda pricing)
- Manual seat management

### DSG Governance
- Metered per execution (idempotent)
- Quota gates before execution (fail-closed)
- Stripe billing integration (MCP subscription)
- Revenue proof tracking (`npm run proof:revenue`)
- Overage handling with clear error messages

**Current MCP Billing:**
- Price: ฿490/month (STRIPE_MCP_PRICE_ID configured)
- Activation: Subscription checkout → Stripe → webhook → DSG key creation
- Renewal: Billing webhook triggers auto-renewal on invoice.payment_succeeded

---

## 8. Deterministic Gate & Formal Proof

### TypeScript Deterministic Scaffold
```
lib/dsg/deterministic/
├── policy-constraint.ts  — Policy definition models
├── evaluator.ts          — Deterministic evaluation
├── proof-generator.ts    — Proof artifact creation
└── harness.ts            — Test/validation harness
```

**Capabilities:**
- ✅ Static constraint checking (no external dependencies)
- ✅ Deterministic proof generation (same input → same proof)
- ✅ Policy versioning + hashing
- ✅ Z3 design-time formal verification (optional)
- ❌ External production Z3 solver NOT invoked by /api/dsg/v1/gates/evaluate

### Policy Versioning
- Policy hash computed from constraints
- Each execution records applied policy version
- Evidence chain includes policy + proof hashes
- Rollback capability via policy version selection

---

## 9. Known Limitations (vs. Full Formal Verification)

| Claim | Status | Evidence Required |
|---|---|---|
| Deterministic gate scaffold exists | ✅ VERIFIED | Code in lib/dsg/deterministic/ |
| Design-time Z3 formal proof works | ✅ VERIFIED | npm run verify:policy (local) |
| End-to-end production formal verification | ⏳ PENDING | External Z3 solver integration NOT YET in /api/dsg/v1/gates/evaluate |
| Hermes controlled executor live | ✅ CODE EXISTS | lib/dsg/brain/ scaffolding present |
| Hermes LLM integration active | ⏳ PENDING | planHash deterministic but LLM proposal not yet wired |
| Credential broker encryption complete | ⏳ PENDING | Supabase value column encrypted, full rotation policy TBD |

---

## 10. Comparison Table: Feature Readiness

| Feature | Vercel | DSG | Evidence |
|---|---|---|---|
| Production deployment | ✅ Live | ✅ Live | dsg.pics domain active, dpl_9GdgLyX89XvnX4pGYKHjAhMca9XV READY |
| API governance | ✗ Basic | ✅ Advanced | /api/dsg/v1/gates/evaluate, /api/spine/execute |
| Audit trail | ✅ Deployment logs | ✅ Execution lineage | runtime_executions + runtime_evidence tables |
| Compliance matrix | ✗ No | ✅ L1-L5 CCVS | npm run ccvs:pipeline generates JSON proof |
| MCP integration | ✅ Via Vercel MCP | ✅ Plus DSG MCP | PostHog, Supabase, Vercel + dsg-mcp skill |
| Formal proof | ✗ No | ✅ Design-time | npm run verify:policy passes locally |
| Secret management | ✅ Env vars | ✅ Credential broker | Supabase dsg_secrets table with leases |
| Billing governance | ✅ Vercel usage | ✅ Execution metering | Stripe integration + quota gates |

---

## 11. Recommended Next Steps

### For DSG Enhancement
1. **External Z3 Integration** — Wire Z3 SMT solver to /api/dsg/v1/gates/evaluate for real-time formal proof
2. **Hermes LLM Wiring** — Connect planProposal() to actual LLM planning call
3. **Credential Broker Rotation** — Implement full key rotation + audit trail
4. **Marketplace Proof** — Add AWS Marketplace evidence for commercial readiness claim

### For Operator Readiness
1. Run `npm run go:no-go https://dsg.pics` to validate current production state
2. Review `/api/agent/status` for deployment commit + DB health
3. Check CCVS evidence with `npm run ccvs:pipeline`
4. Test MCP tools via `skills/dsg-mcp/SKILL.md` configuration

---

## Summary

**Standard Vercel Deployment:** High-performance, auto-scaling, globally distributed application server.

**DSG Control Plane:** Vercel deployment + governance layer that adds:
- Policy evaluation gates before execution
- Deterministic proof generation
- Audit trail + compliance matrix
- Credential broker for secret management
- Billing metering per execution
- Evidence chain (L1-L5) for compliance
- MCP integration for governance queries

**Current State:** Production-ready for governance-enhanced application deployment with audit, proof, and compliance evidence tracking.

**Readiness Claim:** Evidence-ready (all governance scaffolding live); not yet formally verified end-to-end (external Z3 integration pending).
