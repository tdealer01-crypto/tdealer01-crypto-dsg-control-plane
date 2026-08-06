# Orchestrator Execution Plan (Speed + Correctness)

Date: 2026-04-11
Scope: M1 Production Cutover + M2 Hardening/Launch

## 1) แผนแบ่งงาน (Planner)

### Stream A — Data Foundation (upstream)
- A1: Schema delta + migrations for workflow state + audit completeness
- A2: Constraint/index hardening + rollback verification

### Stream B — Backend Enforcement
- B1: Repository abstraction for write/read paths
- B2: Org scoping + RBAC enforcement at API boundary
- B3: Action endpoints (`submit/approve/reject/escalate`) persist to DB

### Stream C — Read Model + UI Wiring
- C1: Read endpoints consume DB-only source-of-truth
- C2: Dashboard pages sync to DB-backed read model

### Stream D — Commercial + Governance
- D1: Billing entitlement checks by plan/seat/quota
- D2: Policy validation + permission denial paths + error contracts

### Stream E — Quality + Release
- E1: Test matrix (unit/integration/migration/smoke)
- E2: Marketplace get-started acceptance checklist execution
- E3: Launch package (terms/privacy/security/support/demo script)

## 2) งานที่รันขนานได้ (Parallel lanes)

### Wave 1 (ทันที, ไม่รอกัน)
- A1, B1, D2, E1 รันพร้อมกัน

### Wave 2 (หลัง A1 พร้อม)
- A2 + B2 + B3 รันขนาน

### Wave 3 (หลัง B3 พร้อม)
- C1 + audit verification + entitlement integration (D1) รันขนาน

### Wave 4 (หลัง C1 พร้อม)
- C2 + E2 + E3 รันขนาน

## 3) บทบาทเอเจนต์และเอาต์พุต

### Planner
- ส่ง: dependency graph + wave schedule + owner map
- ไม่แน่ใจ: hidden coupling ระหว่าง API กับ dashboard caching
- ส่งต่อ: Builder/Reviewer

### Researcher
- ส่ง: policy/RBAC edge-case list, entitlement failure modes, migration risk list
- ไม่แน่ใจ: production traffic pattern ที่กระทบ index design
- ส่งต่อ: Builder (schema + policy), Reviewer

### Builder
- ส่ง: implementation PRs ตามลำดับ A→B→C→D
- ไม่แน่ใจ: legacy demo route impact
- ส่งต่อ: Reviewer (compat + regression)

### Reviewer
- ส่ง: completeness/correctness/consistency report + no-demo regression verdict
- ไม่แน่ใจ: missing negative tests per endpoint
- ส่งต่อ: Planner สำหรับ replanning รอบย่อย

## 4) ผลลัพธ์รวมที่ต้องได้

1. DB-backed state machine สำหรับ submit/approve/reject/escalate
2. Org/RBAC enforcement ครบทุก critical route
3. Dashboard/read model อ้างอิง DB state จริง
4. Entitlement gate ใช้งานจริงตาม plan/quota/seat
5. ผ่าน acceptance checklist พร้อม GO/NO-GO ชัดเจน

## 5) จุดเสี่ยง/ข้อจำกัด

- migration order conflict กับข้อมูลเดิม
- route บางจุดยังผูกกับ demo assumptions
- E2E browser infra ยังไม่เสถียรในบาง environment
- entitlement edge cases อาจโผล่หลังเปิดใช้จริง

## 6) ข้อเสนอแนะเพื่อเร่งรอบถัดไป

1. ตรึง rule: PR ต้องติด `M1` หรือ `M2` เท่านั้น
2. freeze งานที่ไม่ช่วย launch readiness จนหลัง 2026-04-24
3. ใช้ daily triage 2 รอบ (midday + EOD) เพื่อลด blocker latency
4. merge เฉพาะ output ที่ Reviewer validate แล้ว

## 7) Start signal

เริ่มทำ production ตอนนี้ทันที โดยเปิด Wave 1 พร้อมกันทั้งหมด.
