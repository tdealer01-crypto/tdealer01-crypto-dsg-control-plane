---
name: governance-review
description: >-
  Review code changes in the DSG ONE / ProofGate Control Plane against the
  repository's own operating rules. Use when reviewing a diff, PR, or new
  file that touches app/api routes, lib/spine or lib/runtime, lib/dsg
  deterministic gate code, Supabase migrations, or any change that makes a
  status/readiness claim. Checks API route conventions, security conventions,
  the truth boundary, runtime spine flow, the deterministic gate boundary
  (UNSUPPORTED is never PASS), and Supabase/RLS scoping.
---

# Governance Review (DSG ONE / ProofGate)

This skill reviews changes against the rules that actually govern this
repository. It does not replace `npm run typecheck`, `npm run test`, or
`npm run build` — it is a human-readable review pass to run alongside them.

Anchor every finding to a concrete file and line. Do not claim a rule is
violated without pointing at the exact code. When you are unsure, label the
finding `not verified` rather than guessing.

## Review checklist

### 1. Truth boundary (CLAUDE.md section 1)

- Flag any code comment, doc string, log line, PR text, or response that uses
  a blocked claim without fresh evidence: `production-ready`,
  `marketplace-ready`, `enterprise-ready 100%`, `certified compliance`,
  `guaranteed compliance`, `third-party audited`, `WORM-certified storage`,
  `JWT/JWKS auth complete`, `real cryptographic signing complete`,
  `external production Z3 solver invocation`, `mainnet launched`,
  `TVL / DAU / users`.
- Allowed wording when evidence supports it: `production-connected`,
  `evidence-ready`, `audit-ready`, `governance-enabling`,
  `deterministic gate scaffold`, `setup-ready`, `pre-audit evidence mapping`.
- Mock/demo data must be labelled as such and never described as production
  data.

### 2. API route conventions (CLAUDE.md sections 7-8)

- Route handlers live in `app/api/**/route.ts`.
- Routes that must not be statically cached export `dynamic = 'force-dynamic'`.
- Next.js 15 dynamic params use the async shape
  `params: Promise<{ id: string }>` and `await params` before reading.
- Prefer `NextResponse.json(...)` for responses and `handleApiError(...)`
  where the existing route style uses it.
- New critical POST/PUT/PATCH routes should use `readJsonBody(...)` with an
  explicit max size instead of raw `request.json()`; if raw `request.json()`
  is used, the blast radius must be small and justified.

### 3. Security conventions (CLAUDE.md section 9)

- No secrets committed or printed: Supabase service-role keys, Vercel tokens,
  Stripe keys/webhook secrets, model provider keys, GitHub PATs, cookies,
  session tokens, private `.env` values, customer data. Only document env var
  names.
- Cron routes must fail closed when `CRON_SECRET` is absent — a missing secret
  must not allow anonymous execution.
- Do not assume `middleware.ts` protects API routes; API auth must be
  implemented in the route or a shared server helper.
- CORS routes use `buildCorsHeaders(...)` / `buildPreflightResponse(...)`.
- Dependency `overrides` in package.json should not be removed without audit
  and justification.

### 4. Runtime spine (CLAUDE.md section 11)

- Governed execution goes through `/api/execute`, `/api/intent`, or
  `/api/spine/execute`. Do not write around the runtime commit/audit path for
  governed actions.
- Expected flow: resolve agent from Bearer token and `agent_id`; check quota
  and org/agent status; create or reuse the runtime intent/approval key; run
  the pipeline; commit lineage/audit via the runtime commit RPC; return
  decision, proof, trace, usage, and sequence metadata.
- Errors mentioning `runtime_commit_execution`, PostgREST schema cache, or
  missing runtime RPC/tables point to `docs/RUNBOOK_DEPLOY.md` recovery, not an
  ad hoc fix.

### 5. Deterministic gate boundary (CLAUDE.md section 12)

- `POST /api/dsg/v1/gates/evaluate` is a DSG-native deterministic adapter; it
  does not invoke an external Z3 solver. Do not let a change claim external
  production Z3 invocation from that route.
- `UNSUPPORTED` must never map to `PASS`. Low-risk `UNSUPPORTED` maps to
  `REVIEW`; medium/high-risk `UNSUPPORTED` maps to `BLOCK`.
- Design-time proof scripts (`npm run verify:policy`, `npm run proof:revenue`)
  prove only the exact models they check; do not upgrade them to end-to-end
  product proof.

### 6. Supabase and RLS (CLAUDE.md section 10)

- A migration file existing does not prove it is applied; a generated type
  existing does not prove the live object exists. Say `migration file exists`,
  not `live DB ready`, without a query result.
- Dangerous SQL (`DROP`, `TRUNCATE`, broad RLS disablement, permissive
  policies) needs explicit review and evidence.
- RLS changes must state who can read/write and how org/workspace scoping is
  enforced.
- If schema changes, `lib/database.types.ts` should be regenerated and
  `npm run typecheck` run.

## Output format

Group findings by severity, and for each finding give file:line, the rule, and
a concrete suggestion:

```
BLOCKER  — <file:line> — <rule> — <why> — <suggested fix>
WARNING  — <file:line> — <rule> — <why> — <suggested fix>
NOTE     — <file:line> — <observation>
```

End with the verification the author still needs to run from the ladder
(section 6), e.g. `npm run typecheck`, targeted `npm run test -- <file>`,
`npm run build`. If you did not run a check yourself, say `Not run` and why.
