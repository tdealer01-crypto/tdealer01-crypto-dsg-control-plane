# 0) Click-by-click Customer Flow: จากสมัครจนเห็นคุณค่าใน 15 นาที

> เป้าหมายของส่วนนี้คือทำให้ทีม Product / Design / Engineering / Sales / CS เห็นภาพเดียวกันว่า  
> ลูกค้าองค์กรต้อง **กดหน้าไหน**, **กรอกอะไร**, **กดปุ่มอะไร**, **ระบบต้องตอบอะไร**, และ **เห็นคุณค่าอะไรทันที**  
> โดยออกแบบให้ใกล้เคียงประสบการณ์แอประดับองค์กรที่ใช้งานจริงในตลาด

---

## 0.1 เป้าหมาย UX ของ flow นี้

ลูกค้าองค์กรที่เพิ่งเข้าระบบครั้งแรกต้องทำ 5 อย่างได้ภายใน session เดียว:

1. สร้างองค์กรและเข้า workspace ได้
2. ตั้งสิทธิ์และบทบาทผู้ใช้ได้
3. สร้าง policy แรกที่บังคับ approval หรือ block งานเสี่ยงสูงได้
4. เชื่อม integration ที่จำเป็นต่อ use case จริงได้
5. ส่ง execution แรกและเห็นผลลัพธ์ 3 แบบได้ทันที:
   - ผ่าน
   - ถูก block
   - ต้องขออนุมัติ

> ถ้าทำครบ 5 อย่างนี้ไม่ได้ ลูกค้าจะรู้สึกว่าระบบ “มีฟีเจอร์” แต่ “ยังไม่พร้อมใช้จริง”

---

## 0.2 บทบาทในเดโม

- **Admin:** สมัครองค์กร, ตั้งค่า access, policy, integration
- **Operator:** ส่งคำสั่งงานอัตโนมัติ
- **Approver/Auditor:** อนุมัติงานเสี่ยงสูง และตรวจสอบย้อนหลัง

---

## 0.3 หลักการ UX ที่ต้องมีทุกหน้า

ทุกหน้าที่อยู่ใน onboarding / setup / execution flow ต้องมีองค์ประกอบต่อไปนี้:

- **Page title** ที่บอกหน้าที่ของหน้านั้นชัดเจน
- **Helper text** 1–2 บรรทัด บอกว่าหน้านี้ใช้ทำอะไร
- **Primary CTA** เด่นชัดเพียง 1 ปุ่ม
- **System status** เช่น Not started / In progress / Completed / Blocked / Awaiting approval
- **Next step guidance** เพื่อบอกว่าผู้ใช้ควรทำอะไรต่อ
- **Validation และ error message ที่แก้ปัญหาได้จริง** ไม่ใช่บอกแค่ว่า failed
- **Audit-visible action** สำหรับทุก action สำคัญ เช่น create policy, assign role, approve execution

---

## 0.4 End-to-End Flow

### Step 1 — Signup: สร้างบัญชีและองค์กรครั้งแรก

**Route:** `/signup`  
**Actor:** Admin  
**Goal:** ให้ลูกค้าเริ่มต้นองค์กรใหม่ได้โดยไม่สับสน และเห็นว่าระบบรองรับโครงสร้างแบบองค์กรตั้งแต่แรก

#### UI ที่ต้องมี
- Page title: `Create your organization`
- Helper text: `Start with your work email and create an isolated workspace for your team.`
- Form fields:
  - Work Email
  - Password
  - Confirm Password
  - Organization Name
  - Checkbox: Accept Terms
- Primary CTA:
  - `Create Organization`
- Secondary CTA:
  - `Already have an account? Log in`

#### Input ตัวอย่าง
- Work Email: `admin@acme-fintech.com`
- Password: `********`
- Confirm Password: `********`
- Organization Name: `ACME Fintech`

#### Validation ที่ต้องมี
- email ต้องเป็น valid work email
- password ขั้นต่ำ 8 ตัวอักษร
- password / confirm password ต้องตรงกัน
- organization name ห้ามว่าง
- terms ต้องถูกติ๊ก

