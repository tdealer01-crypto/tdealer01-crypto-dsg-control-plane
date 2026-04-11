# Production Cutover in 2 Rounds (Marketplace + Enterprise Ready)

Date: 2026-04-11
Owner: Control Plane Team

## Executive decision (ตรงๆ)

- **ได้**: ทำให้พร้อม Marketplace/Enterprise ได้ โดยล็อกงานเหลือ **2 รอบจริง** เท่านั้น
- **ไม่ได้**: ถ้ายังเพิ่ม mock/memory/localStorage/demo-route ใหม่ จะวนไม่จบ

---

## Stop list (มีผลทันที)

ห้ามเพิ่มงานใหม่ประเภทต่อไปนี้:

1. mock route ใหม่
2. server-memory store ใหม่
3. localStorage persistence ใหม่
4. demo-only workflow/action/page ใหม่

เกณฑ์รับงานใหม่มีข้อเดียว: **ชิ้นนี้อยู่ถึง production หรือไม่**

---

## Round 1 — Production Cutover (ใหญ่สุด, ต้องทำก่อน)

เป้าหมาย: ตัดจาก demo persistence ไปเป็น DB-backed production flow ทั้งเส้น

### R1.1 Data + schema hardening

- finalize schema/workflow tables ให้รองรับ submit/approve/reject/escalate
- เพิ่ม index/constraints ที่จำเป็นกับ org-scoped workloads
- migration ต้อง idempotent และ rollback-aware

**Primary paths**
- `supabase/schema.sql`
- `supabase/migrations/*`

### R1.2 Repository layer + org scope

- ทุก write/read ผ่าน repository layer เดียว
- enforce org scoping + RBAC ที่ server side ทุก endpoint
- ตัด logic ที่พึ่ง browser state เป็น source-of-truth

**Primary paths**
- `lib/auth/*`
- `lib/runtime/*`
- `lib/spine/*`
- `lib/gate/*`

### R1.3 Action routes write DB จริง

- submit / approve / reject / escalate ต้องเขียน DB + audit trail
- response payload ต้องสะท้อน persisted state จริง
- ห้าม fallback ไป memory/local demo stores

**Primary paths**
- `app/api/execute/*`
- `app/api/executions/*`
- `app/api/policies/*`
- `app/api/audit/*`
- `app/api/ledger/*`

### R1.4 Read routes read DB จริง

- dashboard/read pages ดึงจาก DB-backed API เท่านั้น
- normalize pagination/filtering ตาม org + permission

**Primary paths**
- `app/dashboard/**`
- `app/api/*` (read endpoints)

### R1.5 Cutover acceptance (Go/No-Go)

ต้องผ่านครบ:

1. ไม่มี endpoint production ที่ใช้ mock/memory/localStorage เป็น source-of-truth
2. submit/approve/reject/escalate เขียน DB จริง + trace ใน audit
3. dashboard หลักอ่านสถานะล่าสุดจาก DB ตรงกันกับ action history
4. Vitest ผ่าน และ migration test ผ่าน

---

## Round 2 — Hardening + Launch

เป้าหมาย: จาก “ใช้ได้” ไป “ปล่อยขายได้”

### R2.1 Security + policy validation

- permission checks ครบทุก route (deny-by-default)
- error states มาตรฐาน (authz, quota, policy, upstream failure)
- audit export/replay ตรวจสอบได้

### R2.2 Billing/entitlement production mode

- entitlement gate ผูก billing plan/seat/quota จริง
- ปิดช่องใช้ฟรีที่ bypass policy

### R2.3 Operational readiness

- deploy checks: staging/prod parity
- smoke test runbook ชัดเจน
- rollback/runbook/incident flow ครบ

### R2.4 Marketplace/Enterprise readiness

- terms/privacy/security/support pages ครบและเชื่อมจริง
- listing/demo script ใช้ flow production (ไม่ใช่ demo fork)

### R2.5 Launch acceptance (Go/No-Go)

ต้องผ่านครบ:

1. policy + permission enforcement ผ่าน test/spot-check
2. billing entitlement ทำงานจริงในเส้นทางสำคัญ
3. smoke test production checklist ผ่าน
4. docs operator/runbook/recovery อัปเดตล่าสุด

---

## Delivery model (ไม่แตกเป็น 10 เฟส)

- ใช้ 2 milestone เท่านั้น
  - `M1: Production Cutover`
  - `M2: Hardening + Launch`
- ทุก PR ต้องติด label ใด label หนึ่งเท่านั้น: `M1` หรือ `M2`
- PR ที่เป็น demo-only ให้ reject ทันที

---

## Immediate next step (เริ่มตอนนี้)

ให้เริ่มจาก **M1 / R1.1 + R1.2** ก่อนทันที และแตก task ตามไฟล์จริงใน repo:

1. schema/migration delta
2. repository + org-scope enforcement
3. action write path cutover
4. read path cutover
5. acceptance test matrix

เอกสารนี้ตั้งใจใช้เป็น baseline ตัดสินว่า “งานไหนอยู่ถึง production” และกันงานหลอกซ้ำ.

See also: `docs/MARKETPLACE_TOP_TIER_GAP_AND_GET_STARTED_2026-04-11.md` for top-tier benchmark and user get-started standard.

Timeline locked in `docs/PRODUCTION_START_TIMELINE_2026-04-11.md`.
