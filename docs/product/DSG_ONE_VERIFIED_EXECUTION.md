# DSG ONE — Verified Execution

**Status:** product/UX layer locked. Architecture, API, and Z3 schema serve this document, not the reverse.

---

## 1. The one product

DSG ONE ships **one** product: **Verified Execution**.

> Before an AI agent does the work, DSG proves that what it is about to do matches
> the plan you approved. After the work is done, DSG holds evidence that it did
> that and nothing else.

The user never needs to understand Z3, SMT, Ising, QUBO, or proof hashes. Those
are the engine. The user reads one verdict and one receipt.

Product model in one sentence:

> **DSG ONE lets AI do real work, where every action must match what the user
> approved, and every outcome must be provable.**

---

## 2. The five layers

Everything the product does is one of five layers. Anything that is not one of
these five is not part of DSG ONE.

```
User states intent
     ↓
Agent proposes a plan
     ↓
User sees the plan and approves once
     ↓
┌──────────────────────────┐
│ DSG VERIFIED EXECUTION   │
│                          │
│ 1. PLAN LOCK             │
│ 2. VERIFY                │
│ 3. EXECUTE               │
│ 4. OBSERVE               │
│ 5. PROVE                 │
└──────────────────────────┘
     ↓
One verdict

  ✓ VERIFIED
  △ NEEDS REVIEW
  ✕ BLOCKED
     ↓
Evidence + Replay + Proof
```

### Layer 1 — Plan Lock

Turn an instruction into a plan that can be checked. The user sees what the
agent will do, which systems it will touch, and what it explicitly will not do.
The user presses **Approve & Run** once.

After approval DSG must not ask again without a stated reason. The only
legitimate reasons to re-prompt are:

- the agent proposes an action outside the approved plan scope;
- the plan expired;
- a policy version changed under the running plan.

Each of those is shown to the user as a named reason, never as a bare
re-confirmation dialog.

The approval freezes a `planHash`. Every later action carries that hash. A
mismatch is not a warning — it stops that action.

### Layer 2 — Verified Action Compiler

This is the core IP:

```
Approved Plan → Action → Policy/Permission → Constraint → Z3 → PASS / BLOCK
```

Optimization and Ising may **select candidates**. They are never the authority
on correctness. Z3 decides. This boundary is load-bearing: if optimization ever
becomes the decider, the product's claim collapses.

`UNSUPPORTED` is never `PASS`:

| Gate result | Risk | Verdict |
|---|---|---|
| `PASS` | any | proceed |
| `UNSUPPORTED` | low | `NEEDS REVIEW` |
| `UNSUPPORTED` | medium / high / critical | `BLOCKED` |
| `BLOCK` | any | `BLOCKED` |

### Layer 3 — Controlled Execution

Once an action passes, the agent runs it immediately. DSG does not put a gate in
front of work the user has already approved. Approval fatigue is the failure
mode this layer exists to avoid.

DSG interrupts only when an agent steps outside the plan, and then it stops
**that action only** — not the run.

### Layer 4 — Live Verification

The user should never have to open logs. They see plain progress:

```
Deploying → Testing → Checking production → Verified
```

When something fails, DSG says so directly and says what to fix:

> **BLOCKED — deployment succeeded but health check failed**
> `/api/health` returned 503. Fix the health check or roll back to the previous
> release, then re-run.

No hedging, no "some checks may have issues."

### Layer 5 — Proof Receipt

The differentiator. One job produces one receipt:

```
DSG EXECUTION RECEIPT

Result             VERIFIED ✓
Requested action   Deploy release
Plan alignment     PASS
Permission         PASS
Constraints        PASS
Tests              128 / 128 PASS
Production check   PASS
Evidence           14 artifacts
Replay             MATCH
Proof              7f28...91ac

[ View Evidence ]   [ Replay ]   [ Export Proof ]
```

Replay is what makes the receipt worth anything: re-running the chain must
reproduce the same hashes and the same verdict. Drift shows up as a per-field
mismatch rather than passing silently.

---

## 3. Navigation

Five destinations. Not twenty.

| Nav | Purpose |
|---|---|
| **Run** | Command bar. The default screen. |
| **Activity** | Runs in flight and recent runs. |
| **Proofs** | Receipts, replay, export. |
| **Policies** | What the org allows, and the active policy version. |
| **Integrations** | Connected systems the plan may touch. |

The home screen is a single input:

> **What do you want your agent to do?**
> `Deploy the latest verified version to production`

From that one field DSG runs Plan → Verify → Execute → Prove in one workflow.

---

## 4. Integrations

Use what the customer already has. Do not build a parallel ecosystem.

| System | Role |
|---|---|
| GitHub | code, PRs, checks |
| Vercel | deployments |
| Supabase | data and evidence |

---

## 5. Explicitly out of scope

These are rejected because they add surface area without adding to the core
claim:

- our own agent marketplace;
- a new monitoring platform;
- a generic chatbot;
- a second approval system;
- a dashboard of technical metrics.

---

## 6. Execution boundary

DSG **orchestrates**; the caller's runtime **executes**.

```
DSG ONE control plane          Client executor
─────────────────────          ───────────────
plan lock                 →
verify step               →
                          →    dispatch
                          ←    observation
conformance check         ←
receipt                   →
```

Supported executor surfaces are already modelled in
`lib/dsg-one/verified-action-receipt.ts` as
`VerifiedActionSurface = 'api' | 'unify' | 'trinity-mcp'`:

- `api` — direct API callers and the GitHub Action;
- `unify` — the Unify desktop assistant (`agent-service/src/dsgGate.ts`);
- `trinity-mcp` — the Trinity MCP server.

DSG does not hold the executor's credentials for these surfaces, and it does not
run the customer's deploy itself. That is a deliberate blast-radius decision, not
a limitation to be quietly removed later.

---

## 7. Claim boundary

Per `CLAUDE.md` §1, this document does not license any of the following. Each
needs separate, current evidence:

- `production-ready`, `enterprise-ready`, `certified compliance`;
- `third-party audited`, `WORM-certified storage`;
- `external production Z3 solver invocation` — `/api/dsg/v1/gates/evaluate` is a
  DSG-native deterministic gate adapter and does not call an external Z3 solver;
- any user, revenue, or TVL number.

What this document *does* support, when the code is deployed and verified:

- `deterministic gate scaffold`;
- `evidence-ready`, `audit-ready`;
- `governance-enabling`.

---

## 8. What "done" means for this layer

A run is complete when all five hold:

1. the user approved exactly one plan, and its `planHash` is frozen;
2. every executed step carries that `planHash`;
3. every step verdict came from the gate, never from the optimizer;
4. the run ended in exactly one of `VERIFIED` / `NEEDS_REVIEW` / `BLOCKED`;
5. a receipt exists and replays to the same verdict.

If any of the five is missing, the run is not `VERIFIED`. There is no partial
credit.
