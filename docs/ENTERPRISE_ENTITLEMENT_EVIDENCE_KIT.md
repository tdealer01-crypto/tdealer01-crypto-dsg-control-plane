# Enterprise Entitlement Evidence Kit

Date: 2026-05-11
Branch: `enterprise-entitlement-evidence-kit`

## Purpose

This kit adds a review surface for commercial entitlement, billing plan, seat, quota, upgrade, and denial readiness.

It does not claim that billing or entitlement enforcement is fully implemented.

## Added routes

- `GET /api/dsg/marketplace/entitlement`
- `GET /enterprise/entitlement`

## Added script

```bash
APP_URL=https://your-preview-or-production-url.example npm run smoke:entitlement
```

The script validates that the entitlement endpoint returns a valid evidence report with status gates and no-mock policy.

## Current status

The marketplace `commercial-entitlement` gate is moved from `BLOCKED` to `REVIEW` because this PR adds:

- entitlement evidence model
- entitlement API endpoint
- entitlement customer/operator page
- smoke script

It is not `PASS` yet.

## Required before PASS

1. Production plan source of truth
2. Plan-to-feature mapping
3. Seat limit source
4. Quota counter source
5. Quota exceeded denial test
6. Checkout or upgrade route proof
7. Billing portal route proof
8. Failed payment behavior proof
9. Owner approval

## No false claim rule

Do not mark this gate `PASS` until real plan, seat, quota, upgrade, and denial evidence are attached.
