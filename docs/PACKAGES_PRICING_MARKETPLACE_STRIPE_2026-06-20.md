> **[CORRECTION 2026-07-03]** ราคาในเอกสารนี้บางส่วนล้าสมัย (Agency $299 / Enterprise $999 ไม่ตรงกับระบบจริง)
> แหล่งความจริงเดียวของราคาปัจจุบันคือ `lib/billing/pricing-catalog.ts`
> (pro $99/mo, business $199/mo, enterprise $499/mo + skills bundles + delivery-proof tiers)
> เอกสารนี้คงไว้เป็นบริบทประวัติศาสตร์ — อย่าใช้อ้างอิงราคา

# DSG ONE — Packages, Pricing, Marketplace, and Stripe Map

Date: 2026-06-20
Repo: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`

This document is the source-of-truth map for product packaging, public pricing, GitHub Marketplace positioning, and Stripe configuration.

It does not claim live paid revenue. Live revenue is only claimable after Stripe live prices, successful checkout, real charge/invoice, webhook persistence, and Supabase billing rows are recorded in `docs/PRODUCTION_EVIDENCE_2026-06-20.md`.

## Current code-grounded pricing

The current `app/pricing/page.tsx` exposes these plans:

| Plan | Price shown | Included positioning |
|---|---:|---|
| Trial | Free | 1,000 executions/mo, policy gate, audit trail, finance governance, 14-day full access. |
| Pro | $99/mo or $79/mo yearly-equivalent | 10,000 executions/mo, approval workflow, email notifications, priority support. |
| Agency | $299/mo or $249/mo yearly-equivalent | White-label Delivery Proof Report, share link per client, multi-project dashboard, audit export. |
| Enterprise | $999/mo or $849/mo yearly-equivalent | Custom quota, all skill packs, custom skill builder, SSO/RBAC, SLA/CSM. |

The current `app/api/billing/checkout/route.ts` core subscription plan keys are:

| API plan key | Required Stripe env vars | Trial days |
|---|---|---:|
| `pro` | `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY` | 14 |
| `business` | `STRIPE_PRICE_BUSINESS_MONTHLY`, `STRIPE_PRICE_BUSINESS_YEARLY` | 14 |
| `enterprise` | `STRIPE_PRICE_ENTERPRISE_MONTHLY`, `STRIPE_PRICE_ENTERPRISE_YEARLY` | 30 |

Boundary: the public pricing page uses `Agency`, while the checkout API uses `business`. Treat `Agency`/`Business` as a naming alignment item before final launch.

## Skill-pack add-ons

Skill packs currently use inline Stripe `price_data`, so they do not require pre-created Stripe Price IDs before checkout.

| Skill pack key | Public name | Monthly | Yearly |
|---|---|---:|---:|
| `finance_skills` | DSG Finance Governance Pack | $199/mo | $1,791/yr |
| `dev_skills` | DSG Dev Automation Pack | $99/mo | $891/yr |
| `compliance_skills` | DSG Compliance & Legal Pack | $249/mo | $2,241/yr |
| `ops_skills` | DSG Operations Pack | $149/mo | $1,341/yr |
| `enterprise_skills` | DSG Enterprise Bundle | $599/mo | $5,391/yr |

## Recommended product ladder

| Tier | Public name | Price | Best for | Billing mode |
|---|---|---:|---|---|
| Trial | DSG Trial | $0 | trying proof-gated AI actions | signup/trial |
| Pro | DSG Pro | $99/mo | solo builders and small teams | Stripe subscription |
| Business / Agency | DSG Business or DSG Agency | $299/mo | agencies, teams, client delivery | Stripe subscription |
| Enterprise | DSG Enterprise | $999/mo+ | regulated teams, SSO/RBAC, custom quota | Stripe subscription or sales-assisted |
| Add-ons | DSG Skill Packs | $99–$599/mo | add capabilities by function | Stripe subscription add-on |
| Usage | DSG Execution Overage | $0.001/execution | usage above included quota | Stripe meter event |

## Stripe env mapping

Set these in Vercel production after selecting or creating live Stripe prices:

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
STRIPE_METER_EVENT_NAME=dsg_execution_overage
NEXT_PUBLIC_APP_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Legacy fallback envs still exist in checkout code:

```bash
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_BUSINESS=price_...
```

Launch recommendation: use the explicit monthly/yearly env vars, not the legacy fallback.

## Stripe product mapping

Existing Stripe products observed in evidence include:

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

Recommended canonical mapping:

| Stripe product | Purpose | Price type |
|---|---|---|
| DSG Pro | Core SaaS Pro subscription | recurring monthly/yearly |
| DSG Business / DSG Agency | Team/agency subscription | recurring monthly/yearly |
| DSG Enterprise | Enterprise subscription or pilot | recurring/custom |
| DSG Execution Overage | Metered usage above quota | metered event |
| DSG ONE MCP | MCP-native governance add-on or separate plan | recurring |
| DSG Secure Deploy Gate Pro - Solo | GitHub Marketplace Solo package | recurring |
| DSG Secure Deploy Gate Pro - Team | GitHub Marketplace Team package | recurring |
| DSG Secure Deploy Gate Pro - Production | GitHub Marketplace Production package | recurring |
| DSG Production Readiness Report | One-time readiness report | one-time |
| DSG Control Plane | Umbrella/core platform product | recurring/custom |

## GitHub Marketplace positioning

Recommended listing title:

```text
DSG Secure Deploy Gate
```

Recommended short description:

```text
Block risky deploys before they ship with deterministic policy gates, approval workflow, and evidence hashes.
```

Recommended GitHub Marketplace packages:

| Marketplace package | Price | Included usage | Upgrade path |
|---|---:|---|---|
| Free | $0 | limited proof checks for public/test projects | Solo |
| Solo | $29/mo | single maintainer, basic deploy gate, proof hash | Team |
| Team | $99/mo | team repos, approval workflow, audit export | Production |
| Production | $299/mo | production release gates, Delivery Proof report, priority support | Enterprise |
| Enterprise | custom | SSO/RBAC, custom policy packs, private support | sales-assisted |

## Required launch checklist

Before claiming billing launch is complete:

1. Create or select live Stripe prices for Pro, Business/Agency, and Enterprise monthly/yearly.
2. Set Vercel production env vars for all required Stripe price IDs.
3. Confirm `/api/billing/checkout` returns a live Checkout URL for Pro, Business/Agency, and Enterprise.
4. Complete one real low-value live checkout or Stripe test-mode verification clearly marked as test.
5. Verify webhook persistence into Supabase billing tables.
6. Verify metered events for `DSG Execution Overage` if usage billing is enabled.
7. Update `docs/PRODUCTION_EVIDENCE_2026-06-20.md` with exact price IDs, session ID, invoice/charge ID, webhook event ID, and Supabase row evidence.

## Safe wording

Use:

> DSG ONE has documented package, pricing, GitHub Marketplace, and Stripe env mapping. Live revenue is not claimed until Stripe checkout, charge/invoice, webhook, and Supabase evidence are recorded.

Avoid:

- live revenue active;
- all Stripe billing complete;
- GitHub Marketplace approved;
- metered billing active;
- paid customers live;

unless backed by evidence in the production evidence snapshot.
