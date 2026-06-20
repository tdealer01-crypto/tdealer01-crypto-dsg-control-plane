# DSG ONE — Production Evidence Snapshot

Date: 2026-06-20
Repo: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
Production URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app`

This document is the single evidence index for the June 20 production recovery and revenue-readiness audit. It is written to stop repeated evidence hunting across chat logs, screenshots, Vercel pages, GitHub PR pages, Stripe screens, and Supabase queries.

Use this file first before asking for new proof. If a new fact is discovered later, append it here with the source, date, and boundary.

## Decision summary

| Item | Status | Evidence |
|---|---:|---|
| Merge conflict in `app/dashboard/agents/page.tsx` | Resolved | Branch fix commit `afa48bcc4d71561eec82a985e40d250de563280e`; PR #754 merged to main commit `2b768d8b81bfaeff2a07991b9ed3db9c225cd7e7`. |
| Production deployment after merge | Ready | Vercel deployment `dpl_7H5X3Sb48KfXASERy9PSziSQYV3n` reached `READY`, target `production`, source `main`, commit `2b768d8b81bfaeff2a07991b9ed3db9c225cd7e7`. |
| Recovery deployment from fix branch | Ready | Vercel deployment `dpl_95Ra6oB54qgZYenGxwKkhRu44pYE` reached `READY`, target `production`, source `fix/pr750-audit-security`, commit `afa48bcc4d71561eec82a985e40d250de563280e`. |
| PR #754 | Merged | GitHub PR #754 closed and merged at merge commit `2b768d8b81bfaeff2a07991b9ed3db9c225cd7e7`. |
| PR #750 | Superseded | PR #750 is draft/stale relative to PR #754 and should not be used as the production source of truth. |
| Supabase billing schema | Present | `billing_customers`, `billing_events`, `billing_meter_outbox`, and `billing_subscriptions` tables exist in project `zeyguilldygozufpgxms`. |
| Supabase billing data snapshot | Partial | At snapshot time: `billing_subscriptions=2` trial rows; `billing_customers=0`, `billing_events=0`, `billing_meter_outbox=0`. Do not claim live customer revenue from DB rows yet. |
| Stripe products | Present | Stripe product search found DSG products including `DSG Pro`, `DSG Business`, `DSG Enterprise`, `DSG Execution Overage`, and `DSG ONE MCP`. |
| Stripe live revenue | Not claimed | Product existence is verified. Live-mode env wiring, live checkout, and real paid charge evidence are separate steps and are not claimed in this file. |
| Certified WORM / third-party audit / per-request external Z3 | Not claimed | README claim boundary remains active. Do not promote these as completed until independently evidenced. |

## Fixed deployment incident

### Original failure

Vercel production builds failed because `app/dashboard/agents/page.tsx` contained unresolved merge conflict markers:

```text
<<<<<<< HEAD
=======
>>>>>>> origin/main
```

The failure showed as a JavaScript/webpack syntax error in the Vercel build logs.

### Resolution

The file was resolved to keep normalized agent loading:

```ts
const data = await response.json();
const rawAgents = Array.isArray(data.agents) ? data.agents : Array.isArray(data.items) ? data.items : [];
setAgents(rawAgents.map(normalizeAgent).filter(Boolean) as Agent[]);
```

The fix was committed on `fix/pr750-audit-security`, then merged through PR #754 into `main`.

### Verification commands used locally

```bash
grep -nE '<<<<<<<|=======|>>>>>>>' app/dashboard/agents/page.tsx || echo "OK no conflict markers"
npm run build
```

Observed result: no conflict markers; local build completed after the file was corrected.

## GitHub evidence

| Evidence | Value |
|---|---|
| PR | #754 |
| PR title | `feat(automation): add browserbase-service package and multi-agent parallel execution route` |
| PR state | `closed` |
| PR merged | `true` |
| PR head branch | `fix/pr750-audit-security` |
| PR head commit | `afa48bcc4d71561eec82a985e40d250de563280e` |
| PR merge commit | `2b768d8b81bfaeff2a07991b9ed3db9c225cd7e7` |
| Files changed | 22 |
| Added / deleted | +1159 / -30 |

## Vercel evidence

### Latest main production deployment

| Field | Value |
|---|---|
| Deployment ID | `dpl_7H5X3Sb48KfXASERy9PSziSQYV3n` |
| State | `READY` |
| Target | `production` |
| Source ref | `main` |
| Commit | `2b768d8b81bfaeff2a07991b9ed3db9c225cd7e7` |
| Deployment URL | `tdealer01-crypto-dsg-control-plane-62vbbj7n1.vercel.app` |
| Production URL | `https://tdealer01-crypto-dsg-control-plane.vercel.app` |