#### System response
**Success**
- Toast: `Account created successfully`
- Inline state: `Check your email to verify your account`
- Redirect ไปหน้า `Email verification pending`

**Error**
- `Please enter a valid work email`
- `Password must be at least 8 characters`
- `Organization name is required`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- เริ่มต้นแบบ workspace แยกองค์กร ไม่ใช่บัญชีเดี่ยว
- มีความมั่นใจว่า data boundary ถูกออกแบบมาตั้งแต่ต้น

#### สิ่งที่ทีมต้องเก็บใน audit
- account_created
- organization_created

### Step 2 — Email Verification: ยืนยันตัวตนก่อนเข้าระบบ

**Route:** `/verify-email` หรือ deep-link จากอีเมล  
**Actor:** Admin  
**Goal:** ยืนยันว่าผู้เริ่มใช้งานเป็นผู้ใช้จริง และลดการสร้าง workspace ปลอม

#### UI ที่ต้องมี
- Status card: `Email verified`
- Helper text: `Your organization is ready for setup.`
- CTA:
  - `Continue Setup`

#### System response
**Success**
- Redirect ไป `/login` หรือ `/onboarding`

**Error**
- `Verification link expired`
- ปุ่ม `Resend verification email`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ระบบมี identity gate ขั้นต้น
- ผู้ใช้ถูกตรวจสอบก่อนเข้าพื้นที่องค์กร

#### สิ่งที่ทีมต้องเก็บใน audit
- email_verified
- verification_resent

### Step 3 — First Login: เข้าองค์กรครั้งแรกและเห็น onboarding ชัดเจน

**Route:** `/login`  
**Actor:** Admin  
**Goal:** พาเข้าสู่ dashboard แบบไม่ปล่อยให้ผู้ใช้หลง

#### UI ที่ต้องมี
- Form fields:
  - Email
  - Password
- Primary CTA:
  - `Log in`
- Optional:
  - `Continue with SSO`
  - `Forgot password`

#### System response
**Success**
- Redirect ไป `/dashboard`
- Welcome banner: `Welcome to ACME Fintech`
- Setup checklist แสดงทันที

**Error**
- `Invalid email or password`

#### Dashboard first-run state ที่ต้องมี
Checklist 5 ข้อ:
1. Complete organization profile
2. Set roles and access
3. Create your first policy
4. Connect your integrations
5. Run your first execution

แต่ละข้อมีสถานะ:
- Not started
- In progress
- Completed

แต่ละข้อมี CTA:
- `Start`
- `Continue`
- `Review`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- รู้ว่าต้องทำอะไรต่อ
- ไม่เจอ dashboard โล่งๆ แบบไม่รู้จะเริ่มตรงไหน

#### สิ่งที่ทีมต้องเก็บใน audit
- login_success
- login_failed
- onboarding_started

### Step 4 — Organization Setup: ระบุบริบทธุรกิจและเจ้าของระบบ

**Route:** `/dashboard/settings/organization`  
**Actor:** Admin  
**Goal:** ให้ระบบรู้ขอบเขตองค์กรและ owner ที่ชัดเจน

#### UI ที่ต้องมี
- Page title: `Organization Settings`
- Helper text: `These settings define your workspace identity, reporting context, and security ownership.`
- Fields:
  - Organization Name
  - Industry
  - Team Size
  - Region / Country
  - Timezone
  - Security Contact Email
- CTA:
  - `Save Organization Settings`

#### Input ตัวอย่าง
- Organization Name: `ACME Fintech`
- Industry: `Financial Services`
- Team Size: `500–1000`
- Region: `Thailand`
- Timezone: `Asia/Bangkok`
- Security Contact Email: `security@acme-fintech.com`

#### System response
**Success**
- Toast: `Organization settings updated`
- Checklist item เปลี่ยนเป็น Completed

**Error**
- `Security contact email is invalid`
- `Timezone is required`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- มี owner และบริบทธุรกิจชัด
- พร้อมสำหรับ reporting / governance / security ownership

#### สิ่งที่ทีมต้องเก็บใน audit
- organization_updated

### Step 5 — Access Setup: ตั้ง role และเชิญผู้ใช้เข้าทีม

