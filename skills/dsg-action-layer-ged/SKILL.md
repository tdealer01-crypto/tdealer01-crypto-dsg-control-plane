---
name: dsg-action-layer-ged
description: >-
  Run a studio-style agent control layer that turns a user goal into an
  explainable plan, deterministic decision flow, permission verdicts, and
  browser-first execution after approval. Use when the user wants to plan
  together first, see a separate user-facing planning pane with goals,
  architecture, ordered work stages, risks, and permission checkpoints, then
  approve the plan before live execution begins. Combines deterministic decision,
  a super-permission-gate, local-ops-controller rules for in-boundary authority,
  and browser operator behavior for real-time execution against external apps.
  Also covers: Deterministic Safety Gate (Z3/SMT), Replayable Governance,
  Compliance Evidence Pack, Runtime Governance lifecycle (Before/During/After),
  and Hermes Controlled Executor.
version: 1.0.0
author: DSG Team
license: MIT
---

# DSG Action Layer — Governed Execution Skill

DSG ONE / ProofGate Control Plane is **not** an AI Agent framework.
It is an **AI Governance Control Plane** — the layer that decides what Agents are *allowed* to do, captures cryptographic proof of every decision, and makes those decisions replayable months later.

> "Cloudflare = Control Plane of the Internet. Datadog = Control Plane of Observability.
> **DSG = Control Plane of AI Governance.**"

---

## When to invoke this skill

| User intent | Use this skill |
|---|---|
| "Gate this action before running it" | ✅ Yes — call `gate-evaluate` first |
| "Why did the AI decide X six months ago?" | ✅ Yes — use replay governance |
| "Get a compliance evidence pack for our audit" | ✅ Yes — use compliance evidence |
| "Execute this plan with a credential and conformance check" | ✅ Yes — Hermes executor |
| "What governance posture should this AI agent run with?" | ✅ Yes — runtime governance |
| "Build a generic AI feature with no governance requirement" | ❌ Out of scope |

---

## 5 Core Capabilities

Read the relevant reference file before answering or implementing any governance question.

| Capability | When to use | Reference |
|---|---|---|
| Deterministic Safety Gate | Before any agent action — get PASS/BLOCK/REVIEW + proof hash | <references/gate-evaluate.md> |
| Replayable Governance | Audit question: "Why did AI decide X at time T?" | <references/replay-governance.md> |
| Compliance Evidence Pack | Preparing for SOC2 / ISO27001 / EU AI Act / NIST audit | <references/compliance-evidence.md> |
| Runtime Governance | Lifecycle: Before / During / After agent execution | <references/runtime-governance.md> |
| Hermes Controlled Executor | Full Plan → Conformance Check → Credential Grant → Execute → Evidence | <references/hermes-executor.md> |

---

## Quick Decision Flow

When a user asks about an AI agent action:

```
1. PLAN    → What is the goal? What is the risk level?
2. GATE    → Call POST /api/dsg/v1/gates/evaluate
             → Get gateStatus: PASS | BLOCK | REVIEW
             → Get proofHash (cryptographic evidence)
3. DECIDE  → PASS  → proceed to execution
             REVIEW → show user the plan, require approval
             BLOCK  → halt, return reason + proof
4. EXECUTE → If PASS or approved REVIEW:
             → Hermes controlled executor (if credential needed)
             → Or direct execution with audit logging
5. COMMIT  → POST /api/spine/execute to commit evidence
             → Runtime evidence stored in Supabase
6. REPLAY  → Any future audit can replay from stored proof + policy version
```

---

## Gate Decision Mapping

| gateStatus | riskLevel | Action |
|---|---|---|
| `PASS` | any | Proceed. Log proofHash. |
| `REVIEW` | low–medium | Show plan to user. Require explicit approval. |
| `BLOCK` | any | Halt. Return reason. Never proceed. |
| `UNSUPPORTED` | low | Map to REVIEW — request human check |
| `UNSUPPORTED` | medium–critical | Map to BLOCK — refuse execution |

**UNSUPPORTED is never PASS.**

---

## Critical rules

- **Never skip the gate** for actions with `riskLevel: medium` or higher.
- **Never claim `UNSUPPORTED` is safe** — it maps to REVIEW or BLOCK, never PASS.
- **Always store the proofHash** in execution context for replay.
- **Policy version must be pinned** in every gate call to ensure replayability.
- **Credentials must go through Hermes CredentialBroker** — never raw secrets.
- **Mock state must be false** for any production gate evaluation.

---

## Base URL

```
https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Set `DSG_CONTROL_PLANE_URL` to override for local or staging.

---

## Authentication

All gate/proof/compliance endpoints require:

```http
Authorization: Bearer <DSG_API_KEY>
```

Obtain API key from the DSG dashboard → API Keys.
Free tier: 50 evaluations/month. Upgrade at `/pricing#dsg-gate`.
