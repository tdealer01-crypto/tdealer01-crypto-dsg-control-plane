# Track A — Activation Status (2026-07-03)

สถานะการ activate ระบบรายได้ ตรวจจากหลักฐานจริง (Vercel/Stripe MCP + git + CI) ทุกบรรทัด tag ตามนโยบาย evidence-first

## สรุปสถานะ

| ข้อ | งาน | สถานะ | หลักฐาน |
|---|---|---|---|
| A1 | Cron รายได้ 4 ตัว (github-leads, marketing-agent, lead-followup, weekly-report) | ✅ done (code) | vercel.json รวม 7 crons; ทุก route fail-closed ผ่าน `requireCronAuth` |
| A1 | Outreach human-in-the-loop gate | ✅ done (code) | `MARKETING_OUTREACH_MODE` default `queue`; คิว `outreach_approvals`; approve route; 6 unit tests |
| A2 | Pricing single source of truth | ✅ done | `lib/billing/pricing-catalog.ts`; checkout + 2 pricing routes import จาก catalog; 107 billing tests ผ่านไม่แก้ |
| A3 | Webhook reconciliation | ✅ decided | `/api/billing/webhook` = canonical; `/api/stripe/webhook` ติด `@deprecated` (ไม่ลบ); รายชื่อ endpoint จริงใน Stripe Dashboard = `not verified` (MCP ไม่มี operation) — ผู้ใช้ต้องเช็ค |
| A4 | GitHub Marketplace fulfillment | ✅ มีอยู่แล้วใน PR #844 | migration `marketplace_account_links` applied ถึง live DB แล้ว; ต้อง update branch หลัง #848 merge แล้วผู้ใช้ merge |
| A5 | Env checklist | 📋 ด้านล่าง | Vercel MCP ไม่มี tool อ่านชื่อ env → `not verified` ทั้งชุด |
| — | "Promote deployment" | ✅ แก้ตัวเอง | production เคย pin ที่ #843 เพราะ #845/#846 ทำ build พัง; #848 (merged) แก้แล้ว → deploy จาก main ควร READY (ต้อง verify หลัง deploy) |
| — | "Z3 API broken (Node 24, no buildCommand)" | ❌ ข้อกล่าวหาไม่ตรงหลักฐาน | `z3-solver-api/vercel.json` มี installCommand+buildCommand และ pin `nodejs20.x` ครบ (`verified fact`) — ไม่มีอะไรต้องแก้ในไฟล์; สถานะ deploy จริงของ project แยกนั้น = `not verified` |

## Env vars ที่ production ต้องมี (ชื่อเท่านั้น — ห้ามใส่ค่าในเอกสาร/แชต)

Billing/Stripe:
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_PRO_YEARLY`, `STRIPE_PRICE_BUSINESS_MONTHLY`, `STRIPE_PRICE_BUSINESS_YEARLY`, `STRIPE_PRICE_ENTERPRISE_MONTHLY`, `STRIPE_PRICE_ENTERPRISE_YEARLY` (มี fallback hardcoded price IDs ของ acct_1Tnbl5CVpjxFKlKT อยู่ใน catalog — env มาก่อนเสมอ)
- `STRIPE_METER_EVENT_NAME`, `STRIPE_METER_ID` (metered billing + reconcile)

Cron/Agent:
- `CRON_SECRET` (ทุก cron fail closed ถ้าไม่มี)
- `ANTHROPIC_API_KEY` (marketing-agent loop + content)
- `RESEND_API_KEY` (ส่งอีเมล — no-op ถ้าไม่มี)
- `GITHUB_TOKEN` (github-leads scraper)
- `MARKETING_OUTREACH_MODE` = `queue` (แนะนำเริ่มต้น) | `auto` | `off`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (แจ้งเตือน founder)

Core:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

สถานะ: **not verified** — Vercel MCP ในเซสชันนี้ไม่มี tool อ่านรายชื่อ env; ตรวจใน Vercel Dashboard → Settings → Environment Variables

## ⚠️ สองบัญชี Stripe — อย่าสับสน

| บัญชี | ชื่อ | ใช้กับ |
|---|---|---|
| `acct_1Tnbl5CVpjxFKlKT` | dsg-one, Inc. | **บัญชีที่ระบบ billing ใช้จริง** (DEFAULT_PRICE_IDS, MCP session นี้) |
| `acct_1Tft0OAZNzhgTUPV` | DSG Governance Gate | บัญชีในอีเมล **Stripe Startups credit ฿500,586** — activate credit ต้องทำในบัญชีนี้ |

ถ้าต้องการให้ credit ช่วยลดค่าธรรมเนียมของระบบ billing ปัจจุบัน ต้องยืนยันว่า credit ผูกกับบัญชีไหน/ย้ายได้ไหมกับ Stripe โดยตรง — `blocked (founder action)`

## การตัดสินใจ webhook (A3)

- Canonical: `POST /api/billing/webhook` — signature-verified, idempotent (`billing_events`), เขียน `billing_customers`/`billing_subscriptions`, เรียก `fulfillSubscription`/`revokeSubscription`, ส่งอีเมล trial/upgrade, นับ referral
- Deprecated (คงไว้ ไม่ลบ): `POST /api/stripe/webhook` — เขียนแค่ `release_gate_entitlements` hardcode plan='pro'
- **ผู้ใช้ต้องเช็ค Stripe Dashboard → Developers → Webhooks:** ควรมี endpoint เดียวชี้ `https://<prod>/api/billing/webhook`; ถ้ามีตัวที่ชี้ `/api/stripe/webhook` ให้ปิด/ลบ

## สิ่งที่ agent ทำไม่ได้ — ผู้ใช้ต้องทำ (เรียงตามลำดับ)

1. ✅ ~~Merge PR #848~~ — ทำแล้ว (merged 2026-07-03)
2. ตั้ง env vars ตามรายการข้างบนใน Vercel (production)
3. Apply migration `supabase/migrations/20260703150000_outreach_approvals.sql` ไป live DB (หรือสั่ง agent ทำผ่าน Supabase MCP)
4. เช็ค/แก้ Stripe webhook endpoint ให้ชี้ `/api/billing/webhook`
5. Merge Track A PR (PR ใหม่จาก branch นี้) → cron 4 ตัวเริ่มทำงานรอบถัดไป
6. Update + merge PR #844 (GitHub Marketplace fulfillment)
7. Activate Stripe Startups credit ในบัญชี `acct_1Tft0OAZNzhgTUPV` (stripe.com — Dashboard → Startups)
8. หลัง deploy: ตรวจ `GET /api/agent/status` = commit ใหม่, ยิง cron แต่ละตัว 1 ครั้งด้วย `Authorization: Bearer $CRON_SECRET` แล้วดู `marketing_agent_runs`/logs

## Safety switches (ไม่ต้อง deploy ใหม่)

- `MARKETING_OUTREACH_MODE=off` → หยุดอีเมลขาออกทั้งหมดทันที
- ลบ cron ออกจาก vercel.json + deploy → หยุด scheduler (ต้อง deploy)
- `CRON_SECRET` หมุนใหม่ → cron เดิมที่ไม่มี secret ใหม่จะ 401/503

## Claim boundary

- Claim ได้: crons `registered`, outreach gate `setup-ready` (default queue), pricing catalog `verified fact` (107+7 tests), webhook decision `recorded`
- Claim ไม่ได้: live revenue, อีเมลถูกส่งจริง, cron ทำงานบน production — จนกว่า env + deploy + หลักฐานรันจริงครบ; UNSUPPORTED ≠ PASS
