# DSG Product Loop: สิ่งที่ต้องเพิ่มก่อนใช้งานจริง + วิธีสั่ง Agent ให้สร้างโปรดักใหม่

เอกสารนี้สรุปจากโครงสร้างที่มีอยู่แล้วใน repo และเติมเฉพาะช่องว่างที่จำเป็นสำหรับการใช้งาน production จริง

## 1) สิ่งที่ "ต้องเพิ่ม" เพื่อ Production จริง

> สถานะปัจจุบัน: โครงสร้าง core ครบแล้ว (auth, spine, billing, enterprise proof, migrations) แต่ยังต้องเสริมด้าน operations + reliability ให้ครบวงจร

### A. Reliability / SLO (แนะนำทำเป็นลำดับแรก)

- กำหนด SLO ชัดเจน (เช่น API availability, p95 latency, job success rate)
- ทำ synthetic checks ครอบเส้นทางสำคัญ: `/api/health`, `/api/intent`, `/api/execute`
- ตั้ง Alert ที่ actionable (Pager/Slack):
  - error rate พุ่ง
  - queue/execution ค้าง
  - callback timeout
- เพิ่ม runbook แยก incident class: auth fail, billing fail, executor fail, supabase degraded

### B. Security Hardening

- บังคับใช้ secret rotation รอบเวลา (DB keys, service role, Stripe, Resend, executor token)
- เปิด audit trail ให้ครบทุก endpoint ที่เปลี่ยน state
- เพิ่ม abuse protection:
  - per-user + per-org rate limit
  - request signing สำหรับ callback ภายนอก
  - idempotency key สำหรับ endpoint ที่ retry ได้
- ตรวจ PII policy: logging ต้อง redact เสมอ

### C. Data / Migration Safety

- ทำ migration promotion flow 3 ชั้น: dev -> staging -> production
- ทุก migration ต้องมี rollback plan (หรือ compensation script)
- ตั้ง backup + point-in-time restore drill รายเดือน
- เพิ่ม data retention policy สำหรับ execution logs, audit, proof

### D. CI/CD + Release Governance

- บังคับ quality gate ก่อน deploy:
  - unit/integration pass
  - migration check pass
  - typecheck + lint pass
- ใช้ deployment strategy แบบ canary/blue-green สำหรับ API สำคัญ
- เพิ่ม release checklist ที่ require owner sign-off (Eng + Product + Security)

### E. E2E + Runtime Verification

- แก้ปัญหา Playwright browser install ใน CI (artifact mirror หรือ prebuilt image)
- เพิ่ม smoke E2E อย่างน้อย 5 flow:
  1. signup/login
  2. create agent
  3. submit intent
  4. execute + checkpoint
  5. billing checkout callback
- เพิ่ม post-deploy verification script ที่รันอัตโนมัติ

## 2) วิธี "สั่ง Agent ให้ทำโปรดักใหม่" ในแอป DSG

แนวคิดคือใช้เส้นทาง `intent -> planner -> tools/executor -> checkpoint -> proof/audit` ให้เป็น workflow มาตรฐาน

### Step 0: เตรียม Template ของ Product Spec (บังคับ)

ทุกคำสั่งใหม่ควรถูก normalize เป็น schema เดียวกัน เช่น:

- `product_name`
- `goal`
- `target_user`
- `constraints` (งบ, เวลา, compliance)
- `channels` (web, social, api)
- `acceptance_criteria`
- `risk_level`
- `approval_required` (true/false)

### Step 1: ส่ง Intent เข้า API

- ยิงเข้า `/api/intent` พร้อม payload ตาม template
- ใส่ `idempotency_key` ทุกครั้ง
- map intent -> internal task graph (planner)

### Step 2: Planner แตกงานเป็น Action Graph

Action อย่างต่ำควรมี:

- research
- draft spec
- generate assets
- preflight policy check
- human approval gate
- publish/deploy
- post-launch metrics watch

### Step 3: บังคับผ่าน Gate / Policy ทุก Action

- action ที่เสี่ยงสูง (publish, billing, data write) ต้อง require approval
- policy engine ต้อง deny-by-default ถ้า scope/permission ไม่ครบ
- เก็บเหตุผลการอนุมัติลง audit เสมอ

### Step 4: Execute ผ่าน Executor แบบควบคุมได้

- งาน text/plan ใช้ internal executor
- งาน external (browser/social/API) ใช้ typed executor + timeout + retry policy
- ทุก task ต้องมี:
  - `trace_id`
  - `checkpoint_id`
  - `replayable inputs`

### Step 5: เขียนผลเข้า Ledger + Proof

- commit outcome ลง execution ledger
- สร้าง enterprise proof ต่อรอบ execution
- เปิด replay ได้จาก checkpoint เพื่อ debug/recover

## 3) ตัวอย่าง Prompt ที่ใช้ได้ทันที (สำหรับ Operator)

ใช้ prompt นี้ในหน้า command center/agent chat:

1. "สร้างโปรดักใหม่ชื่อ `{{product_name}}` สำหรับ `{{target_user}}` โดยมีเป้าหมาย `{{goal}}`"
2. "ข้อจำกัด: งบ `{{budget}}`, deadline `{{deadline}}`, compliance `{{compliance}}`"
3. "ให้สร้าง action plan 7 วัน, ระบุความเสี่ยง, และหยุดรออนุมัติก่อนขั้น publish"
4. "ผลลัพธ์ต้องมี: spec, checklist, rollout plan, metric dashboard, rollback plan"

## 4) API Contract ขั้นต่ำที่ควรเพิ่ม (ถ้ายังไม่มี)

- `POST /api/product-loop/start`
  - รับ normalized product intent
  - ส่งกลับ `run_id`, `trace_id`, initial plan
- `POST /api/product-loop/:runId/approve`
  - ใช้ approve/reject พร้อม reason
- `GET /api/product-loop/:runId/status`
  - คืน stage ปัจจุบัน + checkpoint + blockers
- `POST /api/product-loop/:runId/replay`
  - replay จาก checkpoint ที่เลือก

## 5) Definition of Done (DoD) สำหรับ "Product ใหม่"

ถือว่าเสร็จเมื่อครบทั้ง 5 ข้อนี้:

1. ผ่าน policy + approval ครบ
2. มี execution trace และ replay ได้
3. มี enterprise proof และ audit log ตรวจสอบย้อนหลังได้
4. มี rollout + rollback ที่ทดสอบแล้ว
5. มี metric baseline หลังเปิดใช้งาน (อย่างน้อย activation, error rate, conversion)

## 6) แผน 14 วัน (ทำได้จริง)

- Day 1-2: ปิดช่องโหว่ CI/E2E + quality gate
- Day 3-4: เพิ่ม product-loop API 4 ตัวด้านบน
- Day 5-6: ทำ planner schema + approval checkpoints
- Day 7-8: ต่อ dashboard status timeline
- Day 9-10: เพิ่ม proof/audit export สำหรับ run
- Day 11-12: staging load + chaos test
- Day 13: production canary 5%
- Day 14: full rollout + postmortem template

---

ถ้าต้องการเริ่มแบบเร็วที่สุด ให้เริ่มจาก `intent schema + approval gate + status API` ก่อน เพราะเป็นแกนที่ทำให้ "สั่งเอเจนต์ทำโปรดักใหม่" ได้อย่างปลอดภัยและตรวจสอบได้จริง
