# QA Full-Surface Manual Test Plan (Thai)

อัปเดตล่าสุด: 2026-04-17 (UTC)

ผลการรันล่าสุดดูที่: `docs/FULL_SYSTEM_TEST_REPORT_2026-04-17_TH.md`

## 1) Test account และ role matrix

- **Credential policy:** ห้ามใส่ user/password จริงในเอกสารหรือ PR
- **Credential source:** ใช้ Secret Manager/CI variables/1Password ของทีม
- **Role ที่ต้องทดสอบ:**
  - `operator`
  - `admin`

> หมายเหตุ: หากระบบมี role switcher หรือจำเป็นต้อง sign out/in ใหม่ ให้รัน flow แยกต่อ role เพื่อแยกหลักฐาน pass/fail ชัดเจน

---

## 2) ขอบเขตการทดสอบ (Scope)

ต้องครอบคลุม **ทุกหน้า / ทุกปุ่ม / ทุกฟอร์ม / ทุก flow หลัก** ตาม surface ด้านล่าง:

1. Public pages (`/`, `/pricing`, `/docs`, `/quickstart`, `/marketplace`, `/request-access`)
2. Auth pages (`/login`, `/password-login`, `/signup`, `/auth/*`)
3. Dashboard pages (`/dashboard/*` ทุกหน้า)
4. Core operator APIs (`/api/usage`, `/api/execute`, `/api/executions`, `/api/policies`, `/api/capacity`, `/api/audit`)
5. Billing/enterprise flows (`/dashboard/billing`, enterprise proof flows)

---

## 3) เกณฑ์ pass / fail

### Fail ทันที (Hard fail)

- พบ HTTP **5xx** จาก flow ที่ผู้ใช้เรียกใช้งาน
- พบ **JavaScript runtime error** ที่กระทบการใช้งาน
- เกิด **broken flow** (กดต่อไม่ได้, redirect loop, submit ไม่ได้, state เพี้ยนจนจบ flow ไม่ได้)

### Pass

- ไม่มี hard fail ด้านบน
- แต่ละ flow หลักจบได้ครบตาม expected outcome ของ role

---

## 4) Connector และหลักฐานที่ต้องเก็บ

ใช้หลักฐานครบ 3 ส่วน:

1. **Browser**
   - เก็บภาพหน้าจอจุดสำคัญ: before action / after action / error state (ถ้ามี)
2. **GitHub**
   - เปิด issue ต่อ defect ที่เข้าเกณฑ์ fail
   - ใส่ขั้นตอน reproduce + expected/actual + severity + ภาพหน้าจอ
3. **Screenshots**
   - ชื่อไฟล์แนะนำ: `YYYYMMDD-role-page-flow-step.png`
   - ตัวอย่าง: `20260417-admin-dashboard-billing-submit-01.png`

---

## 5) Execution checklist (ย่อ)

> ให้ทำ checklist ต่อ role (`operator`, `admin`) แยกกัน

### A. Authentication & Session

- [ ] Login ด้วย email/password สำเร็จ
- [ ] Logout และ login ซ้ำสำเร็จ
- [ ] Session timeout/refresh ยังใช้งานได้ตามคาด
- [ ] Unauthorized route ถูกกันสิทธิ์ถูกต้อง

### B. Navigation & UI actions

- [ ] เข้าทุกเมนูหลักได้
- [ ] ปุ่ม action ทุกจุดที่มองเห็นได้กดแล้วมีผลลัพธ์ชัดเจน
- [ ] ไม่พบปุ่ม dead-click
- [ ] Loading/empty/error state แสดงผลไม่พัง

### C. Forms

- [ ] Validation client-side ทำงาน
- [ ] Validation server-side ทำงาน
- [ ] Submit success path ทำงานครบ
- [ ] Submit failure path แสดงข้อความที่ actionable

### D. Main product flows

- [ ] Agent management flow
- [ ] Policy flow
- [ ] Execute/intent flow
- [ ] Ledger/audit/proofs flow
- [ ] Billing/seat/checkout flow
- [ ] Settings/integration flow

### E. Error handling & observability

- [ ] ไม่พบ 5xx ใน flow ปกติ
- [ ] ไม่พบ JS error ใน console ที่กระทบการใช้งาน
- [ ] กรณี fail เก็บ evidence ครบ (screenshot + request/response + issue link)

---

## 6) Test case result template

ใช้ format นี้ต่อ 1 test case:

- **Case ID:**
- **Role:** (`operator` / `admin`)
- **Page/Flow:**
- **Steps:**
- **Expected:**
- **Actual:**
- **Result:** (`PASS` / `FAIL`)
- **Evidence:** (screenshot path + GitHub issue link)
- **Notes:**

---

## 7) Exit criteria

ปล่อยงานได้เมื่อ:

1. Test checklist ครบทุก scope
2. ไม่มี hard fail ค้างอยู่
3. ทุก defect ที่เหลือถูกบันทึกใน GitHub พร้อมหลักฐานครบ
4. มีสรุปผลท้ายรอบเป็น:
   - จำนวนทั้งหมด / pass / fail
   - Top risk 3 อันดับ
   - ข้อเสนอแนะก่อน production cutover

