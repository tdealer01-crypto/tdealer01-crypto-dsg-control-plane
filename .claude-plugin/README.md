# DSG Governance Control Plane — Claude Code Plugin

Production AI governance control plane for Claude Code. Makes every Agent decision provable, auditable, and replayable.

## 🚀 Installation

### Claude Code CLI
```bash
claude plugin add https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane
```

### Claude.ai
Marketplace listing coming soon. For now, add the marketplace directly via the Claude Code CLI command above.

## 📋 Features

### 1. Deterministic Safety Gate (`dsg-action-layer-ged`)
- Policy evaluation with deterministic outcomes (PASS/BLOCK/REVIEW/UNSUPPORTED)
- Z3/SMT-style formal verification
- Quota enforcement and pricing per evaluation
- Cryptographic proof generation

### 2. Replayable Governance
- Deterministic replay of decisions
- Hash-based evidence tracking (proofHash, policyVersion, inputHash, constraintSetHash)
- Compliance regulation mapping
- SOC2/ISO27001/NIST/EU AI Act claim support

### 3. Compliance Evidence Pack
- L1–L5 evidence levels (unit to provenance)
- CCVS pipeline integration
- Audit trail capture
- Governance decision evidence

### 4. Runtime Lifecycle Management
- Before/During/After action governance
- Risk level → governance posture mapping
- Quota enforcement
- Execution approval workflow

### 5. Hermes Controlled Executor
- Zero Trust execution flow
- planHash lock verification
- Conformance gate validation
- Credential lease with fingerprint (no raw secrets)
- Evidence capture for every execution

## 💡 Quick Start

### Step 1: Authenticate
Install the plugin and authenticate with your DSG Control Plane deployment:
```
GET /api/agent/status
```

### Step 2: Evaluate a Policy
Use the primary skill to evaluate a governance decision:
```
POST /api/dsg/v1/gates/evaluate
```

Request body:
```json
{
  "agent_id": "your-agent-id",
  "action": "execute_payment_transfer",
  "context": {
    "amount": 1000,
    "recipient": "verified_address",
    "riskLevel": "medium"
  }
}
```

Response:
```json
{
  "decision": "PASS",
  "proofHash": "sha256:...",
  "policyVersion": "1.0.0",
  "inputHash": "sha256:...",
  "constraintSetHash": "sha256:...",
  "evidence": { ... }
}
```

### Step 3: Replay a Decision
Verify an earlier decision was deterministic:
```
POST /api/dsg/v1/proofs/prove
```

Request:
```json
{
  "proofHash": "sha256:...",
  "policyVersion": "1.0.0",
  "inputHash": "sha256:...",
  "constraintSetHash": "sha256:..."
}
```

### Step 4: Get Compliance Evidence
Export audit-ready evidence:
```
GET /api/dsg/v1/policies/manifest
```

## 📊 Pricing

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0/month | 50 gate evaluations/month |
| **Pro** | $99/month | 5,000 gate evaluations/month + compliance bundle |
| **Enterprise** | $499/month | Unlimited evals + SLA + Hermes executor |

## 🔗 API Reference

### Core Endpoints

**GET /api/dsg/v1/policies/manifest**
- Returns current policy manifest and constraint set
- Public endpoint, no auth required

**POST /api/dsg/v1/gates/evaluate**
- Evaluate an action against current policy
- Requires Bearer token (agent API key)
- Returns decision with proof

**POST /api/dsg/v1/proofs/prove**
- Verify replay of a previous decision
- Requires Bearer token
- Returns proof validation result

**POST /api/dsg/v1/governance/escalate**
- Escalate a decision for manual review
- Requires Bearer token
- Returns escalation ticket ID

**GET /api/health**
- Service health check
- Public endpoint

**GET /api/agent/status**
- Agent deployment status
- Includes DB connectivity check
- Public endpoint

## 📚 Documentation

- **[Skills Directory](./skills/)** — Detailed skill documentation
- **[Plugin Manifest](./plugin.json)** — Schema v1 configuration
- **[Marketplace Catalog](./marketplace.json)** — Auto-routing configuration
- **[Production Deployment](../docs/RUNBOOK_DEPLOY.md)** — Deployment checklist

## 🛠 Skills Included

### `dsg-action-layer-ged`
Primary governance action layer. Covers the full flow: plan → gate → approve → execute → commit → replay

**Files:**
- `gate-evaluate.md` — Gate evaluation specification
- `replay-governance.md` — Replay field requirements
- `compliance-evidence.md` — Evidence levels and claims
- `runtime-governance.md` — Lifecycle and quota
- `hermes-executor.md` — Zero Trust executor flow

### `dsg-github-marketplace-action-controller`
Package DSG gates as GitHub Marketplace Actions with deterministic GO/NO-GO validation

**Files:**
- `action-yml-spec.md` — action.yml DSG conventions
- `go-no-go-logic.md` — Deterministic decision tree

### `dsg-multi-governance-orchestrator`
Multi-source governance for M1/M2 milestones and enterprise cutover

**Files:**
- `m1-m2-checklist.md` — Production cutover gate
- `architecture-template.md` — DSG ONE 5-layer diagram

## ⚙️ Configuration

Set these environment variables on your DSG Control Plane deployment:

```bash
# Required
NEXT_PUBLIC_DSG_CONTROL_PLANE_URL=https://your-deployment.vercel.app
NEXT_PUBLIC_API_KEY_BASE_URL=https://your-deployment.vercel.app/api

# Optional
STRIPE_API_KEY=sk_live_...
SUPABASE_SERVICE_ROLE_KEY=... # Server-side only

# Quota defaults
FREE_TIER_MONTHLY_EVALUATIONS=50
PRO_TIER_MONTHLY_EVALUATIONS=5000
```

## 🔐 Security

- All API calls require Bearer token (agent API key)
- Sensitive values never logged or traced
- Policy evaluation is deterministic and replay-verifiable
- Compliance evidence is tamper-evident (hash-based)

## 📧 Support

- **GitHub Issues:** https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/issues
- **Email:** t.dealer01@dsg.pics
- **Docs:** https://tdealer01-crypto-dsg-control-plane.vercel.app/docs

## 📄 License

MIT — See LICENSE file in repository

---

**Version:** 1.0.0  
**Last Updated:** 2026-07-01  
**Status:** Production-Connected
