# Vercel Environment Variables — Setup Checklist

Set these in the Vercel Dashboard under **Project → Settings → Environment Variables**.  
Apply to: **Production**, **Preview**, and **Development** unless noted.

---

## Required for All Crons to Start

| Variable | Where to get | Required by |
|---|---|---|
| `CRON_SECRET` | Generate: `openssl rand -hex 32` | `flush-meter-outbox`, `usage-alerts`, `yield-optimizer`, `agent-orchestrator`, `agent-health-check` |

Without `CRON_SECRET` these routes return **503 fail-closed** — they will not run.

---

## Core Infrastructure

| Variable | Where to get | Required by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project → Settings → API | All DB reads/writes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project → Settings → API | Server-side DB access, crons |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project → Settings → API | Client auth |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | Billing, `flush-meter-outbox` |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Webhooks → signing secret | Webhook verification |
| `UPSTASH_REDIS_REST_URL` | Upstash Console → Database → REST URL | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console → Database → REST token | Rate limiting |
| `RESEND_API_KEY` | Resend Dashboard → API Keys | Email sends |
| `NEXT_PUBLIC_APP_URL` | `https://tdealer01-crypto-dsg-control-plane.vercel.app` | Email links, cron self-reference |

---

## Agent Crons

| Variable | Value / Source | Required by |
|---|---|---|
| `DSG_ONE_V1_URL` | `https://dsg-one-v1.vercel.app` | `agent-orchestrator`, `agent-health-check` |

Without `DSG_ONE_V1_URL` the agent crons fall back to the default URL above — set it explicitly if you run a staging deployment.

---

## Marketing / Outreach Crons

| Variable | Where to get | Required by |
|---|---|---|
| `FOUNDER_EMAIL` | Your email address | `weekly-report`, `social-listen`, `content-gen` |
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | `marketing-agent`, `content-gen` |
| `GITHUB_TOKEN` | GitHub → Settings → Developer settings → PAT (read:user, public_repo) | `github-leads` |

---

## Cron Schedule Reference

| Cron | Schedule | Calls/month | Cost tier |
|---|---|---|---|
| `flush-meter-outbox` | `0 0 * * *` | 31 | free |
| `usage-alerts` | `0 7 * * *` | 31 | free |
| `drip-emails` | `0 9 * * *` | 31 | free |
| `smart-drip` | `0 10 * * *` | 31 | free |
| `github-leads` | `0 8 * * *` | 31 | free |
| `trial-invite` | `0 11 * * *` | 31 | free |
| `social-listen` | `30 8 * * *` | 31 | free |
| `lead-outreach` | `0 9 * * *` | 31 | free |
| `lead-followup` | `0 10 * * *` | 31 | free |
| `marketing-agent` | `0 7 * * *` | 31 | free |
| `content-gen` | `0 6 * * 1` | 4–5 | free |
| `weekly-report` | `0 8 * * 1` | 4–5 | free |
| `yield-optimizer` | `0 2 * * *` | 31 | free |
| `agent-orchestrator` | `*/15 * * * *` | 2,880 | paid |
| `agent-health-check` | `0 * * * *` | 744 | paid |

Vercel Pro includes 2 crons free; additional crons cost $2/cron/month.  
`agent-orchestrator` and `agent-health-check` will each incur the $2/month charge.

---

## Setup Order

1. Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
3. Set `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
4. Set `RESEND_API_KEY`
5. Set `NEXT_PUBLIC_APP_URL`
6. **Set `CRON_SECRET`** — all crons are fail-closed until this is set
7. Set `DSG_ONE_V1_URL` (optional — defaults to production URL)
8. Set `FOUNDER_EMAIL`, `ANTHROPIC_API_KEY`, `GITHUB_TOKEN` for outreach crons

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
