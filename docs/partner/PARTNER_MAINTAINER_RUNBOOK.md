# DSG ONE Partner Maintainer Runbook

## Role

Partner Maintainer may operate storefront, Bubble UI, partner integration, staging review, and non-core product fixes.

Partner Maintainer is not production owner and cannot bypass protected checkpoints.

## Fast Path — No Owner Block Needed

Partner can move fast on frontend UI, storefront copy, pricing layout, request-access flow, Bubble operator UI, partner API mapping, docs, integration examples, demo assets, non-sensitive bugfixes, staging tests, and preview checks.

## Checkpoint Path — Owner Review Required

Owner checkpoint is required for core governance engine, policy/gate/execution logic, audit/evidence/replay logic, auth/RBAC, billing secrets, production env, service role, destructive database migration, production deploy authority, GitHub/Vercel/Supabase admin changes, and cross-customer data access.

## Incident Severity

SEV-0: production down, data exposure, payment issue, secret leak, policy bypass.

SEV-1: API unavailable, onboarding broken, checkout broken, readiness failing.

SEV-2: UI bug, mapping bug, copy issue, dashboard layout issue.

SEV-3: feature request or product improvement.

## Production Claim Rule

No partner may publish customer-facing production claims unless backed by current evidence.

Required evidence:
- deployment Ready state
- env validation
- Supabase applied-state proof
- /api/health smoke
- /api/readiness smoke
- finance readiness smoke
- authenticated operator checks
- live staging/E2E validation

If evidence is missing, use staging-review, scaffold, demo, preview, or not production-ready.

Do not claim production-certified, bank-certified, guaranteed compliance, fully autonomous approval, or third-party audited.
