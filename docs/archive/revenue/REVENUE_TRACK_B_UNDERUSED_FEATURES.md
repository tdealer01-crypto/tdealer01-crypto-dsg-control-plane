# Revenue Track B — Monetizing Underused Existing Features

**Date:** 2026-07-03
**Branch:** `claude/stripe-startups-benefits-dirwek`
**Scope boundary:** Track B is complementary to the activation track (env vars, cron registration in `vercel.json`, webhook reconciliation, pricing source of truth) being handled separately. Track B touches **none** of those files.

---

## What changed and why

### 1. Delivery-Proof badge — viral distribution loop
- **New:** `GET /api/delivery-proof/badge/[run_id]` renders a public SVG badge (green `evidence complete` / red `production blocked` / grey `unknown`) from `delivery_proof_reports`. Cached 1h, never 500s.
- **New:** `app/delivery-proof/report/[run_id]/ShareSection.tsx` — the report page's share tools plus a copyable badge-markdown snippet.
- **Fixed:** the previous inline share section used `onClick`/`window.location` inside a **server component**, which crashes the report-found path at request time. Extracted to a client component.
- **Funnel:** badge in customer READMEs → report page → "Run New Scan" → existing 402 entitlement gate → existing checkout. No billing files touched.

### 2. SEO foundation — sitemap + robots (previously absent entirely)
- **New:** `app/sitemap.ts` — static entries for every public selling surface (`/pricing`, `/delivery-proof`, `/finance-governance/pricing`, `/finance-approval-gate`, `/eu-ai-act`, `/iso-42001`, `/nist-ai-rmf`, `/ai-compliance`, `/marketplace`, `/marketplace/skills`, `/blog`, `/compliance-evidence-pack`, `/enterprise-ready`, `/playground`) plus published blog slugs from `marketing_content`. Supabase failure → static list (build-safe).
- **New:** `app/robots.ts` — crawl allowed except `/dashboard`, `/api/`, `/approvals`, `/gateway`, `/app-shell`, `/admin`.
- **Why revenue:** the marketing agent already generates SEO articles into `marketing_content`; without a sitemap Google could not discover them or the compliance landing pages.

### 3. Compliance Evidence Pack — per-customer (`?run_id=`)
- `GET /api/compliance-evidence-pack?run_id=<id>` now embeds a **Customer Deployment Evidence** section (probes, claim result, timestamps) from that scan's persisted report.
- Gated by the existing Delivery-Proof entitlement (paid tiers). Free/unauthenticated → upgrade banner linking `/delivery-proof`.
- No `run_id` → byte-level behavior class unchanged (static pack). Disclosures `certificationClaim=false / independentAuditClaim=false` always kept.
- **Why revenue:** turns a static lead magnet into a deliverable owned by the $199/mo Unlimited tier without touching checkout/pricing files.

### 4. beta-signup lead leak — fixed
- `POST /api/beta-signup` previously only `console.log`'d — every captured lead was dropped. Now persists to the shared `leads` table (the marketing agent's working set) and sends the existing Resend welcome email. Graceful when Supabase/Resend are unconfigured.
- Removed the fake `EARLY_BIRD` promo lottery (claimed "first 3 signups", was `Math.random()` — no real entitlement existed).

### 5. SDK name mismatch — fixed (docs only)
- `packages/dsg-one-sdk` README/client doc referenced `@dsg-one/sdk`; the package publishes as `dsg-one-sdk`. Install instructions now match. Publishing remains a manual founder decision (`npm run publish:dry` first).

---

## Claim classification

| Claim | Status |
|---|---|
| Badge route renders green/red/grey and never 500s | `verified fact` (unit tests, 5 passing) |
| Report page share section previously crashed on report-found path | `verified fact` (server component with `onClick`/`window` — inspected source) |
| sitemap/robots did not exist before this change | `verified fact` (checked `app/sitemap*`, `app/robots*`) |
| Evidence pack per-customer section gated by paid tier | `verified fact` (unit tests, 6 passing) |
| beta-signup previously persisted nothing | `verified fact` (inspected old source: console.log only) |
| Badge/SEO will produce traffic or conversions | `not verified` — requires live analytics after deploy |
| Live paid revenue exists | `not verified` — only `billing_events` rows + Stripe charges are acceptable proof |

## Pre-existing blockers found during verification (not caused by Track B)

- **`next build` fails on `origin/main` itself** at `app/api/gateway/plan-check/route.ts:25` — verified by building a clean `origin/main` worktree. Root cause: `lib/gateway/types.ts` defines `GatewayDecision` as `{approved, reason, risk_level, ...}` and `GatewayToolRequest` as `{request_id, tool_id, ...}`, while `lib/gateway/monitor.ts` (which imports those types) uses `.orgId`, `.toolName`, and treats `decision` as a string — two incompatible schemas in the same module. `npm run typecheck` reports **137 errors on both main and this branch (0 new from Track B)**. Reconciling the gateway type schemas is a separate fix and blocks all production deploys from main.
- `tests/unit/dsg-brain-openrouter-resilient.test.ts` (from PR #846) fails 5 tests in this environment because `OPENROUTER_API_KEY` is not configured — environment-dependent, identical file on main.

## Known limits
- `app/ai-compliance/page.tsx` and `app/playground/page.tsx` are client components — no per-page metadata added (would need layout-level metadata; out of scope).
- Badge reads via the standard Supabase server client; if RLS blocks anonymous reads of `delivery_proof_reports` in a given environment, badges render `unknown` (fail-safe, not fail-wrong).
- Per-customer evidence is live-endpoint probe evidence, not a code audit — the section says so explicitly.
- Vercel deployment/env activation is the other track's scope; nothing here claims production go-live.

## Next steps
1. Deploy + verify `GET /sitemap.xml`, `GET /robots.txt`, one badge URL on production.
2. Submit sitemap in Google Search Console.
3. Decide on `npm publish` for `dsg-one-sdk` (`npm run publish:dry` to preview).
4. After the activation track lands, wire the weekly report to include badge views / signup counts.
