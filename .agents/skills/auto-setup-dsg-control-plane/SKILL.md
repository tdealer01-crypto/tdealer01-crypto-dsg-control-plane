# Auto-Setup DSG Control Plane — Full Infrastructure

## Overview
Skill นี้ทำ auto-setup ระบบ DSG Control Plane ครบ end-to-end:
ตั้ง env vars บน Vercel, push Supabase migrations, deploy production,
และเรียก POST /api/setup/auto เพื่อ seed ข้อมูลเริ่มต้นทั้งหมด.

## Production URL
- **Production:** https://tdealer01-crypto-dsg-control-plane.vercel.app
- **Vercel Org:** `team_n189mlAdVHR6cGGiaAwsKzQ0`
- **Vercel Project:** `prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW`

## Prerequisites
- Vercel CLI installed (`npm i -g vercel`)
- Supabase CLI installed (`npm i -g supabase`)
- Vercel account linked to this project
- Supabase project created at https://supabase.com/dashboard

## Devin Secrets Needed
- `SUPABASE_URL` — Supabase project URL (e.g. `https://xxx.supabase.co`)
- `SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (admin)
- `SUPABASE_PROJECT_REF` — Supabase project ref (from URL: `app.supabase.com/project/<ref>`)
- `STRIPE_SECRET_KEY` — Stripe secret key (optional, for billing)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook secret (optional, for billing)
- `VERCEL_TOKEN` — Vercel API token (optional, for non-interactive CLI)

## Step 1: Install CLI Tools

```bash
npm i -g vercel@latest supabase@latest
vercel --version
supabase --version
```

## Step 2: Set Vercel Environment Variables

### 2A: Critical vars (ต้องมี — ไม่มี = ระบบพัง)

```bash
export VERCEL_ORG_ID="team_n189mlAdVHR6cGGiaAwsKzQ0"
export VERCEL_PROJECT_ID="prj_k02PTNzCJRBN5CcRtg6hFdd0HjuW"

# Supabase credentials — ค่าจาก Supabase Dashboard → Settings → API
printf '%s' "$SUPABASE_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --force
printf '%s' "$SUPABASE_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --force
printf '%s' "$SUPABASE_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY production --force

# App URL
printf '%s' "https://tdealer01-crypto-dsg-control-plane.vercel.app" | vercel env add APP_URL production --force
printf '%s' "https://tdealer01-crypto-dsg-control-plane.vercel.app" | vercel env add NEXT_PUBLIC_APP_URL production --force

# DSG Core mode — ต้องตั้ง ไม่งั้น parseMode() throw error
printf '%s' "internal" | vercel env add DSG_CORE_MODE production --force
```

### 2B: Runtime defaults (รันสคริปต์ที่มีอยู่)

```bash
bash scripts/auto-setup-env.sh
```

สคริปต์นี้ตั้ง: `DSG_CORE_MODE=internal`, `DSG_DEFAULT_POLICY_ID=policy_default`,
`OVERAGE_RATE_USD=0.001`, `ACCESS_MODE=strict`, `ACCESS_POLICY=strict`,
`ENABLE_DEMO_BOOTSTRAP=false`

### 2C: Stripe price IDs (ถ้าจะใช้ billing)

```bash
bash set-vercel-stripe-env.sh
```

Price IDs ที่ตั้ง:
- `STRIPE_PRODUCT_ID=prod_UBEqTBITqc9uG9`
- `STRIPE_PRICE_PRO_MONTHLY=price_1TCsZBKCAFwxVQo9hhfjuC9j`
- `STRIPE_PRICE_PRO_YEARLY=price_1TE50jKCAFwxVQo9QhmIQVqP`
- `STRIPE_PRICE_BUSINESS_MONTHLY=price_1TCsZXKCAFwxVQo9sbBSzPWQ`
- `STRIPE_PRICE_BUSINESS_YEARLY=price_1TE51LKCAFwxVQo9vrWiywkR`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY=price_1TE51tKCAFwxVQo9Lfdlj5ok`
- `STRIPE_PRICE_ENTERPRISE_YEARLY=price_1TE528KCAFwxVQo9pcDbQ5Hx`

### 2D: Stripe secrets (ถ้ามี — ต้องตั้งเอง)

```bash
# ถ้ามี STRIPE_SECRET_KEY
printf '%s' "$STRIPE_SECRET_KEY" | vercel env add STRIPE_SECRET_KEY production --force

# ถ้ามี STRIPE_WEBHOOK_SECRET
printf '%s' "$STRIPE_WEBHOOK_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production --force
```

### 2E: Legacy var cleanup + remap (รันสคริปต์ที่มีอยู่)

```bash
bash set-vercel-runtime-env.sh
```

