# DSG ONE — Repo / Dev Activity Report

**จัดทำ:** 15 มิถุนายน 2026
**แหล่งข้อมูล (ของจริง, ดึงจาก GitHub):**
- `README.md` (main branch)
- `PROJECT_TRUTH.md` (last reviewed in repo: 2026-05-15)
- `DECISION_LOG.md` (entries 2026-04-17 ถึงล่าสุดที่ commit)
- หน้า repo overview (languages, commit/issue/PR counts)

---

## 1. สถานะ repo ณ จุดที่ดึงข้อมูลได้ (พร้อมหมายเหตุความน่าเชื่อถือ)

| Metric | ค่าที่เห็น |
|---|---|
| Commits (main) | 622 |
| Open issues | เห็นค่าไม่ตรงกันระหว่างหน้า: **5**, **6**, และ **9** |
| Open pull requests | เห็นค่าไม่ตรงกันระหว่างหน้า: **47** และ **28** |
| Stars | เห็นค่าไม่ตรงกัน: **0** และ **1** |
| Watchers | 1 |
| Forks | 0 |

**หมายเหตุตาม truth boundary:** ตัวเลข issues/PRs/stars ที่ได้จาก GitHub แต่ละหน้าไม่ตรงกัน (น่าจะเป็น cache ของ GitHub ที่ fetch ได้คนละช่วงเวลา) — **ไม่ใช่ตัวเลขเดียวที่ verify ได้ 100%** ถ้าต้องใช้ตัวเลขนี้ในรายงานที่ส่งให้คนอื่น แนะนำให้ login เข้า GitHub แล้วเช็คหน้า Issues/Pulls โดยตรงอีกครั้ง — ผมเห็นแค่หน้า public ที่ cache ไว้

**Language composition (จากหน้า repo):** TypeScript 81.1% · Shell 5.9% · PLpgSQL 5.8% · JavaScript 4.9% · HTML 1.0% · CSS 0.6% · Other 0.7%

47 open PRs (หรือ 28 — ดูหมายเหตุข้างบน) สำหรับ repo solo-developer ถือว่าสูงผิดปกติ — น่าจะเป็น PR ที่เปิดจาก automation/agent (`.agents/skills`, `marketplace-actions` มีในโครงสร้าง repo) ค้างไว้ ถ้ายังไม่ merge/close จำนวนมากนี้อาจกระทบความน่าเชื่อถือเวลามีคนเข้ามาดู repo — **แนะนำให้ไล่ปิด/merge PR ค้างเป็นงานถัดไป**

---

## 2. Test Baseline — แนวโน้มที่ verify ได้จาก PROJECT_TRUTH.md / DECISION_LOG.md

| วันที่ | Test files | Tests passed | Skipped | Failed | สถานะ |
|---|---|---|---|---|---|
| 2026-04-11 | 41 | 85 | – | – | superseded |
| 2026-04-17 | 62 | 185 | 3 | 0 | superseded |
| 2026-05-15 | 77 | 252 | 4 | 0 | **current (ล่าสุดที่มี evidence)** |

- TypeScript typecheck: **ผ่าน 0 errors** (verified 2026-05-15)
- เพิ่มขึ้นต่อเนื่อง 3 รอบ: 85 → 185 → 252 tests, ไม่มี failed เลยทั้ง 3 รอบ — เป็นสัญญาณบวกชัดเจนของ engineering discipline

**Gap ที่ต้องบอกตรงๆ:** วันนี้คือ 15 มิ.ย. 2026 — evidence ล่าสุดที่ commit คือ 15 พ.ค. 2026 = **ผ่านมาแล้ว 1 เดือนเต็มที่ไม่มี test-baseline ใหม่ใน source-of-truth ที่ผมเห็น** ถ้ามีการรันเทสเพิ่มหลังจากนั้นแล้วยังไม่ commit ลง `qa-logs/` และอัปเดต `PROJECT_TRUTH.md` ก็เท่ากับว่า "ความจริงล่าสุด" ยังไม่ถูกบันทึกเป็นหลักฐาน

---

## 3. Engineering Decisions ที่บันทึกไว้ (DECISION_LOG.md, 2026-04-17 เป็นต้นไป)

