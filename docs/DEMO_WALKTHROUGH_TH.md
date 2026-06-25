# DSG ONE / ProofGate — เดโม Walkthrough (ภาษาไทย)

เอกสารนี้อธิบายขั้นตอนการใช้ระบบ ประโยชน์ที่ได้รับ โอกาสในการสร้างรายได้ และข้อกำหนด EU  
สำหรับใช้ในการนำเสนอเดโมกับลูกค้าองค์กร ทีม Sales และ Product

---

## 1. ระบบนี้คืออะไร

**DSG ONE / ProofGate Control Plane** คือ AI Runtime Governance Platform  
ทำหน้าที่ **ตรวจสอบและควบคุมคำสั่งของ AI/Agent ก่อนที่จะถูกรันจริง**  
พร้อมบันทึกหลักฐานและ audit trail ทุกขั้นตอน

เป้าหมายหลัก:
- หยุดงานเสี่ยงสูงก่อนเกิด incident
- บังคับ approval workflow สำหรับงานที่มี data sensitivity
- สร้าง audit trail ที่พิสูจน์ได้ทันทีเมื่อถูกตรวจสอบ
- รองรับข้อกำหนด EU AI Act, GDPR, ISO 42001

---

## 2. ขั้นตอนการใช้งาน (Demo Walkthrough)

### ขั้นที่ 1 — สมัครและสร้างองค์กร

**Route:** `/signup`

ผู้ใช้กรอก:
- Work Email และ Password
- ชื่อองค์กร เช่น `ACME Fintech`
- ยอมรับ Terms

ระบบสร้าง workspace แยกสำหรับองค์กรนั้นทันที  
Audit event: `account_created`, `organization_created`

---

### ขั้นที่ 2 — ล็อกอินและเห็น onboarding checklist

**Route:** `/dashboard`

หลังล็อกอินครั้งแรก ระบบแสดง setup checklist 5 ข้อ:

1. Complete organization profile
2. Set roles and access
3. Create your first policy
4. Connect your integrations
5. Run your first execution

แต่ละข้อมีสถานะ: `Not started` / `In progress` / `Completed`

---

### ขั้นที่ 3 — ตั้ง Role และ Access

**Route:** `/dashboard/settings/access`

บทบาทมาตรฐาน:

| บทบาท | สิทธิ์หลัก |
|---|---|
| Admin | ตั้งค่าทุกอย่าง, manage policies, manage roles |
| Operator | ส่งคำสั่งงาน low-risk ได้ |
| Approver | อนุมัติหรือปฏิเสธ high-risk tasks |
| Auditor | ดู audit log อย่างเดียว (read-only) |

Audit event: `user_invited`, `role_assigned`

---

### ขั้นที่ 4 — สร้าง Policy แรก

**Route:** `/dashboard/policies`

ตัวอย่าง policy ที่สำคัญ:

```text
Policy Name: PII export approval required
Task Type:   Data export
Risk Level:  High
Action:      Require approval
Reason Code: HIGH_RISK_PII_EXPORT
```

ระบบแสดง **Policy Outcome Preview** ก่อน activate:
- `Export customer list externally` → Approval required
- `Generate internal summary report` → Allowed
- `Export PII without ticket` → Blocked

Audit event: `policy_created`, `policy_activated`

---

### ขั้นที่ 5 — เชื่อม Integration

**Route:** `/dashboard/integrations`

Integration ที่รองรับ: Slack, Email, ITSM, Internal API, Database, File Storage

ตัวอย่าง: เชื่อม Slack
- ระบุ Allowed Channels เช่น `#ops-daily`, `#incident-review`
- ระบุ Allowed Scopes เช่น `send_messages`
- กด `Test Connection` → Status badge: `Healthy`

Audit event: `integration_connected`, `integration_tested`

---

### ขั้นที่ 6 — ส่ง Execution ครั้งแรก

**Route:** `/dashboard/command-center`

Operator กรอก:
- Request / Instruction
- Task Type และ Business Justification
- Ticket ID และ Target System

ระบบแสดง **Review Before Execute**:
- Detected Intent
- Risk Assessment
- Policy Match
- Expected Output

CTA ตาม outcome: `Run Now` / `Submit for Approval` / `Edit Request`

---

### ขั้นที่ 7 — เห็น 3 Outcome

#### Outcome A: งานผ่าน (Allow)
- Status badge: `Completed`
- Timeline trace แสดงทุก step
- Output delivered

Audit event: `execution_completed`

#### Outcome B: งานถูก Block
- Status badge: `Blocked`
- Reason Code: `HIGH_RISK_PII_EXPORT`
- Explanation: `External delivery of PII requires approved ticket and approver sign-off.`
- CTA: `Attach Ticket` หรือ `Submit for Approval`

