# Dashboard Auto-Setup UI — DSG Control Plane

## Overview
Skill นี้ทำ auto-setup ระบบ DSG Control Plane ผ่าน Dashboard UI ทั้งหมด:
กดปุ่มเดียวใน `/dashboard/skills` → สร้าง policy, agent, execution, billing, onboarding ครบ
แล้วใช้ UI ใน dashboard สร้าง agent เพิ่ม, execute action, ดูผลลัพธ์ — ไม่ต้องใช้ curl เลย.

## Production URL
- **Production:** https://tdealer01-crypto-dsg-control-plane.vercel.app
- **Dashboard:** https://tdealer01-crypto-dsg-control-plane.vercel.app/dashboard

## Prerequisites
- Supabase env vars ตั้งครบบน Vercel (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- `DSG_CORE_MODE=internal` ตั้งบน Vercel
- Supabase migrations pushed (`supabase db push`)
- Supabase Email provider enabled + redirect URL configured
- มี user account ที่ login ได้ (ผ่าน `/signup` หรือ `/login`)

## Step 1: Login เข้า Dashboard

1. เปิด https://tdealer01-crypto-dsg-control-plane.vercel.app/login
2. ถ้ายังไม่มี account → กด **Start Free Trial** tab → ใส่ email + workspace name → กด magic link ใน email
3. ถ้ามี account แล้ว → ใส่ email → กด magic link หรือใช้ password login
4. หลัง login สำเร็จ → redirect ไป `/dashboard`

### Verify
- Dashboard โหลดได้ ไม่มี "Internal server error"
- ถ้าเห็น "Welcome to DSG Control Plane" = ยังไม่มี agent/execution (ปกติ)

## Step 2: รัน Auto-Setup ผ่าน UI

1. ไปที่ **`/dashboard/skills`** (กดแท็บ "Skills" ใน nav bar)
2. หา section **"Auto-Setup (ตั้งค่าอัตโนมัติ)"**
3. กดปุ่ม **"เริ่ม Auto-Setup"**
4. รอจนแสดงผล

### Auto-Setup ทำอะไรบ้าง (POST /api/setup/auto)
Route: `app/api/setup/auto/route.ts`

| ลำดับ | Action | ผลลัพธ์ |
|---|---|---|
| 1 | ตรวจสิทธิ์ `org_admin` | ต้อง login + มี role |
| 2 | Upsert `policy_default` | baseline DSG policy |
| 3 | สร้าง agent (หรือใช้ตัวที่มี) | `agent-xxxxxxxx` |
| 4 | สร้าง approval request | pending → commit |
| 5 | เรียก RPC `runtime_commit_execution` | seed execution แรก |
| 6 | สร้าง checkpoint | hash จาก truth + ledger |
| 7 | สร้าง trial billing subscription | 14 วัน, plan=trial |
| 8 | Bootstrap onboarding state | checklist + status |
| 9 | Upsert runtime roles | org_admin, operator, runtime_auditor, billing_admin |
| 10 | Return env check + next steps | แสดงใน UI |

### Expected UI Result
```
✅ Setup สำเร็จ
Org: org_xxx
Execution: exec_xxx

🔑 API Key (เก็บไว้ — จะไม่แสดงอีก)
dsg_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

Steps:
  policy: OK
  agent: CREATED (agent-xxxxxxxx)
  rpc_commit: OK (execution=...)
  checkpoint: OK
  billing: CREATED (trial)
  onboarding: OK
  runtime_roles: OK

Env Check:
  DSG_CORE_MODE: internal ✅
  NEXT_PUBLIC_SUPABASE_URL: ✅
  SUPABASE_SERVICE_ROLE_KEY: ✅
  STRIPE_SECRET_KEY: ❌ NOT SET
  STRIPE_WEBHOOK_SECRET: ❌ NOT SET
```

### สำคัญ: เก็บ API Key
- API key แสดง **ครั้งเดียว** — copy เก็บไว้ทันที
- ใช้สำหรับ execute action ผ่าน API ภายหลัง
- ถ้าหาย ต้องสร้าง agent ใหม่

### Troubleshooting Auto-Setup

| Error | สาเหตุ | แก้ไข |
|---|---|---|
| `Setup failed (401)` | ไม่ได้ login หรือ role ไม่ใช่ org_admin | Login ใหม่ |
| `Setup failed (500)` | env vars ขาด หรือ migrations ยังไม่ push | ตรวจ env + `supabase db push` |
| `rpc_commit: FAIL` | `runtime_commit_execution` RPC ไม่มี | `supabase db push` |
| `policy: FAIL` | `policies` table ไม่มี | `supabase db push` |
| `billing: FAIL` | `billing_subscriptions` table ไม่มี | `supabase db push` |

## Step 3: ตรวจสอบ Dashboard หลัง Auto-Setup

กลับไปที่ **`/dashboard`** (กดแท็บ "Dashboard")

### ต้องเห็น:
- **Agents: 1** (หรือมากกว่า)
- **Executions: 1** (หรือมากกว่า)
- **Plan: Trial (monthly)** (หรือ plan ที่ตั้ง)
- **DSG Core: Offline** (ปกติ — internal mode ไม่มี remote core)
- **Latest Agents** section แสดง agent ที่สร้าง
- **Latest Executions** section แสดง execution ที่ seed
- **Billing Snapshot** แสดง trial subscription

### ถ้ายังเห็น 0 ทุกช่อง:
- Refresh หน้า (Ctrl+R)
- ตรวจว่า Auto-Setup แสดง "✅ Setup สำเร็จ" จริง
- ตรวจ browser console ว่ามี 401/500 error จาก API หรือไม่

## Step 4: สร้าง Agent เพิ่มผ่าน UI

1. ไปที่ **`/dashboard/agents`** (กดแท็บ "Agents")
2. หา section **"Create agent"**
3. กรอก:
   - **Agent name:** ชื่อ agent (2-80 ตัวอักษร) เช่น `my-trading-bot`
   - **Monthly limit:** จำนวน execution ต่อเดือน (default: 10000)
   - **Policy ID:** (optional) ถ้าว่าง = ใช้ `policy_default`
4. กด **"Create Agent"**
5. **เก็บ API key ที่แสดง** — แสดงครั้งเดียว

### API Route ที่ใช้
- `POST /api/agents` → `app/api/agents/route.ts` line 123-213
- สร้าง agent ID format: `agt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- API key format: `dsg_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Hash ด้วย SHA-256 เก็บใน `api_key_hash` column

### Agent Management
- **Edit:** กดปุ่ม "Edit" → แก้ชื่อ, limit, policy, status → กด "Save"
- **Disable:** กดปุ่ม "Disable" → agent จะไม่รับ API calls อีก
- **Pagination:** 10 agents ต่อหน้า, กด Previous/Next

## Step 5: Execute Action ผ่าน Command Center UI

1. ไปที่ **`/dashboard/command-center`** (กดแท็บ "Command Center")
2. หา section **"Chat / Agent Console"**
3. พิมพ์คำสั่งใน textarea เช่น:
   - `check readiness and capacity`
   - `run auto_setup`
   - `execute test action`
4. กด **"Submit"**
5. ดูผลใน **"Command Output"** section

### Command Center แสดงอะไร
- **Overall:** Ready / Degraded / Checking
- **Core Status:** Online / Offline
- **Executions:** จำนวน execution ใน billing period
- **Period:** billing period ปัจจุบัน
- **Quota Remaining:** execution ที่เหลือ
- **Utilization:** % ของ quota ที่ใช้ไป
- **Plan:** trial / pro / business / enterprise
- **Audit events:** ล่าสุด 8 รายการ (ว่างใน internal mode)

## Step 6: Execute Action ผ่าน API (ใช้ API Key จาก Step 2/4)

ถ้าต้องการ execute ผ่าน API ตรง (ไม่ผ่าน UI):

> **หมายเหตุ:** `/api/execute` ต้องการ auth 2 ชั้น:
> 1. **Session cookie** — ได้จาก login ผ่าน browser (Supabase auth)
> 2. **Bearer API key** — ได้จาก Step 2 หรือ Step 4
>
> วิธีง่ายที่สุด: ใช้ **Command Center** ใน Step 5 แทน curl
> ถ้าต้องใช้ curl จริง ให้ copy session cookie จาก browser DevTools (Application → Cookies)

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_KEY_FROM_STEP_2_OR_4>" \
  -H "Cookie: sb-access-token=<SESSION_TOKEN>; sb-refresh-token=<REFRESH_TOKEN>" \
  -d '{
    "agent_id": "<AGENT_ID>",
    "action": "test-action",
    "context": { "risk_score": 0.3 },
    "input": { "amount": 100, "asset": "BTC" }
  }'