**Route:** `/dashboard/settings/access`  
**Actor:** Admin  
**Goal:** แยกหน้าที่ของคนสั่งงาน คนอนุมัติ และคนตรวจสอบอย่างชัดเจน

#### UI ที่ต้องมี
- Page title: `Roles and Access`
- Helper text: `Define who can execute, approve, review, and administer automation.`
- Sections:
  1. Role matrix
  2. User invitations
  3. Role assignment
- Default roles:
  - Admin
  - Operator
  - Approver
  - Auditor

#### Permission matrix ขั้นต่ำ

| Permission | Admin | Operator | Approver | Auditor |
|---|---|---|---|---|
| Run low-risk tasks | Yes | Yes | No | No |
| Run high-risk tasks | Yes | No | No | No |
| Approve high-risk tasks | Yes | No | Yes | No |
| View audit logs | Yes | Limited | Yes | Yes |
| Manage policies | Yes | No | No | No |
| Manage integrations | Yes | No | No | No |

#### Form ที่ต้องมี
- Invite User
  - Email
  - Role
- CTA:
  - `Invite User`
  - `Assign Role`
  - `Save Access Model`

#### Input ตัวอย่าง
- `nont@acme-fintech.com` → Operator
- `fon@acme-fintech.com` → Approver
- `audit@acme-fintech.com` → Auditor

#### System response
**Success**
- `Invitation sent`
- `Role assigned successfully`
- `Access model updated`

**Error**
- `User email is invalid`
- `At least one approver is required before high-risk policies can be activated`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ลด insider risk
- คนสั่งไม่เท่าคนอนุมัติ
- ทีม audit มีมุม read-only แยกชัดเจน

#### สิ่งที่ทีมต้องเก็บใน audit
- user_invited
- role_assigned
- role_changed

### Step 6 — Create First Policy: ตั้ง guardrail ก่อนรันงานจริง

**Route:** `/dashboard/policies`  
**Actor:** Admin  
**Goal:** บังคับให้ระบบ block หรือ require approval สำหรับงานเสี่ยงสูง

#### UI ที่ต้องมี
- Page title: `Policies`
- Helper text: `Policies decide what is allowed, blocked, or escalated before execution.`
- Primary CTA:
  - `Create Policy`

#### Form สำหรับ create policy
- Policy Name
- Description
- Trigger conditions
  - Task type
  - Data sensitivity
  - Destination
  - Risk level
- Action
  - Allow
  - Block
  - Require approval
- Reason Code
- Approval Group
- Optional:
  - Ticket required
  - Business justification required
  - Limit to sandbox only

#### Input ตัวอย่าง
- Policy Name: `PII export approval required`
- Task Type: `Data export`
- Data Sensitivity: `PII`
- Destination: `External`
- Risk Level: `High`
- Action: `Require approval`
- Reason Code: `HIGH_RISK_PII_EXPORT`
- Approval Group: `Approver Team`
- Ticket Required: `Yes`

#### CTA
- `Save Policy`
- `Activate Policy`

#### System response
**Success**
- `Policy saved`
- `Policy activated`
- Badge: `Active`

**Error**
- `Reason code is required for block or approval actions`
- `Approval group must be selected when action is Require approval`

#### สิ่งที่ต้องมีเพิ่มแบบ enterprise-grade
**Policy Outcome Preview**
ให้ระบบแสดงตัวอย่างการตัดสินใจ 3 แบบ:
- `Export customer list externally` → Approval required
- `Generate internal summary report` → Allowed
- `Export PII without ticket` → Blocked

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ระบบไม่ใช่ AI ที่รันตามคำสั่งแบบไร้ขอบเขต
- งานเสี่ยงถูกควบคุมก่อนเกิด incident

#### สิ่งที่ทีมต้องเก็บใน audit
- policy_created
- policy_activated
- policy_updated

### Step 7 — Integration Setup: เชื่อมระบบที่ต้องใช้จริง

**Route:** `/dashboard/integrations`  
**Actor:** Admin  
**Goal:** เปิดให้ use case ทำงานกับระบบเดิมของลูกค้าได้จริง แต่ยังคุม scope ได้