Audit event: `execution_blocked`, `reason_code_logged`

#### Outcome C: ต้องขออนุมัติ (Pending Approval)
- Status badge: `Pending Approval`
- ส่ง request ไปยัง Approver Team

Audit event: `approval_requested`

---

### ขั้นที่ 8 — Approver ตัดสินใจ

**Route:** `/dashboard/approvals`

Approver เห็น:
- Request summary และ Business justification
- Ticket ID, Policy match, Data sensitivity
- CTA: `Approve` / `Reject` / `Request Changes`

เมื่อ Approve มี modal ให้ระบุ:
- Approval Note
- Expiration Window
- Scope Restriction (single run only, read-only only)

Audit event: `approval_granted`, `approval_rejected`

---

### ขั้นที่ 9 — ดู Audit / Replay / Proof

**Route:** `/dashboard/audit`

Tabs:
- **Audit Log** — ทุก event พร้อม Actor, Action, Reason Code, Execution ID
- **Replay** — replay execution ด้วย policy snapshot ณ เวลานั้น
- **Proof** — deterministic proof hash, constraint results
- **Export** — CSV / PDF สำหรับ internal audit

Audit event: `audit_exported`, `replay_viewed`, `proof_viewed`

---

### ขั้นที่ 10 — ดู Usage / Billing

**Route:** `/dashboard/usage`

Widgets:
- Total Executions, Success Rate, Failure Rate
- Team Quota Usage, Monthly Spend, Burn Rate
- Overage Alerts เช่น `Fraud Team has used 82% of monthly quota`

---

## 3. ประโยชน์หลักที่ลูกค้าได้รับ

| ประโยชน์ | รายละเอียด |
|---|---|
| หยุด incident ก่อนเกิด | Policy gate block งานเสี่ยงก่อนรัน ไม่ต้องตามแก้ทีหลัง |
| 4-eyes control | คนสั่ง ≠ คนอนุมัติ ≠ คนตรวจสอบ — แยกกันชัดเจน |
| Audit trail ครบถ้วน | ตอบคำถามย้อนหลังได้ทันทีโดยไม่ต้องรวบข้อมูลจากหลายระบบ |
| Cost governance | เห็น quota, burn rate, overage ก่อน scale ทีม |
| Compliance-ready | Evidence chain พร้อม EU AI Act, GDPR, ISO 42001 |
| Integration จริง | เชื่อม Slack, Email, ITSM, DB ได้ — ไม่ใช่แค่ demo sandbox |

---

## 4. โอกาสในการสร้างรายได้

### 4.1 Product Tiers (SaaS Subscription)

| Plan | ราคา | เหมาะกับ |
|---|---:|---|
| Trial | ฟรี | ทดลอง 1,000 exec/เดือน, 14 วัน |
| Pro | $99/เดือน (หรือ $79/เดือน ถ้าจ่ายรายปี) | นักพัฒนาเดี่ยวและทีมเล็ก |
| Business/Agency | $299/เดือน (หรือ $249/เดือน รายปี) | เอเจนซี, ทีม, client delivery |
| Enterprise | $999/เดือน (หรือ $849/เดือน รายปี) | องค์กรใหญ่, SSO/RBAC, custom quota |

### 4.2 Skill Pack Add-ons (รายได้เพิ่มต่อ account)

| Pack | ราคา/เดือน | เหมาะกับ |
|---|---:|---|
| DSG Finance Governance Pack | $199 | Fintech, ธนาคาร |
| DSG Dev Automation Pack | $99 | DevOps, Engineering |
| DSG Compliance & Legal Pack | $249 | Legal, Compliance Team |
| DSG Operations Pack | $149 | Ops, ITSM |
| DSG Enterprise Bundle | $599 | ทุก pack รวมกัน |

### 4.3 GitHub Marketplace

| Package | ราคา | กลุ่มเป้าหมาย |
|---|---:|---|
| Free | $0 | open-source / ทดลอง |
| Solo | $29/เดือน | นักพัฒนาเดี่ยว |
| Team | $99/เดือน | ทีม dev, startup |
| Production | $299/เดือน | production release, enterprise |
| Enterprise | custom | sales-assisted |

### 4.4 Metered Usage (รายได้ตาม scale)

- เกิน quota → เก็บ $0.001 ต่อ execution
- Stripe Meter Event: `dsg_execution_overage`
- เหมาะสำหรับลูกค้าที่ usage พุ่งช่วงสั้น เช่น รายงานสิ้นเดือน, การตรวจสอบ batch

### 4.5 One-time / Professional Services

