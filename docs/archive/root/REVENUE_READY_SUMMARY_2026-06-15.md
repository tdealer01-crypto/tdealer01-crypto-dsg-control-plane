# DSG Control Plane — Revenue Ready Summary

**Generated:** 2026-06-15T02:15:00Z  
**Commit:** 8e0ee6b8  
**Production:** https://tdealer01-crypto-dsg-control-plane.vercel.app

---

## Executive Summary

| Metric | Status |
|--------|--------|
| **Production Health** | ✅ All 7/7 readiness checks pass |
| **Auth Gate** | ✅ 401 on missing token |
| **Quota Gate** | ✅ 402 + upgrade_url when exceeded |
| **Stripe Billing** | ✅ Checkout → Webhook → Entitlement flow implemented |
| **MCP Subscriptions** | ✅ ฿490/mo, 10k calls/mo |
| **Tests Passing** | 2,077 / 2,186 (95%) |
| **Stripe App** | ✅ Built, tested (257/257), pushed to GitHub |

---

## Revenue Streams

### 1. DSG Control Plane Subscriptions
- Plans: Free → Trial → Pro → Business → Enterprise
- Flow: `/pricing` → Stripe Checkout → `/api/webhooks/stripe` → `fulfillSubscription()` → Entitlement updated
- Quota enforcement: `/api/execute` returns 402 + `upgrade_url` when `used >= limit`

### 2. MCP API Subscriptions (฿490/mo)
- Table: `dsg_mcp_api_keys` (RLS, org-isolated)
- Stripe webhook: `checkout.session.completed` → `activate_mcp_subscription()`
- Renewal: `invoice.paid` → `renew_mcp_subscription_period()`
- Quota check: `validate_mcp_api_key()` RPC
- Usage log: `record_mcp_usage()` RPC per call

### 3. Stripe App Marketplace
- App: DSG Governance Gate (`pics.dsg.governance`)
- Views: ChargeGate, PaymentIntentGate, PayoutGate
- Status: Build ✅ | Type-check ✅ | Tests 257/257 ✅

### 4. SkillGate Verify / Governed Agent Runs
- MCP tools: DSG tools + runtime tools
- Endpoints: `/api/mcp`, `/api/agent/hybrid`
- Governance surfaces: deterministic checks, audit trails, and evidence capture

---

## Production Health

```bash
# Health endpoint
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
# → 200 { "ok": true, "rateLimiter": { "ok": true } }

# Readiness (7/7 checks)
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness
# → 200 { "ok": true, "checks": { "env": true, "nextAuthSecret": true, "supabaseServiceRole": true, "dsgCoreConfig": true, "dsgCoreHealth": true, "financeGovernanceSurface": true, "financeGovernanceBackend": true } }

# Execute gate
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute
# → 401 { "error": "Missing Bearer token" }
```

---

## Stripe App Deploy Checklist

```bash
cd packages/stripe-app
vercel --env-file .env.production

# Required env vars:
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_CLIENT_ID
STRIPE_CLIENT_SECRET
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
DSG_API_BASE=https://tdealer01-crypto-dsg-control-plane.vercel.app

stripe apps deploy --validate
stripe apps deploy
```
