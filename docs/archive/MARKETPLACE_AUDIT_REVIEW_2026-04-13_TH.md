# Marketplace Product Audit & Review (TH) — 2026-04-13

## ขอบเขตการรีวิว
รีวิวนี้อ้างอิงจากโครงสร้างระบบที่ทีมให้มา และตรวจเส้นทางหลักของ Marketplace Product ได้แก่:
- Public reviewer surface (`/marketplace`, `/marketplace-ui`, `/`, `/api/health`)
- Protected operator surface (`/login`, dashboard routes, `/api/execute`)
- แนวควบคุมด้านความปลอดภัยที่มีอยู่แล้ว (RBAC, rate-limit, safe-log, audit trail)

> หมายเหตุ: เอกสารนี้เป็น **audit เชิงสถาปัตยกรรม/ความพร้อมตลาด (go-to-market readiness)** ไม่ใช่ penetration test แบบ black-box เต็มรูปแบบ

---

## Executive Summary
สถานะภาพรวม: **พร้อมใช้งานเชิง production ในระดับดี (Strong Foundation)** โดยเฉพาะเรื่อง deterministic control-plane และ auditability

### จุดแข็งเด่น
1. มีการแยก **public vs protected boundary** ชัดเจน (reviewer page + protected execute path)
2. มี execution governance chain ครบแกน: intent → gate → execution → audit/ledger
3. มีโครงสร้าง auth/SSO/RBAC/JIT provisioning รองรับ enterprise onboarding
4. มี migration + test matrix ครอบคลุมดี (unit/integration/failure/migrations)

### ช่องว่างที่ควรปิดก่อน scale ตลาด
1. Marketplace reviewer journey ยังเน้น technical มาก ควรเพิ่ม business outcomes + trust artifacts บนหน้าเดียว
2. ควรเพิ่มมาตรฐาน error contract และ reviewer-safe examples ให้สอดคล้องทุก endpoint สาธารณะ
3. ควรตั้ง KPI readiness สำหรับ funnel สำคัญ: visitor → trial/access request → verified activation
4. E2E browser install dependency ควรถูก harden เพื่อให้ CI confidence สมบูรณ์

---

## Audit Matrix (Score 1-5)

| มิติ | คะแนน | เหตุผลย่อ |
|---|---:|---|
| Product Positioning | 4.0 | Value proposition ชัด แต่ข้อความยัง technical-heavy สำหรับ buyer persona บางกลุ่ม |
| Security & Governance | 4.6 | โครงสร้าง auth/rbac/rate-limit/audit ครบและสอดคล้องแนว enterprise |
| Reliability & Operability | 4.4 | health + runtime + recovery + checkpoint พร้อม แต่ควรเติม operational SLO dashboard narrative |
| Developer Experience | 4.2 | API breadth ดี, แต่ควรมี guided quickstart ตาม persona มากขึ้น |
| Marketplace Readiness | 3.9 | reviewer page ดีแล้ว แต่ยังขาด conversion instrumentation และ trust-pack กลาง |

**คะแนนรวมถ่วงน้ำหนัก (ประมาณ): 4.22 / 5.00**

---

## Findings ตามลำดับความสำคัญ

## P0 (สำคัญมาก / ควรทำก่อนผลักดันช่องทาง Marketplace เพิ่ม)

### 1) เพิ่ม "Trust & Compliance Snapshot" บน reviewer-facing surface
**ปัญหา:** ผู้รีวิว marketplace มักต้องการหลักฐานสั้น ๆ ที่อ่านใน 2-3 นาที เช่น data handling, audit retention, incident contact

**ผลกระทบ:** ผ่าน technical review ได้ แต่ conversion ฝั่ง procurement/infosec ช้ากว่าที่ควร

**ข้อเสนอ:**
- เพิ่ม section ใน `/marketplace` หรือ `/docs` ที่รวม
  - Data classification (เก็บอะไร / ไม่เก็บอะไร)
  - Audit evidence export workflow
  - Security contact + response SLA
  - Environment boundary (public endpoint vs protected operator)