สคริปต์นี้ remap legacy vars เช่น `dsgone_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
และลบ vars เก่าที่ไม่ใช้แล้ว.

### 2F: Verify env vars

```bash
vercel env ls production
```

ต้องเห็นอย่างน้อย:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `DSG_CORE_MODE`

## Step 3: Push Supabase Migrations

```bash
supabase login
supabase link --project-ref "$SUPABASE_PROJECT_REF"
supabase db push
```

14 migration files จะถูก apply ตามลำดับ:
1. `20260323053000_product_loop_scaffold.sql` — base tables
2. `20260323054500_product_loop_rls.sql` — RLS policies
3. `20260323110000_billing_checkout_flow.sql` — billing tables
4. `20260323140000_schema_constraints_hardening.sql` — constraints
5. `20260323141000_rls_policy_hardening.sql` — RLS hardening + helper functions
6. `20260330_monitor_stats.sql` — monitor stats
7. `20260331_runtime_spine.sql` — runtime spine tables
8. `20260331_runtime_spine_rpc.sql` — runtime spine RPC
9. `20260401093000_batch3_enterprise_identity_rollout.sql` — enterprise identity
10. `20260401120000_enterprise_access_batch2.sql` — enterprise access
11. `20260401_runtime_rbac.sql` — runtime RBAC
12. `20260401_schema_policies_table.sql` — policies table
13. `20260402_billing_quota_in_rpc.sql` — billing quota in RPC
14. `20260404_runtime_spine_rpc_hardening.sql` — spine RPC hardening (runtime_commit_execution)

## Step 4: Configure Supabase Auth (Manual — ทำใน Dashboard)

ไปที่ Supabase Dashboard:

1. **Authentication → Providers → Email** → Enable
2. **Authentication → URL Configuration**
   - Site URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
   - Redirect URLs: เพิ่ม `https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/confirm`

## Step 5: Deploy to Vercel

```bash
vercel --prod
```

รอ deploy เสร็จ แล้วเช็ค:

```bash
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
```

Expected: `{"ok":true,"service":"dsg-control-plane",...}`

## Step 6: Create First User

1. เปิด https://tdealer01-crypto-dsg-control-plane.vercel.app/login
2. กด **Start Free Trial** tab
3. ใส่ email: `t.dealer01@dsg.pics` (หรือ email ที่ต้องการ)
4. ใส่ Workspace name: `DSG Ops`
5. กด **Start free trial**
6. เช็ค email → กด magic link → login สำเร็จ

## Step 7: Run Auto-Setup (หลัง login แล้ว)

### Option A: กดปุ่มใน Dashboard
เปิดหน้า `/dashboard/skills` → กดปุ่ม **"เริ่ม Auto-Setup"**

### Option B: เรียก API ตรง
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/setup/auto \
  -H 'Cookie: <session_cookie_from_browser>'
```

### Option C: ผ่าน Agent Chat
```bash
curl -N https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent-chat \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <session_cookie>' \
  --data '{"message":"run auto_setup"}'
```

### Auto-Setup ทำอะไรบ้าง (POST /api/setup/auto)
1. ตรวจสิทธิ์ `org_admin`
2. Upsert `policy_default` (baseline DSG policy)
3. สร้าง agent ใหม่ (หรือใช้ตัวที่มี)
4. สร้าง approval request
5. เรียก RPC `runtime_commit_execution` — seed execution แรก
6. สร้าง checkpoint
7. สร้าง trial billing subscription
8. Bootstrap onboarding state
9. Upsert runtime roles (org_admin, operator, runtime_auditor, billing_admin)
10. Return env check + next steps + API key (ถ้าสร้าง agent ใหม่)

### Expected Response
```json
{
  "org_id": "...",
  "steps": [
    "policy: OK",
    "agent: CREATED (agent-xxxxxxxx)",
    "rpc_commit: OK (execution=...)",
    "checkpoint: OK",
    "billing: CREATED (trial)",
    "onboarding: OK",
    "runtime_roles: OK"
  ],
  "env_check": {
    "DSG_CORE_MODE": "internal",
    "NEXT_PUBLIC_SUPABASE_URL": "✅",
    "SUPABASE_SERVICE_ROLE_KEY": "✅",
    "STRIPE_SECRET_KEY": "❌ NOT SET",
    "STRIPE_WEBHOOK_SECRET": "❌ NOT SET"
  },
  "api_key": "dsg_...",
  "api_key_warning": "⚠️ เก็บ key นี้ไว้ — จะไม่แสดงอีก",
  "ok": true,
  "next_steps": ["ตั้ง STRIPE_SECRET_KEY บน Vercel (ถ้าจะใช้ billing)"]
}
```

## Step 8: Verify Everything Works