#### UI ที่ต้องมี
- Page title: `Integrations`
- Helper text: `Only approved systems and scopes can be used by automation.`
- Integration cards:
  - Slack
  - Email
  - Ticketing / ITSM
  - Internal API
  - Database
  - File Storage

#### ตัวอย่าง flow: เชื่อม Slack
Fields:
- Workspace Name
- Bot Token / Credential
- Allowed Channels
- Allowed Scopes

Input ตัวอย่าง:
- Workspace Name: `acme-ops`
- Allowed Channels: `#ops-daily`, `#incident-review`
- Allowed Scopes: `send_messages`, `read_channel_metadata`

CTA:
- `Connect`
- `Test Connection`

#### System response
**Success**
- `Connection successful`
- Status badge: `Healthy`
- Metadata: `Last tested just now`

**Error**
- `Authentication failed`
- `Missing required scope`
- `Connection timeout`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ระบบไม่จบแค่ในเดโม
- เชื่อมกับ environment จริงได้
- ขอบเขตการเชื่อมต่อถูกควบคุม

#### สิ่งที่ทีมต้องเก็บใน audit
- integration_connected
- integration_tested
- integration_failed

### Step 8 — Readiness Check: ตรวจว่าพร้อมใช้จริงก่อนส่ง execution

**Route:** `/dashboard/readiness` หรือ widget บน dashboard  
**Actor:** Admin  
**Goal:** ลดการ go-live แบบไม่พร้อม

#### UI ที่ต้องมี
- Page title: `Run Readiness Check`
- Helper text: `Validate the minimum requirements before running production workflows.`
- CTA:
  - `Run Check`

#### รายการตรวจขั้นต่ำ
- Organization profile completed
- At least 1 active policy
- At least 1 approver assigned
- At least 1 healthy integration
- Access model saved
- Audit logging enabled

#### ผลลัพธ์ที่ต้องแสดง
3 สถานะ:
- Pass
- Warning
- Fail

ตัวอย่าง:
- Organization profile — Pass
- Access roles configured — Pass
- Active approval policy — Pass
- Healthy integration — Warning
- Audit export configured — Fail

CTA ต่อรายการ:
- `Fix now`
- `Go to settings`
- `Assign approver`
- `Connect integration`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- รู้จุดขาดก่อนรันจริง
- ลดความเสี่ยงจาก setup ไม่ครบ

#### สิ่งที่ทีมต้องเก็บใน audit
- readiness_check_run
- readiness_check_failed
- readiness_check_passed

### Step 9 — First Execution: Operator ส่งคำสั่งงานครั้งแรก

**Route:** `/dashboard/command-center`  
**Actor:** Operator  
**Goal:** ให้ผู้ใช้ส่ง intent งานจริงแบบมีข้อมูลกำกับพอสำหรับ policy และ audit

#### UI ที่ต้องมี
- Page title: `Command Center`
- Helper text: `Submit an automation request with enough business context for policy and approval decisions.`
- Form fields:
  - Request / Instruction
  - Task Type
  - Business Justification
  - Ticket ID
  - Target System
  - Output Destination

#### Input ตัวอย่าง (low-risk)
- Request: `Generate daily operations summary and send to #ops-daily`
- Task Type: `Reporting`
- Business Justification: `Daily operations reporting`
- Ticket ID: `OPS-1024`
- Target System: `Slack`
- Output Destination: `#ops-daily`

#### CTA
- `Review Request`

#### Validation
- request ห้ามว่าง
- task type ต้องถูกเลือก
- ถ้า policy ระบุว่าต้องมี ticket ต้องบังคับกรอก ticket

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ผู้ใช้ไม่ได้ยิงคำสั่งแบบลอยๆ
- ระบบเริ่มจาก business context ไม่ใช่ prompt อย่างเดียว

#### สิ่งที่ทีมต้องเก็บใน audit
- execution_request_created

### Step 10 — Review Before Execute: สรุปความเสี่ยงก่อนรัน

**Route:** modal / review page ก่อน execute  
**Actor:** Operator  
**Goal:** ให้ผู้ใช้เห็นว่าระบบตีความ request อย่างไร ก่อนเกิดการรันจริง