### 2) ทำ API error contract ให้เป็นมาตรฐานเดียว
**ปัญหา:** แม้มี `api-error`/`error-response` แล้ว ควร verify ให้ทุก public/protected endpoint ส่งรูปแบบเดียวกัน

**ผลกระทบ:** ลดเวลา integrate ของลูกค้า/พาร์ทเนอร์ และลด support ticket

**ข้อเสนอ:**
- ระบุ schema เดียว เช่น `{ code, message, request_id, details? }`
- ทำ contract test ครอบ endpoint สำคัญ (`/api/health`, `/api/execute`, auth-related APIs)

---

## P1 (ควรทำใน sprint ถัดไป)

### 3) ใส่ Funnel Telemetry สำหรับ Marketplace Conversion
**ข้อเสนอ KPI เริ่มต้น:**
- `marketplace_page_view`
- `health_probe_success`
- `login_click`
- `request_access_submit`
- `first_execute_success` (ภายใน 24 ชม.)

**ผลลัพธ์ที่คาดหวัง:** วัดได้ว่าคอขวดอยู่ที่ awareness, trust, onboarding หรือ activation

### 4) เพิ่ม Persona-specific Quickstart
**ข้อเสนอ:** แยก quickstart อย่างน้อย 3 persona
- Security reviewer
- Platform engineer
- Ops manager

แต่ละ persona ควรมี:
- เป้าหมาย
- 5-step runbook
- expected output
- fallback เมื่อเจอ error ยอดฮิต

---

## P2 (เสริมความแข็งแรงระยะกลาง)

### 5) Harden E2E Browser Dependency ใน CI
**สถานการณ์:** current known issue มาจาก browser download/install chain

**ข้อเสนอ:**
- pin browser artifact source และ cache strategy ใน CI
- แยก nightly full-e2e กับ PR smoke-e2e
- ทำ synthetic marketplace checks แบบไม่พึ่ง full browser ทุกครั้ง

### 6) เพิ่ม Marketplace Demo Dataset ที่ deterministic
เพื่อให้ reviewer/demo เห็น ALLOW/STABILIZE/BLOCK ครบ pattern เดียวกันทุกครั้ง ลด variance ตอนโชว์ระบบ

---

## 30-60-90 Day Action Plan

### 0-30 วัน
- ปิด P0 ทั้งสองข้อ (trust snapshot + unified error contract)
- ใส่ funnel telemetry events ขั้นต้น
- ออก reviewer runbook เวอร์ชัน 1 หน้าเดียว

### 31-60 วัน
- persona quickstart ครบ 3 กลุ่ม
- เพิ่ม conversion dashboard + weekly review cadence
- ปรับข้อความ marketing surface ให้ลด jargon และชี้ business outcome มากขึ้น

### 61-90 วัน
- harden e2e pipeline แบบ staged
- สร้าง reusable demo pack สำหรับทีม sales/solutions
- ตั้ง quarterly governance review (security + runtime + billing correctness)

---

## Go / No-Go Recommendation
**Recommendation: GO (แบบมีเงื่อนไข)**

เงื่อนไขก่อน scale แคมเปญ marketplace:
1. ปิด P0 ภายในรอบ sprint ถัดไป
2. มีตัวชี้วัด conversion อย่างน้อย 4 ตัวที่เก็บจริงใน production
3. ยืนยันว่า reviewer สามารถจบ flow สาธิตได้ภายใน 15 นาทีโดยไม่ต้องให้วิศวกรช่วย

หากทำครบ 3 ข้อนี้ จะเพิ่มโอกาสผ่าน review + ลด friction ฝั่งลูกค้าองค์กรได้ชัดเจน

---

## Checklist สั้นสำหรับทีมปฏิบัติการ
- [ ] Reviewer page มี trust snapshot ล่าสุด
- [ ] Public endpoints มี error schema เดียวกัน
- [ ] Marketplace funnel events ยิงครบ
- [ ] Quickstart แยก persona เผยแพร่แล้ว
- [ ] E2E pipeline มี fallback เมื่อ browser install ล้มเหลว