| บริการ | ราคาตัวอย่าง |
|---|---|
| DSG Production Readiness Report | one-time fee |
| White-label Delivery Proof Report | รวมใน Agency plan |
| Enterprise onboarding / CSM | sales-assisted |

---

## 5. ข้อกำหนด EU ที่ระบบรองรับ

> **Claim boundary**: DSG ONE คือ `audit-ready` และ `evidence-ready`  
> ไม่ใช่ `certified compliant` — การรับรองจริงต้องใช้การตรวจสอบโดยบุคคลที่สาม

### 5.1 EU AI Act (CELEX:32024R1689)

| Article | ข้อกำหนด | สถานะใน DSG |
|---|---|---|
| Art. 9 | Risk management system | policy gate + risk assessment ก่อนรัน |
| Art. 13 | Transparency | execution trace, reason code, proof hash |
| Art. 14 | Human oversight | approval workflow, 4-eyes control |
| Art. 17 | Quality management | audit trail, replay, policy versioning |
| Art. 26 | Deployer obligations | org-scoped RBAC, execution governance |

Route หลักสำหรับ EU AI Act: `/compliance/eu-ai-act`

### 5.2 GDPR

| Article | ข้อกำหนด | DSG Response |
|---|---|---|
| Art. 15 | Right to access | `/api/audit/export` export execution records |
| Art. 17 | Right to erasure | deletion workflow ต้องตั้งค่าต่อ customer |
| Art. 25 | Privacy by design | org isolation, ไม่มี cross-tenant data leak |
| Art. 30 | Records of processing | audit log ครบทุก event |
| Art. 32 | Security of processing | RLS, encrypted transit, server-only secrets |

Data residency: ต้องตั้ง Supabase project ที่ region `eu-west-1 (Frankfurt)` สำหรับลูกค้า EU

### 5.3 ISO 42001 — AI Management System

DSG ONE map กับ ISO 42001 ผ่าน:
- Governance policies ที่ version-controlled
- Risk classification per execution
- Human oversight บังคับสำหรับ high-risk
- Evidence chain (L1–L5) สำหรับ continuous improvement

Route: `/iso-42001`

### 5.4 NIST AI RMF

| Function | DSG Control |
|---|---|
| GOVERN | RBAC enforcement via `requireOrgRole` |
| MAP | Canonicalized payload + approval-key linkage |
| MEASURE | SMT-LIB proof artifact, monitor endpoint |
| MANAGE | Policy-governed execution, anti-replay state transitions |

---

## 6. สิ่งที่ต้องพิสูจน์ใน 15 นาทีเดโม

เดโมมาตรฐานต้องแสดงครบ 4 เคส:

1. **Signup + onboarding checklist** — พิสูจน์ว่าเริ่มใช้ได้แบบองค์กรจริง
2. **Policy block งานเสี่ยง** — พิสูจน์ว่าระบบหยุด incident ก่อนเกิด
3. **Execution ที่ต้อง approval** — พิสูจน์ว่า 4-eyes control ใช้งานได้จริง
4. **Audit / Replay / Proof** — พิสูจน์ว่าตอบคำถามย้อนหลังได้ทันที

---

## 7. คำถามที่ลูกค้าต้องตอบได้เองหลังเดโม

1. ระบบนี้หยุดงานเสี่ยงก่อนเกิด incident ได้อย่างไร?
2. ระบบแยกคนสั่ง คนอนุมัติ และคนตรวจสอบได้ชัดแค่ไหน?
3. ระบบเชื่อมกับระบบเดิมขององค์กรได้จริงหรือเปล่า?
4. ถ้าถูกตรวจสอบย้อนหลัง ระบบตอบได้ทันทีไหม?
5. ถ้า scale ใช้งานหลายทีม ต้นทุนยังควบคุมได้ไหม?

---

## 8. ข้อจำกัดที่ต้องระบุให้ชัด

- Live Stripe checkout ยังต้องการ env vars จริงก่อน claim revenue
- GDPR data residency ต้องตั้ง Supabase region ต่อ customer
- EU AI Act compliance เป็น pre-audit evidence mapping ไม่ใช่ certified legal opinion
- External Z3 solver ยังไม่ถูก invoke ใน production (deterministic TypeScript scaffold)
- Android local API server ไม่ได้ถูก hardened สำหรับ public internet โดย default

---

*เอกสารนี้สร้างจากไฟล์ใน repo โดยตรง: `CUSTOMER_FLOW_15MIN_ENTERPRISE_ONBOARDING.md`, `PACKAGES_PRICING_MARKETPLACE_STRIPE_2026-06-20.md`, `COMPLIANCE_READINESS.md`, `NIST_AI_RMF_MAPPING.md`, `DOI_ZENODO_CACHING_AND_EU_LAW_MAP.md`*
