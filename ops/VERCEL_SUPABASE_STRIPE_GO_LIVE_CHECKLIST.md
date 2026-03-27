# Vercel + Supabase + Stripe Go-Live Checklist

This checklist is the minimum standard before enabling a public production domain.

## Vercel

- [ ] Production deployment is green
- [ ] Preview deployments require authentication or are restricted
- [ ] Production domain is assigned correctly
- [ ] Environment variables are configured for Production, Preview, and Development
- [ ] Error monitoring is enabled
- [ ] Build command is `npm run build`
- [ ] Health endpoint `/api/health` is reachable in production
- [ ] Deployment rollback path is documented

## Supabase

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set only on server-side environments
- [ ] Row-level access policy is reviewed for all product tables
- [ ] The `users` table correctly maps `auth_user_id -> org_id`
- [ ] Test user accounts exist for at least two separate organizations
- [ ] Cross-org access has been tested and denied
- [ ] DB schema exists for `agents`, `executions`, `audit_logs`, `usage_events`, `usage_counters`, and billing tables
- [ ] Backups and retention are configured

## Stripe

- [ ] `STRIPE_SECRET_KEY` is configured
- [ ] `STRIPE_WEBHOOK_SECRET` is configured
- [ ] `STRIPE_PRICE_PRO` is configured
- [ ] `STRIPE_PRICE_BUSINESS` is configured
- [ ] Checkout flow works in test mode
- [ ] Subscription status sync works end-to-end
- [ ] Webhook retries are tested
- [ ] Billing status is visible in dashboard without exposing secrets

## Auth and tenancy

- [ ] Dashboard routes require authenticated sessions
- [ ] Inactive users receive `403`
- [ ] All organization data APIs are server-side scoped to `org_id`
- [ ] Admin-only operations have role checks
- [ ] API keys are hashed before storage
- [ ] API key preview never exposes full secret after creation

## DSG runtime

- [ ] `/api/execute` works with a real agent and API key
- [ ] ALLOW / STABILIZE / BLOCK decisions are persisted
- [ ] Audit rows are written for every execution
- [ ] Usage counters increment correctly
- [ ] Replay/idempotency behavior is validated
- [ ] DSG core health reports `ok`
- [ ] Ledger / proof views render in dashboard

## Observability

- [ ] Structured logs include request id, org id, agent id, route, decision, and latency
- [ ] High error rate alerts are configured
- [ ] DSG core unreachable alerts are configured
- [ ] Stripe webhook failure alerts are configured
- [ ] Supabase query failure alerts are configured

## Launch gate

Only ship to a public production domain when every box above is checked.