```bash
# Health check
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Core monitor
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/core/monitor

# Executions (ต้อง auth)
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/executions \
  -H 'Cookie: <session_cookie>'

# Usage (ต้อง auth)
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/usage \
  -H 'Cookie: <session_cookie>'
```

Dashboard pages ที่ต้องโหลดได้:
- `/dashboard` — overview with execution count > 0
- `/dashboard/agents` — แสดง agent ที่สร้างจาก auto-setup
- `/dashboard/executions` — แสดง execution ที่ seed
- `/dashboard/billing` — แสดง trial subscription
- `/dashboard/skills` — แสดง 11 tools + Auto-Setup result

## Stripe Webhook Setup (Optional — ถ้าจะใช้ billing จริง)

1. ไปที่ Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/billing/webhook`
3. Events to listen:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy webhook signing secret → ตั้งเป็น `STRIPE_WEBHOOK_SECRET` บน Vercel
5. Redeploy: `vercel --prod`

## Troubleshooting

| Error | สาเหตุ | แก้ไข |
|---|---|---|
| `DSG_CORE_MODE must be explicitly set` | ไม่ได้ตั้ง `DSG_CORE_MODE` | `printf 'internal' \| vercel env add DSG_CORE_MODE production --force` |
| `Missing Supabase server environment variables` | ไม่มี `NEXT_PUBLIC_SUPABASE_URL` หรือ `SUPABASE_SERVICE_ROLE_KEY` | ตั้ง env vars ใน Step 2A |
| `Missing STRIPE_WEBHOOK_SECRET` (500) | webhook route ไม่มี secret | ตั้ง `STRIPE_WEBHOOK_SECRET` หรือข้ามถ้าไม่ใช้ billing |
| `send-failed` (magic link) | Supabase Email provider ปิดอยู่ | เปิดใน Supabase Dashboard → Auth → Providers → Email |
| `invalid-link` (magic link) | Redirect URL ไม่ตรง | ตั้ง Redirect URL ใน Supabase Auth → URL Configuration |
| `missing-workspace` | ใช้ Login tab แทน Start Free Trial | สลับไปแท็บ Start Free Trial |
| `Hobby accounts are limited to daily cron` | Vercel Hobby plan | ใช้ daily cron schedule ใน `vercel.json` (ค่า default ถูกแล้ว) |
| `Build Canceled — unverified commit` | Vercel Git verification | ใช้ `vercel --prod` deploy ตรง หรือปิด Require Verified Commits |
| Auto-Setup returns `rpc_commit: FAIL` | Migrations ยังไม่ push | รัน `supabase db push` ก่อน |
| Auto-Setup returns 401 | ไม่มี session หรือ role ไม่ใช่ org_admin | Login ก่อน แล้วใช้ session cookie |
| Dashboard shows "Internal server error" | env vars ขาด | ตรวจ `vercel env ls production` แล้วเติมที่ขาด |
| "ledger endpoint is unavailable" | `DSG_CORE_MODE=internal` | ปกติ — internal mode ไม่มี ledger, ใช้ remote mode ถ้าต้องการ |

## Quick One-Liner (Termux / Mobile)

ถ้าอยู่บน Termux สามารถรันสคริปต์ all-in-one ได้:

```bash
bash scripts/termux-deploy-all-in-one.sh
```

สคริปต์นี้ทำ Step 1-5 ให้อัตโนมัติ (ถาม credentials แบบ interactive).

## Key Files Reference

| ไฟล์ | หน้าที่ |
|---|---|
| `app/api/setup/auto/route.ts` | Auto-setup API route (212 lines) |
| `app/dashboard/skills/page.tsx` | Skills page + Auto-Setup button |
| `lib/agent/tools.ts` | Agent tool registry (includes `auto_setup`) |
| `scripts/auto-setup-env.sh` | Set default env vars on Vercel |
| `set-vercel-runtime-env.sh` | Remap legacy env vars + set defaults |
| `set-vercel-stripe-env.sh` | Set Stripe price IDs on Vercel |
| `scripts/termux-deploy-all-in-one.sh` | All-in-one deploy for Termux |
| `docs/OPERATOR_SETUP_CHECKLIST.md` | Manual setup checklist |
| `docs/RUNBOOK_DEPLOY.md` | Full deploy runbook |
| `.env.example` | Env var template (43 vars) |
| `supabase/schema.sql` | Base schema |
| `supabase/migrations/` | 14 migration files |

## Lint & Typecheck

```bash
npm run lint
npm run typecheck
```

## Running Tests

```bash
npm test
```

85 tests (41 unit, 35 integration, 4 failure, 5 migrations) — all pass.
Note: tests use vi.doMock() and do NOT test real infrastructure.
For real DB testing, use SQL scripts in `supabase/tests/`.
