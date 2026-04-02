# MASTER MULTI-AGENT ONE-SHOT — Repo Truth Report (2026-03-31)

## 0) Execution Mode

- Mode: **REAL PRODUCT ONLY + NO-BACK-AND-FORTH + VERIFIED DSG CORE**
- Status update date: **2026-04-02**

## 1) Current Verified Reality

### Local control-plane truth

- Runtime spine files that were previously reported as missing are now present in this repository.
- Runtime RBAC files and runtime route files are present.
- Test tree and vitest scripts are present.

## 2) Verified Formal Core

ยืนยันจาก `DSG-Deterministic-Safety-Gate` ว่า formal properties หลักยังคงเป็น:

- Determinism
- Safety invariance
- Constant-time bound

## 3) Source of Truth Map

- **Control-plane app/runtime shell**: `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
- **Formal gate core**: `tdealer01-crypto/DSG-Deterministic-Safety-Gate`
- **Runtime/app studio surface**: `tdealer01-crypto/DSG-ONE`
- **Audit dashboard surface**: `tdealer01-crypto/dsg-deterministic-audit`

## 4) Repo Classification

- **canonical**
  - `tdealer01-crypto/tdealer01-crypto-dsg-control-plane`
  - `tdealer01-crypto/DSG-Deterministic-Safety-Gate`
- **supporting**
  - `tdealer01-crypto/DSG-ONE`
  - `tdealer01-crypto/dsg-deterministic-audit`
  - `tdealer01-crypto/dsg-Legal-Governance`

## 5) Runtime PR Status (updated)

### PR-101 runtime-spine-foundation

**Status:** Resolved (files exist)

### PR-102 runtime-intent-execute

**Status:** Resolved (files exist)

### PR-103 runtime-mcp-effect-checkpoint

**Status:** Resolved (files exist)

### PR-104 runtime-rbac-governance

**Status:** Resolved (files exist)

### PR-105 runtime-tests-ops

**Status:** Resolved (tests/docs exist)

## 6) Remaining Contract/Logic Gaps (status: resolved in code, keep regression watch)

ไฟล์ไม่ missing แล้ว และ logic gaps หลักที่เคยเปิดไว้ได้รับการ implement แล้วใน codebase ปัจจุบัน:

1. Trial signup path seed `runtime_roles` สำหรับ owner defaults แล้ว
2. `/api/execute` commit path อยู่ใน RPC transaction เดียว (execution + audit + usage)
3. `/api/effect-callback` enforce org scoping ใน reconcile path แล้ว
4. `/api/core/monitor` enforce RBAC ด้วย `requireOrgRole` แล้ว
5. `.env.example` ระบุ `DSG_CORE_MODE` แล้ว
6. `usage_counters` มี uniqueness `(agent_id, billing_period)` และรองรับ upsert

Operational gap ที่ยังเจอบ่อยจริงใน production deploy คือ env/config drift:

- `NEXT_PUBLIC_SUPABASE_URL` หรือ key ที่เกี่ยวข้องไม่ครบใน Vercel
- Supabase Auth URL/Redirect ไม่ตรงกับ production hostname
- migrations ยังไม่ครบ environment ปลายทาง

## 7) Unification Plan

1. รักษา runtime commit path ให้เป็น atomic เสมอ
2. รักษา org scoping + RBAC ในทุก runtime routes
3. รักษา migration/index constraints ให้ครอบคลุม race conditions
4. รักษา docs/release gates ให้ตรงสถานะจริง

## 8) Files To Monitor

- `app/auth/confirm/route.ts`
- `app/api/execute/route.ts`
- `app/api/effect-callback/route.ts`
- `app/api/core/monitor/route.ts`
- `lib/runtime/reconcile.ts`
- `lib/runtime/permissions.ts`
- `.env.example`
- `supabase/migrations/*runtime*`
- `supabase/migrations/*usage_counters*`

## 9) Risks / Impact

- เอกสารนี้เป็น report/update ด้านสถานะและความเสี่ยง
- ความเสี่ยง go-live จริงอยู่ที่ data integrity + RBAC + org scoping + billing consistency

## 10) Hard Blockers Before Go-Live

- ต้องผ่าน production verification checklist ตาม release gate
- ต้องยืนยันว่า runtime critical routes ยัง enforce contract ครบหลัง deploy