```

หรือใช้ `intent` wrapper:
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_KEY_FROM_STEP_2_OR_4>" \
  -H "Cookie: sb-access-token=<SESSION_TOKEN>; sb-refresh-token=<REFRESH_TOKEN>" \
  -d '{
    "agent_id": "<AGENT_ID>",
    "intent": {
      "action": "test-action",
      "context": { "risk_score": 0.3 },
      "input": { "amount": 100, "asset": "BTC" }
    }
  }'
```

### Execute Route Chain
```
POST /api/execute
  → re-exports POST from /api/spine/execute/route.ts
    → executeSpineIntent() in lib/spine/engine.ts
      → resolveGate() → risk-gate plugin (internal mode)
        → evaluateGate() in lib/runtime/gate.ts
          → decision: ALLOW / STABILIZE / BLOCK
      → runtime_commit_execution RPC
        → insert execution + ledger + truth_state + usage_counter
```

### Expected Response
```json
{
  "request_id": "exec_...",
  "decision": "ALLOW",
  "reason": "Risk score 0.30 below stabilize threshold 0.40",
  "latency_ms": 42,
  "policy_version": "v1",
  "replayed": false,
  "ledger_sequence": 1,
  "truth_sequence": 1,
  "proof": { ... },
  "authoritative_plugin_id": "internal-risk-gate",
  "pipeline_trace": [ ... ]
}
```

