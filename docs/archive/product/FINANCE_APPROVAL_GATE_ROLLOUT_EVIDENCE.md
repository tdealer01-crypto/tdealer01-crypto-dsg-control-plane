# Finance Approval Gate Rollout Evidence

Date: 2026-05-27
Branch: `finance-gate-rollout-evidence`
Base commit: `c2f5b279b2f6705a2eb53a75d8237ee16a9312b6`

## Purpose

Record the rollout evidence for the Finance Approval Gate SaaS wedge so future review can verify what entered `main`, what was deployed, and what is still blocked.

This document exists because the original implementation commits landed directly on `main`. Future product changes should use the normal flow:

```text
branch -> pull request -> review/checks -> merge -> Vercel deployment
```

## Existing implementation already in `main`

The Finance Approval Gate implementation is already present on `main` as of commit `c2f5b279b2f6705a2eb53a75d8237ee16a9312b6`.

Verified files changed between `b9e56a02897b87bce3673dac54bf82945f57ff1b` and `c2f5b279b2f6705a2eb53a75d8237ee16a9312b6`:

| File | Status | Purpose |
| --- | --- | --- |
| `app/finance-approval-gate/page.tsx` | added | New landing page for the Finance Approval Gate pilot. |
| `tests/unit/finance-approval-gate-page-copy.test.ts` | added | Copy and route contract tests for required page claims. |
| `components/GlobalNav.tsx` | modified | Adds Finance Approval Gate to product navigation. |
| `scripts/verify-ux-route-map.mjs` | modified | Adds route-map and user-outcome verification for the new page. |

## Required page contract

The page must keep these product constraints visible:

- One concrete workflow: AI or automation requests a payment, invoice, or vendor action.
- DSG evaluates policy, risk, entitlement, and evidence.
- DSG returns `ALLOW`, `BLOCK`, `REVIEW`, or `UNSUPPORTED`.
- DSG records decision-time evidence.
- CTA: `Request Finance Gate Pilot`.
- Evidence boundary: `Pre-audit evidence only. No independent certification claimed.`

## Demo scenarios

The page must keep exactly these scenario classes visible:

1. Low-risk payment allowed.
2. High-value payment requires review.
3. Missing invoice evidence requires review.
4. Destructive action blocked.
5. Unsupported action returned as unsupported.

## Claim boundary

Do not claim any of the following unless directly verified in current code and live deployment evidence:

- independent certification
- completed WORM-certified storage
- external Z3 production invocation
- enterprise readiness

Current status: pre-audit evidence page and high-touch pilot wedge only.

## Vercel status notes

Observed Vercel state during rollout:

- The latest successful production deployment observed before this record was an older deployment at commit `b9e56a02897b87bce3673dac54bf82945f57ff1b`.
- Deployment attempts for the new Finance Approval Gate commits were observed as `CANCELED` rather than `READY`.
- A later redeploy attempt was observed from source repo `dsg-one-v1`, not this repository, and failed on a Stripe TypeScript API-version mismatch.

Therefore, do not mark the Finance Approval Gate route as production-live until a Vercel deployment from `tdealer01-crypto/tdealer01-crypto-dsg-control-plane` at or after `c2f5b279b2f6705a2eb53a75d8237ee16a9312b6` reaches `READY` and `/finance-approval-gate` returns the expected page.

## GO / NO-GO

Current rollout decision: `NO-GO` for production-live claim.

GO requires:

1. PR merged into `main` through the repository workflow.
2. Vercel deployment source repo is `tdealer01-crypto-dsg-control-plane`.
3. Deployment commit is at or after `c2f5b279b2f6705a2eb53a75d8237ee16a9312b6`.
4. Deployment state is `READY`.
5. `/finance-approval-gate` renders the page with CTA and evidence boundary.

## Operator checklist

After merge, verify:

```bash
curl -i https://<production-domain>/finance-approval-gate
```

Expected page text:

```text
Finance Approval Gate
Gate AI payment requests before money moves.
Request Finance Gate Pilot
Pre-audit evidence only. No independent certification claimed.
```