#### UI ที่ต้องมี
- Section: `Detected Intent`
- Section: `Risk Assessment`
- Section: `Policy Match`
- Section: `Target Systems`
- Section: `Expected Output`

#### ตัวอย่างที่ต้องแสดง
- Detected Intent: `Daily operational report delivery`
- Risk Assessment: `Low`
- Policy Match: `2 checks passed`
- Target System: `Slack / #ops-daily`
- Expected Output: `Summarized daily operations report`

#### CTA ตาม outcome
- `Run Now`
- `Cancel`
- `Submit for Approval`
- `Edit Request`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ลดการ execute ผิด
- ระบบช่วยตีความและสรุปก่อนลงมือทำ

#### สิ่งที่ทีมต้องเก็บใน audit
- execution_reviewed
- policy_evaluated

### Step 11 — Outcome A: เคสที่ “ผ่าน” และรันได้ทันที

**Route:** `/dashboard/executions/:id`  
**Actor:** Operator  
**Goal:** ให้ลูกค้าเห็น execution trace แบบโปร่งใส

#### ตัวอย่าง use case
- daily operations summary
- internal low-risk reporting

#### UI ที่ต้องมี
- Status badge: `Running` → `Completed`
- Execution ID
- Started by
- Started at
- Policy result
- Timeline / Steps
- Output preview

#### ตัวอย่าง timeline
1. Fetch source data
2. Summarize content
3. Validate output
4. Deliver to Slack

#### System response
**Success**
- `Execution completed`
- `Output delivered successfully`

**Error**
- `Delivery failed`
- `Retry scheduled`
- `Manual review required`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- งานวิ่งจริง
- มี trace ไม่ใช่ black box

#### สิ่งที่ทีมต้องเก็บใน audit
- execution_started
- execution_completed
- execution_failed
- retry_scheduled

### Step 12 — Outcome B: เคสที่ “ถูก block” ก่อนเกิดความเสียหาย

**Route:** review page / execution detail  
**Actor:** Operator  
**Goal:** ให้ลูกค้าเห็นคุณค่าหลักของระบบทันที: block ก่อนผิดพลาด

#### ตัวอย่าง use case
- `Export customer contact list and send externally`
- ไม่มี ticket
- ไม่มี approval
- แตะ PII

#### UI ที่ต้องมี
- Status badge: `Blocked`
- Reason Code
- Explanation
- Next action guidance

#### ตัวอย่างที่ต้องแสดง
- Risk Assessment: `High`
- Policy Result: `Blocked`
- Reason Code: `HIGH_RISK_PII_EXPORT`
- Explanation: `External delivery of PII requires approved ticket and approver sign-off.`

#### CTA
- `Attach Ticket`
- `Submit for Approval`
- `Edit Request`

#### สิ่งที่ห้ามทำ
- ห้ามมี CTA ที่ run ต่อได้ตรงๆ
- ห้ามแสดง error แบบกว้างเกิน เช่น `Request failed`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ระบบช่วยหยุด incident ก่อนเกิด
- governance อยู่ใน flow ไม่ใช่ตามแก้ทีหลัง

#### สิ่งที่ทีมต้องเก็บใน audit
- execution_blocked
- policy_blocked
- reason_code_logged

### Step 13 — Outcome C: เคสที่ “ต้องขออนุมัติ”

**Route:** `/dashboard/executions/:id` หรือ `/dashboard/approvals`  
**Actor:** Operator → Approver  
**Goal:** ให้ high-risk work เดินต่อได้ในเส้นทางที่ควบคุมได้

#### ตัวอย่าง use case
- `Export customer transaction anomalies for fraud review`
- มี ticket แล้ว
- policy ระบุว่า approval required

#### Operator UI
- Status: `Pending Approval`
- Approval ID
- Sent to Approver Team
- Submitted at

#### CTA
- `Submit for Approval`

#### System response
- `Approval request submitted`
- `Awaiting approver decision`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- งานเสี่ยงไม่ได้ถูก block ทิ้งเสมอไป
- มี controlled path ให้เดินต่อ

