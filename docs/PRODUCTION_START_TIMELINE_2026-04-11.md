# Production Start Timeline (Locked)

Created: 2026-04-11 (UTC)

## Answer (direct)

เริ่ม **ทันที**: kickoff วันนี้ **2026-04-11** โดยนับเป็นวันเริ่ม `M1: Production Cutover`.

## 14-day execution window

### Week 1 (2026-04-11 → 2026-04-17): M1 core cutover

1. Schema + migration delta (submit/approve/reject/escalate persistence)
2. Repository layer + org/RBAC enforcement
3. Action routes write DB จริง
4. Read routes read DB จริง

**Week 1 exit criteria**
- ไม่มี production endpoint ที่พึ่ง mock/memory/localStorage เป็น source-of-truth
- action history ตรงกับ dashboard state จาก DB

### Week 2 (2026-04-18 → 2026-04-24): M2 hardening + launch prep

1. Policy + permission validation ครบ
2. Billing entitlement checks ครบ
3. Error-state + observability + runbook checks
4. Marketplace submission package (terms/privacy/security/support + demo script)

**Week 2 exit criteria**
- ผ่าน marketplace get-started acceptance checklist
- พร้อม Go/No-Go decision สำหรับ submission

## Daily operating cadence (fixed)

- 10:00 UTC: cutover standup (blockers + risk)
- 16:00 UTC: integration checkpoint (API/UI parity)
- 21:00 UTC: release readiness note (GO/NO-GO drift)

## Non-negotiables

1. ห้ามเพิ่ม demo-only scope ใหม่
2. ทุก PR ต้อง label `M1` หรือ `M2`
3. งานที่ไม่ช่วย marketplace readiness ให้เลื่อนไปหลัง 2026-04-24

## Day-0 kickoff checklist (today: 2026-04-11)

- [x] Freeze demo-only backlog (no new mock/memory/localStorage/demo-only routes)
- [x] Open `M1` epic + issue split (schema/repo/write/read/tests)
- [ ] Assign owner ต่อ stream
- [x] Start implementation PR #1 (schema/migration)
- [x] Start Wave 1 in parallel (`A1` + `B1` + `D2` + `E1`)
- [x] Integration checkpoint definition locked: critical writes must persist to DB and dashboard reads must come from DB-backed APIs
