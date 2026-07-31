# DSG ONE Architecture Page Template

## Header

```
Product: DSG ONE / ProofGate Control Plane
Version: <current version from GET /api/agent/status>
Date: <ISO 8601>
Claim posture: evidence-ready | pre-audit | production-connected
```

---

## 1. Product identity

**What it is:** AI Governance Control Plane — not an AI Agent, but the layer that
governs what AI Agents are *allowed* to do.

**Value proposition:**
> "Every Agent decision provable, auditable, and replayable with Deterministic Gate,
> Cryptographic Proof, Compliance Evidence Pack, and Hermes Controlled Executor."

**Market position:**
- Cloudflare → Control Plane of the Internet
- Datadog → Control Plane of Observability
- **DSG → Control Plane of AI Governance**

---

## 2. Architecture layers

```
┌─────────────────────────────────────────────────────────────┐
│                    USER / AGENT REQUEST                     │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              DETERMINISTIC SAFETY GATE (L1)                 │
│  Input → Policy → Proof → Decision (PASS / BLOCK / REVIEW)  │
│  proofHash + constraintSetHash + policyVersion stored        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓ (if PASS or approved REVIEW)
┌─────────────────────────────────────────────────────────────┐
│              RUNTIME SPINE (L2)                             │
│  Quota check → Approval workflow → Isolation context        │
│  Before / During / After lifecycle governance               │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              HERMES CONTROLLED EXECUTOR (L3)                │
│  planHash → Conformance check → Credential lease            │
│  Command whitelist → Path isolation → Evidence capture      │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              EVIDENCE STORE (Supabase)                      │
│  proofHash, inputHash, policyVersion, pipeline_trace        │
│  runtime_intent_id, ledger_sequence, approval record        │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              REPLAY ENGINE                                  │
│  proofHash + policyVersion + inputHash → same decision      │
│  Answers: "Why did AI decide X six months ago?"             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Trust boundaries

| What agents CAN do | What agents CANNOT do without gate |
|---|---|
| Read-only queries (low risk) | Write production data |
| Public endpoint calls | Access credentials |
| Cached/deterministic operations | Execute multi-step plans |
| Return plans for human review | Bypass conformance check |

---

## 4. Evidence flow

```
Gate call
  → proofHash stored
  → policyVersion pinned
  → inputHash recorded

Execution
  → planHash matched
  → commands whitelisted
  → paths enforced
  → evidence captured

Commit
  → runtime_evidence written to Supabase
  → ledger_sequence incremented
  → audit trail complete

Replay (any future date)
  → proofHash + policyVersion + inputHash → reproduce original decision
  → comparison result: MATCH | MISMATCH | DEGRADED
```

---

## 5. Pricing surface

| Tier | Evals/month | Price | Features |
|---|---|---|---|
| Free | 50 | $0 | Gate evaluate + proof |
| Pro | 5 000 | $99/month | + Compliance bundle access |
| Enterprise | Unlimited | $499/month | + SLA + Hermes executor |

Upgrade: `/pricing#dsg-gate`

---

## 6. Open gaps (production hardening)

From current evidence:

| Gap | Status |
|---|---|
| UNSUPPORTED decision handling | In progress |
| Policy version consistency across replicas | In progress |
| Credential rotation in Hermes broker | Scaffolded, not live |
| End-to-end replay test | Scaffolded, not validated |
| Integration coverage | Partial |

These are production hardening items — core architecture is complete.