#### สิ่งที่ทีมต้องเก็บใน audit
- approval_requested

### Step 14 — Approval Inbox: Approver ตรวจและตัดสินใจ

**Route:** `/dashboard/approvals`  
**Actor:** Approver  
**Goal:** ให้ approver ตัดสินใจบนข้อมูลที่พอและตรวจสอบได้

#### UI ที่ต้องมี
- Table / queue ของ pending approvals
- Filters:
  - Pending
  - High Risk
  - Submitted Today
- Detail view ต้องแสดง:
  - Request summary
  - Requested by
  - Business justification
  - Ticket ID
  - Matched policies
  - Data sensitivity
  - Target systems
  - Scope of execution

#### CTA
- `Approve`
- `Reject`
- `Request Changes`

#### เมื่อกด Approve ควรมี modal
Fields:
- Approval Note
- Expiration Window
- Scope Restriction (optional)
  - single run only
  - read-only only
  - limited destination only

#### System response
**Approve**
- `Approval granted`
- `Execution released`

**Reject**
- `Approval rejected`
- `Reason logged`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- 4-eyes control ใช้งานได้จริง
- คนอนุมัติมีข้อมูลครบพอจะตัดสินใจ

#### สิ่งที่ทีมต้องเก็บใน audit
- approval_granted
- approval_rejected
- approval_note_added

### Step 15 — Executions List: ติดตามทุกงานในที่เดียว

**Route:** `/dashboard/executions`  
**Actor:** Admin / Operator / Approver / Auditor  
**Goal:** ให้ทุกฝ่ายเห็น lifecycle ของงานแบบเดียวกัน

#### UI ที่ต้องมี
Columns:
- Execution ID
- Request Summary
- Requested By
- Risk Level
- Policy Result
- Approval Status
- Execution Status
- Duration
- Created At

#### Filters
- Status
- Risk Level
- Policy Result
- Team
- Date Range

#### Detail view ต้องมี
- Timeline
- Input summary
- Policy decisions
- Approval history
- Output preview
- Failure reason / recovery status

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ตามงานได้จริง
- ไม่ต้องเดาว่างานหายไปไหนหรือค้างตรงไหน

#### สิ่งที่ทีมต้องเก็บใน audit
- execution_viewed

### Step 16 — Audit / Replay / Proof: ตรวจย้อนหลังให้ตอบคำถามได้ทันที

**Route:** `/dashboard/audit`  
**Actor:** Auditor / Admin / Approver  
**Goal:** ทำให้ระบบพร้อมสำหรับ internal audit, compliance, และ incident review

#### UI ที่ต้องมี
Tabs:
- Audit Log
- Replay
- Proof
- Export

#### Audit log fields
- Event Time
- Actor
- Action
- Resource
- Policy Result
- Reason Code
- Execution ID
- Correlation ID

#### ตัวอย่าง event ที่ต้องมี
- user_logged_in
- role_changed
- policy_created
- request_submitted
- approval_granted
- execution_blocked
- execution_completed

#### CTA
- `Export CSV`
- `Export PDF`
- `Replay Execution`
- `View Proof`

#### Replay view ต้องแสดง
- Original request
- Policy snapshot ณ เวลาที่รัน
- Approval state ณ เวลาที่รัน
- Decision path
- Output / failure trace

#### ลูกค้าเห็นคุณค่าอะไรทันที
- ถูกถามย้อนหลังแล้วตอบได้
- ลดเวลาตามหลักฐานหลายระบบ

#### สิ่งที่ทีมต้องเก็บใน audit
- audit_exported
- replay_viewed
- proof_viewed

### Step 17 — Usage / Capacity / Billing: คุมต้นทุนก่อน scale

**Route:** `/dashboard/usage` และ `/dashboard/billing`  
**Actor:** Admin / Finance / Ops Owner  
**Goal:** ให้ลูกค้าเห็นว่า usage เพิ่มขึ้นแล้วต้นทุนยังถูกควบคุม

#### UI ที่ต้องมี
Widgets:
- Total Executions
- Success Rate
- Failure Rate
- Team Quota Usage
- Monthly Spend
- Burn Rate
- Overage Alerts