| # | เรื่อง | สถานะ | สรุป |
|---|---|---|---|
| 001 | Source-of-truth structure | accepted | `PROJECT_TRUTH.md` เป็น control doc ไม่ใช่ canonical — canonical คือ `docs/REPO_TRUTH.md`, `docs/RUNBOOK_DEPLOY.md` |
| 002 | Test-status conflict (README vs REPO_TRUTH) | superseded | เคยมีตัวเลขขัดกัน (185 vs 85) — ห้าม normalize จนกว่ามี evidence ใหม่ |
| 003 | Route interpretation | accepted | กำหนดชัดว่า route ไหนเป็น public probe / authenticated operator surface |
| 004 | Release risk framing | accepted | ความเสี่ยง deploy ปัจจุบัน = configuration drift/runtime alignment ไม่ใช่ขาด runtime-spine |
| 005 | Workflow guard | accepted | ก่อนแก้ repo: อ่านไฟล์จริง → แยก fact/inference → หยุดถ้าขัดกัน → patch หลัง review เท่านั้น |
| 006 | Test-baseline reconciliation | accepted | ยืนยัน 185 tests (17 เม.ย.) เป็น baseline ที่ถูกต้องแทน 85 |
| 007 | Production-readiness gating | accepted | 185 tests ผ่าน ≠ go-live พร้อม — แยก test-truth กับ production-readiness-truth เป็นคนละเรื่อง |
| 008 | Test-baseline update (15 พ.ค.) | accepted | อัปเดตเป็น 252 tests, 0 failed, typecheck 0 errors, ครบ 34 Supabase migrations |
| 009 | Go-live blocker classification | accepted | ความล้มเหลวของ go-live evidence วันที่ 3 พ.ค. 2026 (`CONNECT tunnel failed, 403`) เป็นข้อจำกัดของ sandbox/proxy ไม่ใช่ bug ในโค้ด — ต้องรันใหม่จาก GitHub Actions หรือ shell ที่มี network ตรงพร้อม Vercel credentials |

---

## 4. Production Go-Live Status (จาก PROJECT_TRUTH.md, 15 พ.ค. 2026)

**ปิดแล้ว (มี evidence):**
- ✅ Vitest baseline 252 passed, 4 skipped, 0 failed
- ✅ TypeScript typecheck 0 errors
- ✅ 34 Supabase migrations ครบและอยู่ใน `RUNBOOK_DEPLOY.md` (ล่าสุดถึง `20260512090000_create_agent_gate_settings.sql`)
- ✅ ไม่มี legacy `/api/finance-governance/server-store/` caller หลงเหลือ

**ยังไม่ปิด (ต้องใช้ external environment — Vercel access, production Supabase, direct outbound network):**
- ⬜ Vercel production deployment status = `Ready`
- ⬜ Production environment variables ครบและ validate แล้ว
- ⬜ `/api/health` และ `/api/readiness` smoke check ผ่านบน deployed target
- ⬜ Authenticated operator checks ผ่าน
- ⬜ Live staging/E2E validation ถูกบันทึกเป็น evidence

**Claim boundary ที่ยังคงไว้ (ห้ามอ้างเกินนี้จนกว่ามี evidence ใหม่):**
- ห้ามอ้างว่ามี external Z3 production-solver invocation
- ห้ามอ้างว่า JWT/JWKS auth เสร็จสมบูรณ์
- ห้ามอ้างว่า WORM evidence storage เสร็จสมบูรณ์
- ห้ามอ้างว่ามี real cryptographic signing เสร็จสมบูรณ์
- ห้ามอ้าง third-party certification

---

## 5. User-Benefit Gate

- **ผู้ใช้ (Thanawat) ได้ประโยชน์อะไร:** เห็นภาพรวม "ของจริงตอนนี้" ในที่เดียว ไม่ต้องไล่เปิดหลายไฟล์ — ใช้ตรวจสอบก่อนพูดกับนักลงทุน/ลูกค้าได้ทันที
- **ใช้งานง่ายขึ้นไหม:** ใช่ — รวม 3 ไฟล์ (PROJECT_TRUTH, DECISION_LOG, repo overview) เป็นตารางเดียว
- **เห็นผลจริงตรงไหน:** ตัวเลข test 85→185→252 และ checklist go-live ที่ตรงกับ PROJECT_TRUTH.md เป๊ะ
- **ขั้นต่อไปคืออะไร:**
  1. รัน `npm run go:no-go` และ `npm test` ใหม่ เพื่อสร้าง evidence ของวันที่ 15 มิ.ย. 2026 (gap 1 เดือนที่พบในข้อ 2)
  2. ไล่ดู open PRs (28-47 รายการ) — ปิด/merge ของที่ agent เปิดทิ้งไว้
  3. รัน go-live evidence ใหม่จาก environment ที่มี direct network + Vercel credentials ตามที่ Decision 009 ระบุ เพื่อปิด blocker 5 ข้อในส่วนที่ 4
