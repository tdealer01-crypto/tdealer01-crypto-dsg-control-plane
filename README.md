# DSG ONE — ProofGate Control Plane

> **Block before the AI agent acts — not after the damage is done.**

DSG ONE is a runtime governance layer for AI agents. Connect it in one line, gate every action before execution, and keep a cryptographic audit trail for regulated AI-agent operations.

**Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## Z3 Formal Verification — Gateway Policy Engine

The gateway policy engine (`lib/gateway/policy.ts`) is formally verified using the **Z3 SMT Solver**. All proofs run at design time; the TypeScript runtime consumes `verified-constraints.json` — no Z3 dependency at runtime.

### Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Design Time (Python + Z3 SMT Solver)                   │
│                                                         │
│  policy_model.py  ──►  theorems.py        (5 theorems)  │
│                   ──►  defi_constraints.py (3 theorems)  │
│                   ──►  generate_spec.py                  │
│                              │                          │
│                              ▼                          │
│                 verified-constraints.json               │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│  Runtime (TypeScript / Next.js)                         │
│                                                         │
│  defi-validator.ts   ──►  defi-executor.ts              │
│  (proven bounds)          (DeFi pre-check before        │
│                            policy evaluation)           │
└─────────────────────────────────────────────────────────┘
```

### Method: SAT refutation

For each theorem, Z3 is asked to find a counterexample (`Not(claim)`). If no counterexample exists (`UNSAT`), the claim holds for **every possible input** — not just the ones covered by unit tests.

### 8 theorems proved

**Policy engine**

| # | Theorem | Claim |
|---|---------|-------|
| 1 | `role_safety` | `allow → role ∈ {owner, admin, finance_admin, finance_approver, agent_operator}` |
| 2 | `plan_safety` | `allow → plan ∈ {enterprise, business, pro}` |
| 3 | `approval_safety` | `allow ∧ approvalRequired → approvalToken ≠ ∅` |
| 4 | `audit_completeness` | decision always one of `{allow, block, review, ask_more_info}` |
| 5 | `non_triviality` | ∃ valid request where `decision = allow` |

**DeFi transaction constraints**

| # | Theorem | Claim |
|---|---------|-------|
| 6 | `amount_bound` | `amount ≤ $1,000` and `dailySpent + amount ≤ $10,000` |
| 7 | `slippage_bound` | `slippage ≤ 50 bps (0.5%)` |
| 8 | `constraint_consistency` | DeFi constraint set is satisfiable |

### Key safety property

DeFi bounds (Theorems 6–7) run **before** policy evaluation. Even an `owner` with a valid `approvalToken` cannot execute a transaction that violates the math bounds.

### Run the proofs

```bash
npm run verify:policy
# ✓ PROVED  [role_safety]
# ✓ PROVED  [plan_safety]
# ✓ PROVED  [approval_safety]
# ✓ PROVED  [audit_completeness]
# ✓ PROVED  [non_triviality]
# ✓ PROVED  [amount_bound]
# ✓ PROVED  [slippage_bound]
# ✓ PROVED  [constraint_consistency]
# Wrote: lib/gateway/verified-constraints.json
```

---

## Production announcement — 2026-05-20

DSG ONE ProofGate Control Plane is deployed on Vercel production and the runtime readiness endpoint is green.

| Checkpoint | Status | Evidence |
|---|---:|---|
| Production deployment | ✅ READY | Vercel production deployment reached `READY`. |
| Finance governance readiness | ✅ PASS | `GET /api/finance-governance/readiness` returned HTTP `200` and `ok: true`. |
| DSG deploy gate | ✅ GO | Strict preset, readiness 200, protected 401, failure reason none. |
| Z3 formal verification | ✅ 8 theorems proved | Gateway policy + DeFi bounds verified at design time. |

---

## What it does

Other tools tell you what your agent did *after* the fact. DSG ONE intercepts the action *before* it executes — issuing an `ALLOW` stamp or a `BLOCK` with agent guidance.

```text
Agent wants to act
  → POST /api/try/gate  { session_id, action }
  → ALLOW + cryptographic stamp   (agent proceeds)
  → BLOCK + suggested_llm_prompt  (agent self-corrects)
```

---

## REST API — no SDK required

### Gate an action

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/try/gate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "my-agent-run-001", "action": "send email to user@example.com"}'
```

Example `ALLOW` response:

```json
{
  "decision": "ALLOW",
  "stamp": "DSG-X9K3M7P2",
  "action": "send email to user@example.com"
}
```

---

## Tech stack

```text
Next.js 15 App Router + TypeScript
Supabase auth + Postgres
Stripe billing
Vitest unit/integration + Playwright E2E
GitHub Actions production gates
DSG Secure Deploy Gate
Z3 SMT Solver (design-time formal verification)
```

---

## Verification commands

```bash
npm run typecheck          # TypeScript
npm test                   # Vitest unit + integration
npm run test:coverage      # Coverage report
npm run verify:policy      # Z3 formal proofs (requires Python + z3-solver)
npm run test:e2e           # Playwright E2E
```

---

## Supported claims

```text
✓ REST API gate endpoint is live.
✓ Finance-governance readiness is green.
✓ DSG Secure Deploy Gate returned GO with strict preset evidence.
✓ Gateway policy engine is formally verified with Z3 (8 theorems, design-time).
✓ DeFi transaction bounds are mathematically proven.
✓ Proof files and verified-constraints.json are committed and reproducible.
✓ API key management uses scoped, revocable keys with server-side hashing.
```

Not claimed:

```text
✗ Independent third-party audit or certification.
✗ WORM-certified audit storage.
✗ End-to-end independently certified Z3 production verification.
✗ Published public npm/PyPI SDK.
```

---

## Formal verification artifact

```text
DOI: https://doi.org/10.5281/zenodo.18225586
Title: Deterministic State Gate (DSG): Formally Verified Control Primitive for Safety-Critical AI Systems
```

## GitHub Marketplace action

```yaml
- name: DSG Secure Deploy Gate
  uses: tdealer01-crypto/dsg-secure-deploy-gate-action@v1
```