#### Team-level breakdown
- Operations Team
- Fraud Team
- Compliance Team

#### Alert examples
- `Fraud Team has used 82% of monthly quota`
- `Projected overage in 6 days`
- `Cost per successful execution increased 14% week over week`

#### ลูกค้าเห็นคุณค่าอะไรทันที
- เห็น cost governance ไม่ใช่เห็นแค่ usage
- พร้อมคุยเรื่อง rollout หลายทีมได้

#### สิ่งที่ทีมต้องเก็บใน audit
- billing_viewed
- usage_alert_triggered

---

## 0.5 Demo Flow ที่ต้องพิสูจน์ให้ลูกค้าเห็นใน 15 นาที

เดโมมาตรฐานต้องแสดง 4 เคสนี้ให้ครบ:

1. **Signup + onboarding checklist**
   - พิสูจน์ว่าเริ่มใช้งานได้แบบองค์กรจริง

2. **Policy ที่ block งานเสี่ยง**
   - พิสูจน์ว่าระบบหยุด incident ก่อนเกิด

3. **Execution ที่ต้อง approval**
   - พิสูจน์ว่า 4-eyes control ใช้งานได้จริง

4. **Audit / Replay / Proof**
   - พิสูจน์ว่าระบบตอบคำถามย้อนหลังได้ทันที

> ถ้าเดโมยังไม่แสดงครบ 4 เคสนี้ ถือว่ายังไม่ได้พิสูจน์คุณค่าหลักของระบบ

---

## 0.6 Acceptance Criteria สำหรับทีมพัฒนา

ถือว่า Section 0 นี้ “พร้อมใช้” เมื่อครบทุกข้อ:

- มี onboarding checklist หลัง login ครั้งแรก
- มี role model อย่างน้อย Admin / Operator / Approver / Auditor
- มี create policy flow พร้อม action = allow / block / require approval
- มี policy outcome preview ก่อน activate
- มี integration connect + test connection
- มี readiness check แบบ pass / warn / fail
- มี command center ที่บังคับ business context ขั้นต่ำ
- มี review-before-execute ก่อน run จริง
- มี outcome ครบ 3 แบบ: pass / blocked / pending approval
- มี approval inbox สำหรับ approver
- มี execution detail ที่แสดง timeline และ decision trace
- มี audit log / replay / proof / export
- มี usage / quota / billing summary ระดับทีม

---

## 0.7 สิ่งที่ห้ามขาด ถ้าต้องการ UX ระดับ enterprise

- ห้ามให้ผู้ใช้ login แล้วเจอ dashboard ว่างโดยไม่มี next step
- ห้ามให้ policy เป็นแค่ config list ที่ไม่อธิบาย outcome
- ห้ามให้ execution run ทันทีโดยไม่มี review state
- ห้ามให้ blocked state ตอบแค่ failed โดยไม่มี reason code
- ห้ามให้ approver ต้องตัดสินใจจากข้อมูลไม่ครบ
- ห้ามให้ audit เป็นแค่ raw log ที่ใช้งานจริงไม่ได้
- ห้ามให้ usage แสดงแต่จำนวนครั้ง โดยไม่แสดง quota / burn / cost

---

## 0.8 คุณค่าที่ลูกค้าต้องรู้สึกได้หลังจบ flow นี้

เมื่อจบ flow นี้ ลูกค้าต้องตอบได้ด้วยตัวเองว่า:

- ระบบนี้ช่วยหยุดงานเสี่ยงก่อนเกิด incident ได้
- ระบบนี้แยกคนสั่ง คนอนุมัติ และคนตรวจสอบได้ชัด
- ระบบนี้เชื่อมกับระบบเดิมและทำงานจริงได้
- ระบบนี้ตรวจย้อนหลังได้แบบพร้อม audit
- ระบบนี้ขยายใช้งานได้โดยไม่เสียการควบคุมต้นทุน

> ถ้าลูกค้ายังตอบ 5 ข้อนี้ไม่ได้ แปลว่า flow ยังไม่สื่อคุณค่าหลักของผลิตภัณฑ์ได้ชัดพอ