### Fix-branch recovery deployment

| Field | Value |
|---|---|
| Deployment ID | `dpl_95Ra6oB54qgZYenGxwKkhRu44pYE` |
| State | `READY` |
| Target | `production` |
| Source ref | `fix/pr750-audit-security` |
| Commit | `afa48bcc4d71561eec82a985e40d250de563280e` |
| Deployment URL | `tdealer01-crypto-dsg-control-plane-pqk15da32.vercel.app` |

## Supabase evidence

Project observed: `zeyguilldygozufpgxms` (`dsg-control-plane-dev`).

Tables observed in `public` schema:

```text
billing_customers
billing_events
billing_meter_outbox
billing_subscriptions
```

Snapshot row counts observed:

```text
billing_customers: 0
billing_subscriptions: 2
billing_events: 0
billing_meter_outbox: 0
```

Subscription aggregate observed:

```text
status: trialing
plan_key: trial
billing_interval: monthly
row_count: 2
```

Boundary: DB schema exists and trial subscription rows exist. This is not proof of live paid revenue. It is proof that the billing tables are present and that subscription state is being represented in the database.

## Stripe evidence

Stripe product search observed the following product surfaces:

```text
DSG Pro
DSG Business
DSG Enterprise
DSG Execution Overage
DSG ONE MCP
DSG Secure Deploy Gate Pro - Production
DSG Secure Deploy Gate Pro - Team
DSG Secure Deploy Gate Pro - Solo
DSG Production Readiness Report
DSG Control Plane
```

Boundary: product existence is verified. Do not claim live revenue until the production env contains live Stripe keys, production price IDs, a successful checkout, a real charge/invoice, and webhook-to-Supabase persistence evidence.

## Revenue activation evidence boundary

The codebase and services show revenue infrastructure surfaces, but live revenue should only be claimed after all of these are true and recorded here:

1. Vercel production env has live Stripe keys and production price IDs.
2. `/pricing` creates checkout sessions against live prices.
3. Stripe dashboard shows a real paid subscription/charge/invoice.
4. Supabase records matching billing customer/subscription/event rows.
5. Metered events appear in `billing_meter_outbox` and move to sent/processed status.

Until then, use this wording:

> Revenue infrastructure exists; live paid revenue is not claimed from this evidence snapshot.

## Safe public wording

Use:

- deterministic gate / ProofGate control plane;
- production deployment is ready on Vercel for merge commit `2b768d8b81bfaeff2a07991b9ed3db9c225cd7e7`;
- PR #754 merged and resolved the production merge-conflict build failure;
- Stripe product surfaces exist;
- Supabase billing tables exist;
- evidence boundaries are documented.

Avoid:

- certified WORM;
- independent audit completed;
- third-party certification;
- per-request external Z3 production solver;
- real revenue active;
- all APIs revenue-ready;
- all security/compliance gates complete.

## Future evidence rule

Do not scatter evidence across chat. Add new proof here in this format:

```markdown
### YYYY-MM-DD — Evidence title

- Source: GitHub / Vercel / Supabase / Stripe / local command / screenshot artifact
- Exact ID: commit, deployment ID, table, invoice, event, run ID, or file path
- Result: PASS / READY / PRESENT / PARTIAL / FAIL
- Boundary: what this does not prove
```
