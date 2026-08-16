# DSG ONE Commercial Deployment

เอกสารนี้อธิบายการเปิดบริการ DSG ONE เชิงพาณิชย์โดยแยก deployment ออกจาก production control plane เดิม ซึ่งยังคงทำหน้าที่เป็น backend หลักบน Vercel และ Supabase

## Architecture

```text
Customer -> /pricing -> Stripe Checkout
                         |
                         v
              /api/billing/webhook
                         |
                         v
        Supabase billing_subscriptions
                         |
                         v
          MCP key / entitlement / quota
                         |
                         v
              DSG control plane (Vercel)
```

## Deployment target

Commercial branch มี `Dockerfile` และ `railway.toml` พร้อมใช้งานกับ Railway หรือผู้ให้บริการ container ที่รองรับ Docker โดยแอปจะรับค่า `PORT` จากแพลตฟอร์มและใช้ `/api/health` เป็น health check

## Required secrets

ต้องใส่ค่าจริงใน secret manager ของ deployment เท่านั้น ห้าม commit secret ลง Git:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_APP_URL`, `APP_URL` | URL ของ commercial service |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/client Supabase access |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database/admin access |
| `STRIPE_SECRET_KEY` | Server-side Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Verify Stripe webhook signatures |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro monthly price ID |
| `STRIPE_PRICE_BUSINESS_MONTHLY` | Business monthly price ID |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Enterprise monthly price ID |
| `DSG_CONTROL_PLANE_BASE_URL` | Existing production control plane |
| `DSG_ALLOWED_ORIGINS` | Commercial origin allowlist |
| `NEXTAUTH_SECRET` | Session signing secret |
| `DSG_ENCRYPTION_KEY` | Server-side encryption material |
| `INTERNAL_SERVICE_TOKEN` | Internal server-to-server calls |

The complete non-secret template is `.env.commercial.example`.

## Stripe webhook

Configure the live Stripe webhook endpoint as:

```text
https://YOUR_COMMERCIAL_DOMAIN/api/billing/webhook
```

The endpoint must receive at least `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. The webhook route is idempotent and records event claims in Supabase before applying subscription changes.

## Release gates

Before accepting live payments, run the following checks:

```bash
npm ci
npm run build
npm run lint
curl -fsS https://YOUR_COMMERCIAL_DOMAIN/api/health
```

Verify the complete buyer path in Stripe test mode first: create checkout session, complete test checkout, receive webhook, confirm `billing_subscriptions`, confirm entitlement/quota, call the API/MCP endpoint, then cancel and confirm access is revoked after the subscription status changes.

## Safety rules

The commercial service must not replace or mutate the existing Vercel production control plane until the end-to-end test has passed. Stripe live keys must only be enabled after the business account, payout destination, refund policy, terms, privacy notice, and tax obligations have been reviewed by the account owner.
