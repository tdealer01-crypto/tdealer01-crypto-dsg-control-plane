# Vercel Environment Variables — Setup Checklist

Set these in the Vercel Dashboard under **Project → Settings → Environment Variables**.  
Apply to: **Production**, **Preview**, and **Development** unless noted.

---

## Required Now (4 active crons)

| Variable | Where to get | Required by |
|---|---|---|
| `CRON_SECRET` | `openssl rand -hex 32` | ทุก cron — ขาดแล้ว return 503 fail-closed |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project → Settings → API | All DB reads/writes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project → Settings → API | Server-side DB, crons |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project → Settings → API | Client auth |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys | Billing, `flush-meter-outbox` |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → signing secret | Webhook verification |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → Database → REST URL | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Database → REST token | Rate limiting |
| `RESEND_API_KEY` | Resend Dashboard → API Keys | Magic-link OTP, email sends |
| `NEXT_PUBLIC_APP_URL` | `https://tdealer01-crypto-dsg-control-plane.vercel.app` | Email links, `usage-alerts` |
| `DSG_ONE_V1_URL` | `https://dsg-one-v1.vercel.app` | `agent-orchestrator`, `agent-health-check` |

---

## When Outreach Crons Are Re-activated

เพิ่มกลับใน `vercel.json` แล้วค่อยเซต:

| Variable | Where to get | Required by |
|---|---|---|
| `FOUNDER_EMAIL` | Your email address | `weekly-report`, `social-listen`, `content-gen` |
| `RESEND_API_KEY` | *(already set above)* | `drip-emails`, `lead-outreach`, `lead-followup`, `trial-invite` |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | `marketing-agent`, `content-gen` |
| `GITHUB_TOKEN` | GitHub → Settings → PAT (read:user, public_repo) | `github-leads`, `social-listen` |

---

## Cron Schedule Reference

| Cron | Schedule | Calls/month | Notes |
|---|---|---|---|
| `flush-meter-outbox` | `0 0 * * *` | 31 | billing critical |
| `usage-alerts` | `0 7 * * *` | 31 | monitoring |
| `agent-orchestrator` | `*/15 * * * *` | 2,880 | agent dispatch |
| `agent-health-check` | `0 * * * *` | 744 | infra health |

Vercel Pro includes 2 crons free; additional crons cost $2/cron/month.  
**Active cost: 2 extra crons x $2 = $4/month.**

> Outreach crons (`drip-emails`, `marketing-agent`, `github-leads`, etc.) have been removed from active rotation.  
> Routes still exist under `app/api/cron/` — re-add to `vercel.json` when ready to activate.

---

## Setup Order

1. Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
4. Set `RESEND_API_KEY`
5. Set `NEXT_PUBLIC_APP_URL`
6. **Set `CRON_SECRET`** — all crons are fail-closed until this is set
7. Set `DSG_ONE_V1_URL` (optional — defaults to production URL)

## Verify

After deploying, smoke-test:

```bash
# Should return 200 + status=ready
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness

# Should return rateLimiter.ok: true
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Trigger agent-health-check manually (replace YOUR_SECRET)
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/cron/agent-health-check \
  -H "Authorization: Bearer YOUR_SECRET"
```
