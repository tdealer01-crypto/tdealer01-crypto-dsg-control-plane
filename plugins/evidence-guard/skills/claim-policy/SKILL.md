---
name: claim-policy
description: >-
  Apply the DSG ONE / ProofGate truth boundary and claim policy. Use when
  writing or reviewing any status, readiness, compliance, or capability
  statement destined for code, docs, commits, PRs, issues, comments, logs, or
  a response. Classifies each statement as verified fact / inference / pending
  / blocked / not verified, and flags forbidden readiness claims that require
  fresh evidence.
---

# Claim Policy (DSG ONE / ProofGate)

This repository is evidence-first. Do not put false text, fake evidence,
guessed status, or exaggerated readiness into any artifact. When you make a
claim, attach its classification and its evidence.

## Classify every important statement

Label each load-bearing statement as exactly one of:

- **verified fact** — backed by inspected repo files, real command output,
  GitHub/Supabase/Vercel metadata, or a live authorized endpoint response.
  Cite the evidence (file, command, query, or response).
- **inference** — a reasonable conclusion from evidence, but not directly
  observed. Say what it is inferred from.
- **pending** — expected but not yet checked; state what check would confirm it.
- **blocked** — cannot be checked now; state the blocker.
- **not verified** — asserted elsewhere (README, past PR, memory) but not
  confirmed against current state.

If evidence is missing, use `pending`, `blocked`, or `not verified` — never
upgrade to `verified fact`.

## Forbidden claims without fresh evidence

Do not use these unless current evidence proves them:

- `production-ready`
- `marketplace-ready`
- `enterprise-ready 100%`
- `full customer production go-live`
- `certified compliance`
- `guaranteed compliance`
- `third-party audited`
- `WORM-certified storage`
- `JWT/JWKS auth complete`
- `real cryptographic signing complete`
- `external production Z3 solver invocation`
- `mainnet launched`
- `TVL / DAU / users`

## Allowed wording (when evidence supports it)

- `production-connected`
- `evidence-ready`
- `audit-ready`
- `governance-enabling`
- `deterministic gate scaffold`
- `setup-ready`
- `pre-audit evidence mapping`

## Common traps (CLAUDE.md section 23)

- Passing `npm test` does not prove `next build` passes.
- A migration file existing does not prove it is applied to production.
- A generated Supabase type existing does not prove the live DB object exists.
- A route file existing does not prove the deployed route is live.
- A passing design-time proof does not prove end-to-end production proof.
- `UNSUPPORTED` is never `PASS`.
- Mock data must never be described as production data.
- Docs saying "encrypted" are not enough; verify the implementation.

## How to respond

Rewrite risky statements into honest ones. Example:

- Before: "Billing is production-ready."
- After: "Billing quota gate code exists in `lib/billing/` (verified fact:
  file inspected). Live Stripe/Supabase billing for the target environment is
  `not verified` — needs current Stripe/Vercel/Supabase evidence."

When the honest answer is "not ready," say so and give the shortest safe path
to readiness.
