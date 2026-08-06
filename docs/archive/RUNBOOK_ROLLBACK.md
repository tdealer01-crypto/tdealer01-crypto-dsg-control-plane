# RUNBOOK: Rollback

## Trigger conditions
- Production incident after deployment.
- Critical regression in runtime execution, billing, or auth.

## 1) Roll back Vercel deployment
1. Open Vercel project deployments.
2. Identify last known-good production deployment.
3. Promote/rollback to the previous stable deployment.
4. Re-run smoke checks (`/api/health`, `/api/core/monitor`, `/api/usage`).

## 2) Database rollback considerations (Supabase)
- Prefer forward-fix migration over destructive rollback.
- If rollback is unavoidable, execute SQL rollback script only for reversible migrations.
- Validate affected tables: `usage_events`, `usage_counters`, `billing_subscriptions`, runtime lineage tables.

## 3) Stripe webhook and billing safety
- Keep webhook endpoint active unless it is the direct source of incident.
- If disabling webhook temporarily, record event IDs for replay.
- Reconcile Stripe events after restoration to prevent billing drift.

## 4) DSG Core dependency fallback
- If incident is tied to DSG Core deploy, restore last known-good DSG Core release.
- Re-validate `GET /api/core/monitor` until `readiness_status` returns `ready`.

## 5) Exit criteria
- User-facing error rate returns to baseline.
- Runtime execution path succeeds end-to-end.
- Billing and webhook processing are reconciled.