## Step 7: ดูผลลัพธ์ใน Executions Page

1. ไปที่ **`/dashboard/executions`** (กดแท็บ "Executions")
2. ต้องเห็น:
   - **Control-plane rows:** จำนวน execution ที่ทำ
   - **Control-plane Executions** section แสดงรายการ execution พร้อม decision, latency, reason
3. **Core warning:** "ledger endpoint is unavailable in internal DSG core mode" — ปกติ ไม่ใช่ error
4. **Core total / Core allow / Core block:** จะเป็น 0 ใน internal mode (ปกติ)

## Step 8: ตรวจสอบหน้าอื่นๆ

### `/dashboard/capacity`
- แสดง quota, utilization, projected billing
- ต้องเห็น plan = Trial, included = 1,000 executions

### `/dashboard/billing`
- แสดง trial subscription
- Period: 14 วันจากวันที่รัน auto-setup
- Status: trialing

### `/dashboard/policies`
- แสดง `policy_default` ที่ auto-setup สร้าง
- Config: `block_risk_score: 0.8`, `stabilize_risk_score: 0.4`

### `/dashboard/operations`
- แสดง executions + proofs (partial-load)
- ถ้า endpoint ใดล้ม จะแสดง partial error ไม่ใช่ทั้งหน้าพัง

### `/dashboard/integration`
- แสดง DSG Core health + verified formal core info
- Deterministic value แสดงแบบ type-safe (ไม่ใช้ `as any`)

### หน้าที่ต้องใช้ remote mode (จะว่างใน internal mode)
- `/dashboard/ledger` — ต้อง `DSG_CORE_MODE=remote`
- `/dashboard/audit` — ต้อง `DSG_CORE_MODE=remote`
- `/dashboard/proofs` — ต้อง `DSG_CORE_MODE=remote`

## Quick Reference: Dashboard Nav → API → File

| Nav Tab | URL | API Route | Source File |
|---|---|---|---|
| Dashboard | `/dashboard` | agents, executions, usage, health, audit | `app/dashboard/page.tsx` |
| Command Center | `/dashboard/command-center` | health, capacity, usage, audit, agent-chat | `app/dashboard/command-center/page.tsx` |
| Agents | `/dashboard/agents` | `GET/POST /api/agents` | `app/dashboard/agents/page.tsx` |
| Executions | `/dashboard/executions` | `GET /api/executions` | `app/dashboard/executions/page.tsx` |
| Skills | `/dashboard/skills` | `POST /api/setup/auto` | `app/dashboard/skills/page.tsx` |
| Capacity | `/dashboard/capacity` | `GET /api/capacity` | `app/dashboard/capacity/page.tsx` |
| Billing | `/dashboard/billing` | `GET /api/usage` | `app/dashboard/billing/page.tsx` |
| Policies | `/dashboard/policies` | `GET/POST /api/policies` | `app/dashboard/policies/page.tsx` |
| Operations | `/dashboard/operations` | executions, proofs | `app/dashboard/operations/page.tsx` |
| Integration | `/dashboard/integration` | health | `app/dashboard/integration/page.tsx` |

## Key Files Reference

| ไฟล์ | หน้าที่ |
|---|---|
| `app/api/setup/auto/route.ts` | Auto-setup API (212 lines) — สร้างทุกอย่างในครั้งเดียว |
| `app/dashboard/skills/page.tsx` | Skills page + ปุ่ม Auto-Setup + tool registry |
| `app/dashboard/agents/page.tsx` | Agent CRUD UI (create, edit, disable, pagination) |
| `app/dashboard/page.tsx` | Dashboard overview (partial-load, normalizers) |
| `app/dashboard/command-center/page.tsx` | Command Center (chat, monitor, audit) |
| `app/dashboard/executions/page.tsx` | Executions list + core ledger + metrics |
| `app/api/agents/route.ts` | Agent API (GET list, POST create) |
| `app/api/execute/route.ts` | Execute entry point → spine/execute |
| `lib/spine/engine.ts` | Spine engine (executeSpineIntent) |
| `lib/gate/registry.ts` | Gate plugin registry (resolveGate) |
| `lib/runtime/gate.ts` | Risk gate evaluation (evaluateGate) |
| `app/api/agent-chat/route.ts` | Agent chat SSE endpoint |
| `lib/agent/tools.ts` | Agent tool registry (13 tools incl. auto_setup) |

## Checklist รวม

```
☐ Step 1: Login เข้า dashboard สำเร็จ
☐ Step 2: กด Auto-Setup → เห็น "✅ Setup สำเร็จ"
☐ Step 2: เก็บ API key ไว้แล้ว
☐ Step 3: Dashboard แสดง Agents ≥ 1, Executions ≥ 1
☐ Step 4: สร้าง agent เพิ่มผ่าน /dashboard/agents (optional)
☐ Step 5: ใช้ Command Center chat ได้
☐ Step 6: Execute action ผ่าน API ได้ (optional)
☐ Step 7: /dashboard/executions แสดง execution rows
☐ Step 8: Capacity, Billing, Policies แสดงข้อมูลถูกต้อง
```

---

*Skill file: `.agents/skills/dashboard-auto-setup-ui/SKILL.md`*
*Ref: app/api/setup/auto/route.ts, app/dashboard/skills/page.tsx, app/dashboard/agents/page.tsx*
