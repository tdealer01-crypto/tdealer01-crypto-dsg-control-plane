# Enterprise Customer Simulation: AI Automation Safety & Error Reduction (Thai)

เอกสารนี้เป็น **Role-play มุมมองลูกค้าองค์กร** เพื่อใช้ตรวจหา “สิ่งที่ขาด” ในการใช้งานแอปสำหรับงาน AI อัตโนมัติ โดยเน้น 2 เป้าหมายหลัก:

1. เพิ่มความปลอดภัย (Security + Governance)
2. ลดความผิดพลาดจากการทำงานอัตโนมัติ (Operational Error Reduction)

---

## 0) สถานการณ์จำลองแบบ “เห็นภาพชัดตั้งแต่สมัครจนได้ผลลัพธ์”

> เป้าหมายส่วนนี้คือทำให้ทีม Product/Sales/CS ใช้สาธิตลูกค้าได้ทันที: ลูกค้า “ต้องกดอะไร ใส่อะไร ไปหน้าไหน แล้วได้ประโยชน์อะไร”

### ตัวละครในเดโม

- **เมย์ (Admin องค์กร):** สมัครและตั้งค่าองค์กร
- **นนท์ (Operator):** สั่งงาน AI อัตโนมัติ
- **ฝน (Approver/Auditor):** อนุมัติงานเสี่ยงสูงและตรวจสอบย้อนหลัง

### เส้นทางใช้งานแบบจับต้องได้ (Click-by-click)

1) **สมัครใช้งาน**
- ไปหน้า `Signup` → กรอกอีเมลองค์กร + รหัสผ่าน/ลิงก์ยืนยัน
- ได้ประโยชน์: สร้าง tenant องค์กรแยกข้อมูลชัดเจน
- ทำไมต้องมี: ลดความเสี่ยงข้อมูลปนกันหลายองค์กร

2) **ล็อกอินครั้งแรก + ผูกองค์กร**
- ไปหน้า `Login` หรือ `Password Login` → ยืนยันตัวตน
- ไป `Request Access` (ถ้ามี flow ขอสิทธิ์) เพื่อเข้าทีม
- ได้ประโยชน์: คนในทีมเข้าใช้งานด้วยบริบทองค์กรเดียวกัน
- ทำไมต้องมี: ตรวจสอบสิทธิ์และ audit ได้ว่าใครอยู่ทีมไหน

3) **ตั้งค่า SSO / RBAC**
- ไป `Dashboard > Settings` และ `Dashboard > Policies/Access`
- แอดมิน map role: Admin / Operator / Approver / Auditor
- ได้ประโยชน์: แยกหน้าที่ชัดเจน คนสั่งงานไม่เท่าคนอนุมัติ
- ทำไมต้องมี: ลด human error และลด insider risk

4) **สร้างนโยบายความปลอดภัยก่อนรันงาน**
- ไป `Dashboard > Policies`
- เพิ่มกฎ: งานที่แตะข้อมูลสำคัญต้องขออนุมัติ, งานเสี่ยงสูงต้อง block ถ้าไม่มี ticket
- ได้ประโยชน์: AI ไม่สามารถ “ทำเกินสิทธิ์” ได้เอง
- ทำไมต้องมี: คุมความเสี่ยงก่อนเกิด incident

5) **เชื่อมต่อเครื่องมือ/ตัวรันงาน**
- ไป `Dashboard > Integration` และ `Dashboard > Agents/Skills`
- เลือก executor ที่อนุญาต, จำกัด scope, ใส่ค่าเชื่อมต่อที่จำเป็น
- ได้ประโยชน์: เปิดใช้งาน automation ได้จริงกับระบบเดิมของลูกค้า
- ทำไมต้องมี: ถ้าไม่เชื่อม integration งานจะจบแค่ demo

6) **ทดลองสั่งงานจริง (Pilot)**
- ไป `Dashboard > Command Center` หรือหน้า execute ที่ทีมใช้
- Operator ส่ง intent งาน เช่น “สรุปรายงานเคสรายวัน”
- ระบบวิ่ง flow intent → policy gate → execution
- ได้ประโยชน์: เริ่มเห็นผลผลิตงานเร็วขึ้นแบบควบคุมได้
- ทำไมต้องมี: พิสูจน์คุณค่าใน use case จริง ไม่ใช่แค่ PoC

7) **อนุมัติงานเสี่ยงสูง**
- Approver เข้า `Dashboard > Operations/Executions`
- ตรวจ reason + risk + scope แล้วกดอนุมัติ/ปฏิเสธ
- ได้ประโยชน์: เกิด 4-eyes control ในงานสำคัญ
- ทำไมต้องมี: ลดความผิดพลาดรุนแรงจากการตัดสินใจอัตโนมัติ

8) **ตรวจสอบผลลัพธ์และหลักฐาน**
- เข้า `Dashboard > Audit`, `Ledger`, `Replay`, `Proofs`
- ดูว่าใครสั่งงาน, policy ไหนผ่าน/ไม่ผ่าน, มีหลักฐานอะไร
- ได้ประโยชน์: ตรวจย้อนหลังได้ทันทีเมื่อมีข้อสงสัย
- ทำไมต้องมี: compliance และ incident response เร็วขึ้น

9) **ดูต้นทุนและขีดจำกัด**
- เข้า `Dashboard > Capacity`, `Billing`, `Usage`
- ตั้ง quota ทีม, แจ้งเตือน usage สูงผิดปกติ
- ได้ประโยชน์: คุมค่าใช้จ่ายก่อนบานปลาย
- ทำไมต้องมี: scale ได้อย่างยั่งยืน

10) **ปิดลูปปรับปรุงทุกสัปดาห์**
- ประชุม review จาก metrics + failures + policy violations
- ปรับ policy, approval SLA, และ automation scope
- ได้ประโยชน์: แม่นขึ้น ปลอดภัยขึ้น ต้นทุนดีขึ้นต่อเนื่อง
- ทำไมต้องมี: ให้ผลลัพธ์ธุรกิจดีขึ้นจริง ไม่ใช่ใช้ระบบแล้วคงที่



## 0.9 API / Backend Contract ต่อหน้า (สำหรับทีมพัฒนา)

> ส่วนนี้กำหนด contract ขั้นต่ำที่ frontend / backend / QA ต้องใช้ร่วมกัน  
> เพื่อให้ click-by-click flow ใน Section 0 ทำงานได้จริงแบบ enterprise-grade  
> โดยเน้น 4 เรื่อง:
> 1. request / response ชัด
> 2. status state ชัด
> 3. validation / error ชัด
> 4. audit event ครบ

> หมายเหตุ:
> - ตัวอย่างนี้ใช้รูปแบบ REST
> - สามารถ map ไปใช้กับ Next.js Route Handlers / Express / NestJS / Go / Rails ได้
> - field name สามารถปรับได้ แต่ logic และ state ไม่ควรหาย

---

### 0.9.1 Shared Response Shape

ทุก endpoint สำคัญควรตอบในรูปแบบมาตรฐานเดียวกัน

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {},
  "error": null,
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-04-12T10:00:00Z"
  }
}
```

กรณี error

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Please enter a valid work email"
      }
    ]
  },
  "meta": {
    "requestId": "req_124",
    "timestamp": "2026-04-12T10:00:01Z"
  }
}
```

---

### 0.9.2 Shared Domain Status

ระบบควรใช้ status กลางชุดเดียวกันเพื่อลดความสับสนทั้ง frontend / backend / audit

Onboarding status

- `not_started`
- `in_progress`
- `completed`

Policy status

- `draft`
- `active`
- `inactive`
- `archived`

Integration status

- `not_connected`
- `healthy`
- `degraded`
- `failed`

Execution status

- `draft`
- `pending_review`
- `pending_approval`
- `blocked`
- `running`
- `completed`
- `failed`
- `recovered`
- `cancelled`

Approval status

- `not_required`
- `pending`
- `approved`
- `rejected`
- `expired`

---

### 0.9.3 Signup / Organization Creation

`POST /api/auth/signup`

ใช้สำหรับสร้าง user แรก + organization แรก

Request:

```json
{
  "email": "admin@acme-fintech.com",
  "password": "********",
  "confirmPassword": "********",
  "organizationName": "ACME Fintech",
  "acceptTerms": true
}
```

Success response:

```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "userId": "usr_001",
    "organizationId": "org_001",
    "emailVerificationRequired": true,
    "nextRoute": "/verify-email/pending"
  },
  "error": null,
  "meta": {
    "requestId": "req_signup_001",
    "timestamp": "2026-04-12T10:01:00Z"
  }
}
```

Validation rules:

- email ต้อง valid
- password >= 8 chars
- confirmPassword ต้องตรงกัน
- organizationName ห้ามว่าง
- acceptTerms ต้องเป็น true

Audit events:

- `account_created`
- `organization_created`

---

### 0.9.4 Email Verification

`POST /api/auth/verify-email`

Request:

```json
{
  "token": "email_verification_token"
}
```

Success response:

```json
{
  "success": true,
  "message": "Email verified",
  "data": {
    "verified": true,
    "nextRoute": "/login"
  }
}
```

Failure cases:

- token หมดอายุ
- token ไม่ถูกต้อง
- token ถูกใช้แล้ว

Audit events:

- `email_verified`

---

### 0.9.5 Login

`POST /api/auth/login`

Request:

```json
{
  "email": "admin@acme-fintech.com",
  "password": "********"
}
```

Success response:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt_or_session_token",
    "refreshToken": "refresh_token_if_used",
    "user": {
      "id": "usr_001",
      "email": "admin@acme-fintech.com",
      "role": "admin"
    },
    "organization": {
      "id": "org_001",
      "name": "ACME Fintech"
    },
    "nextRoute": "/dashboard"
  }
}
```

Audit events:

- `login_success`
- `login_failed`

---

### 0.9.6 First-Run Checklist

`GET /api/onboarding/checklist`

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "key": "organization_profile",
        "label": "Complete organization profile",
        "status": "completed",
        "route": "/dashboard/settings/organization"
      },
      {
        "key": "roles_access",
        "label": "Set roles and access",
        "status": "in_progress",
        "route": "/dashboard/settings/access"
      },
      {
        "key": "first_policy",
        "label": "Create your first policy",
        "status": "not_started",
        "route": "/dashboard/policies"
      },
      {
        "key": "integrations",
        "label": "Connect your integrations",
        "status": "not_started",
        "route": "/dashboard/integrations"
      },
      {
        "key": "first_execution",
        "label": "Complete Auto-Setup",
        "status": "not_started",
        "route": "/dashboard/command-center"
      }
    ]
  }
}
```

Logic:

- backend เป็นคนคำนวณ checklist state
- frontend แสดงผลอย่างเดียว

Audit events:

- `onboarding_started`
- `onboarding_progressed`

---

### 0.9.7 Organization Settings

- `GET /api/organization/settings`
- `PUT /api/organization/settings`

Request:

```json
{
  "organizationName": "ACME Fintech",
  "industry": "Financial Services",
  "teamSize": "500-1000",
  "region": "Thailand",
  "timezone": "Asia/Bangkok",
  "securityContactEmail": "security@acme-fintech.com"
}
```

Success response:

```json
{
  "success": true,
  "message": "Organization settings updated",
  "data": {
    "organizationId": "org_001",
    "updatedAt": "2026-04-12T10:05:00Z"
  }
}
```

Audit events:

- `organization_updated`

---

### 0.9.8 Roles / Access / Invitations

- `GET /api/access/roles` (ดึง role matrix)
- `GET /api/access/users` (ดึงสมาชิกในองค์กร)
- `POST /api/access/invitations`

Request:

```json
{
  "email": "nont@acme-fintech.com",
  "role": "operator"
}
```

Success response:

```json
{
  "success": true,
  "message": "Invitation sent",
  "data": {
    "invitationId": "inv_001",
    "email": "nont@acme-fintech.com",
    "role": "operator",
    "status": "pending"
  }
}
```

- `PUT /api/access/users/:userId/role`

Request:

```json
{
  "role": "approver"
}
```

Validation rules:

- high-risk policy จะ activate ไม่ได้ถ้ายังไม่มี approver อย่างน้อย 1 คน
- auditor ห้ามมี permission execute
- operator ห้าม approve

Audit events:

- `user_invited`
- `role_assigned`
- `role_changed`

---

### 0.9.9 Policies

- `GET /api/policies`
- `POST /api/policies`
- `PUT /api/policies/:policyId`
- `POST /api/policies/:policyId/activate`
- `POST /api/policies/preview`

Create policy request

```json
{
  "name": "PII export approval required",
  "description": "Require approval before exporting PII externally",
  "conditions": {
    "taskType": ["data_export"],
    "dataSensitivity": ["pii"],
    "destination": ["external"],
    "riskLevel": ["high"]
  },
  "action": "require_approval",
  "reasonCode": "HIGH_RISK_PII_EXPORT",
  "approvalGroup": "approver_team",
  "ticketRequired": true,
  "businessJustificationRequired": true,
  "sandboxOnly": false
}
```

Success response

```json
{
  "success": true,
  "message": "Policy saved",
  "data": {
    "policyId": "pol_001",
    "status": "draft"
  }
}
```

Activate response

```json
{
  "success": true,
  "message": "Policy activated",
  "data": {
    "policyId": "pol_001",
    "status": "active"
  }
}
```

Preview request

```json
{
  "sampleRequests": [
    {
      "request": "Export customer list externally",
      "taskType": "data_export",
      "dataSensitivity": "pii",
      "destination": "external",
      "ticketId": null
    },
    {
      "request": "Generate internal daily summary",
      "taskType": "reporting",
      "dataSensitivity": "internal",
      "destination": "internal"
    }
  ]
}
```

Preview response:

```json
{
  "success": true,
  "data": {
    "results": [
      {
        "request": "Export customer list externally",
        "outcome": "require_approval",
        "reasonCode": "HIGH_RISK_PII_EXPORT"
      },
      {
        "request": "Generate internal daily summary",
        "outcome": "allow",
        "reasonCode": null
      }
    ]
  }
}
```

Audit events:

- `policy_created`
- `policy_updated`
- `policy_activated`
- `policy_previewed`

---

### 0.9.10 Integrations

- `GET /api/integrations`
- `POST /api/integrations/:provider/connect`
- `POST /api/integrations/:provider/test`

ตัวอย่าง provider = slack

Connect request:

```json
{
  "workspaceName": "acme-ops",
  "credentials": {
    "botToken": "encrypted_or_secret_reference"
  },
  "allowedChannels": ["#ops-daily", "#incident-review"],
  "allowedScopes": ["send_messages", "read_channel_metadata"]
}
```

Success response:

```json
{
  "success": true,
  "message": "Connection successful",
  "data": {
    "integrationId": "int_001",
    "provider": "slack",
    "status": "healthy",
    "lastTestedAt": "2026-04-12T10:10:00Z"
  }
}
```

Test response:

```json
{
  "success": true,
  "message": "Connection test passed",
  "data": {
    "status": "healthy",
    "checks": [
      {
        "name": "authentication",
        "status": "pass"
      },
      {
        "name": "required_scope",
        "status": "pass"
      }
    ]
  }
}
```

Audit events:

- `integration_connected`
- `integration_tested`
- `integration_failed`

---

### 0.9.11 Readiness Check

`POST /api/readiness/run`

Response:

```json
{
  "success": true,
  "message": "Readiness check completed",
  "data": {
    "overallStatus": "warning",
    "checks": [
      {
        "key": "organization_profile",
        "status": "pass",
        "message": "Organization profile completed"
      },
      {
        "key": "active_policy",
        "status": "pass",
        "message": "At least one active policy found"
      },
      {
        "key": "approver_assigned",
        "status": "pass",
        "message": "Approver assigned"
      },
      {
        "key": "healthy_integration",
        "status": "warning",
        "message": "One integration is degraded"
      },
      {
        "key": "audit_logging",
        "status": "fail",
        "message": "Audit export configuration missing"
      }
    ]
  }
}
```

Allowed statuses:

- `pass`
- `warning`
- `fail`

Audit events:

- `readiness_check_run`
- `readiness_check_passed`
- `readiness_check_failed`

---

### 0.9.12 Create Execution Request

`POST /api/executions`

Request:

```json
{
  "request": "Generate daily operations summary and send to #ops-daily",
  "taskType": "reporting",
  "businessJustification": "Daily operations reporting",
  "ticketId": "OPS-1024",
  "targetSystem": "slack",
  "outputDestination": "#ops-daily"
}
```

Success response:

```json
{
  "success": true,
  "message": "Execution request created",
  "data": {
    "executionId": "exe_001",
    "status": "pending_review"
  }
}
```

Validation rules:

- request ห้ามว่าง
- taskType ต้องมี
- ถ้า policy ต้องใช้ ticket ห้ามปล่อยผ่านถ้าไม่มี ticket
- businessJustification ต้องบังคับใน high-risk categories

Audit events:

- `execution_request_created`

---

### 0.9.13 Review Request / Policy Evaluation

`POST /api/executions/:executionId/review`

Response ตัวอย่างกรณี low-risk:

```json
{
  "success": true,
  "message": "Execution reviewed",
  "data": {
    "executionId": "exe_001",
    "status": "pending_review",
    "detectedIntent": "daily_operational_report_delivery",
    "riskLevel": "low",
    "policyEvaluation": {
      "outcome": "allow",
      "matchedPolicies": ["pol_001"],
      "reasonCode": null
    },
    "targetSystems": ["slack"],
    "expectedOutput": "Summarized daily operations report",
    "nextAction": "run_now"
  }
}
```

Response ตัวอย่างกรณี blocked:

```json
{
  "success": true,
  "message": "Execution reviewed",
  "data": {
    "executionId": "exe_002",
    "status": "blocked",
    "detectedIntent": "external_pii_export",
    "riskLevel": "high",
    "policyEvaluation": {
      "outcome": "blocked",
      "matchedPolicies": ["pol_002"],
      "reasonCode": "HIGH_RISK_PII_EXPORT"
    },
    "nextAction": "attach_ticket_or_request_approval"
  }
}
```

Response ตัวอย่างกรณี approval required:

```json
{
  "success": true,
  "message": "Execution reviewed",
  "data": {
    "executionId": "exe_003",
    "status": "pending_review",
    "detectedIntent": "fraud_review_export",
    "riskLevel": "high",
    "policyEvaluation": {
      "outcome": "require_approval",
      "matchedPolicies": ["pol_003"],
      "reasonCode": "HIGH_RISK_EXPORT_APPROVAL"
    },
    "nextAction": "submit_for_approval"
  }
}
```

Audit events:

- `execution_reviewed`
- `policy_evaluated`
- `execution_blocked`

---

### 0.9.14 Run Execution

`POST /api/executions/:executionId/run`

ใช้ได้เฉพาะเมื่อ policy outcome = allow หรือ approval status = approved

Success response:

```json
{
  "success": true,
  "message": "Execution started",
  "data": {
    "executionId": "exe_001",
    "status": "running",
    "startedAt": "2026-04-12T10:15:00Z"
  }
}
```

Blocked response:

```json
{
  "success": false,
  "message": "Execution cannot be started",
  "error": {
    "code": "APPROVAL_REQUIRED",
    "details": [
      {
        "field": "approvalStatus",
        "message": "High-risk execution requires approval before run"
      }
    ]
  }
}
```

Audit events:

- `execution_started`

---

### 0.9.15 Submit for Approval

`POST /api/executions/:executionId/submit-approval`

Request:

```json
{
  "approvalGroup": "approver_team"
}
```

Success response:

```json
{
  "success": true,
  "message": "Approval request submitted",
  "data": {
    "executionId": "exe_003",
    "approvalId": "apr_001",
    "approvalStatus": "pending",
    "status": "pending_approval"
  }
}
```

Audit events:

- `approval_requested`

---

### 0.9.16 Approval Inbox

- `GET /api/approvals?status=pending`
- `GET /api/approvals/:approvalId`

Approval detail response:

```json
{
  "success": true,
  "data": {
    "approvalId": "apr_001",
    "executionId": "exe_003",
    "requestedBy": "nont@acme-fintech.com",
    "requestSummary": "Export customer transaction anomalies for fraud review",
    "businessJustification": "Fraud investigation",
    "ticketId": "RISK-2208",
    "riskLevel": "high",
    "dataSensitivity": "sensitive",
    "matchedPolicies": ["pol_003"],
    "targetSystems": ["internal_api"],
    "approvalStatus": "pending"
  }
}
```

---

### 0.9.17 Approve / Reject

`POST /api/approvals/:approvalId/approve`

Request:

```json
{
  "approvalNote": "Approved for single-run fraud review",
  "expirationWindowMinutes": 60,
  "scopeRestriction": {
    "singleRunOnly": true,
    "readOnlyOnly": true
  }
}
```

Success response:

```json
{
  "success": true,
  "message": "Approval granted",
  "data": {
    "approvalId": "apr_001",
    "approvalStatus": "approved",
    "executionStatus": "pending_review"
  }
}
```

`POST /api/approvals/:approvalId/reject`

Request:

```json
{
  "reason": "Business justification insufficient"
}
```

Success response:

```json
{
  "success": true,
  "message": "Approval rejected",
  "data": {
    "approvalId": "apr_001",
    "approvalStatus": "rejected"
  }
}
```

Audit events:

- `approval_granted`
- `approval_rejected`
- `approval_note_added`

---

### 0.9.18 Execution Detail / Timeline

`GET /api/executions/:executionId`

Response:

```json
{
  "success": true,
  "data": {
    "executionId": "exe_001",
    "status": "completed",
    "approvalStatus": "not_required",
    "policyResult": "allow",
    "riskLevel": "low",
    "requestSummary": "Generate daily operations summary and send to #ops-daily",
    "requestedBy": "nont@acme-fintech.com",
    "startedAt": "2026-04-12T10:15:00Z",
    "completedAt": "2026-04-12T10:16:10Z",
    "timeline": [
      {
        "step": "fetch_data",
        "status": "completed",
        "timestamp": "2026-04-12T10:15:10Z"
      },
      {
        "step": "summarize",
        "status": "completed",
        "timestamp": "2026-04-12T10:15:40Z"
      },
      {
        "step": "deliver_output",
        "status": "completed",
        "timestamp": "2026-04-12T10:16:05Z"
      }
    ],
    "outputPreview": "Daily summary generated successfully",
    "failureReason": null,
    "recoveryStatus": null
  }
}
```

Audit events:

- `execution_viewed`

---

### 0.9.19 Audit Log / Replay / Proof

`GET /api/audit/logs`

รองรับ filter:

- actor
- action
- executionId
- policyResult
- dateFrom
- dateTo

`GET /api/audit/executions/:executionId/replay`

Response:

```json
{
  "success": true,
  "data": {
    "executionId": "exe_001",
    "originalRequest": "Generate daily operations summary and send to #ops-daily",
    "policySnapshot": {
      "matchedPolicies": ["pol_001"],
      "outcome": "allow"
    },
    "approvalSnapshot": {
      "status": "not_required"
    },
    "decisionPath": [
      "request_received",
      "policy_evaluated",
      "execution_started",
      "execution_completed"
    ],
    "outputTrace": "Delivered to Slack #ops-daily"
  }
}
```

`GET /api/audit/executions/:executionId/proof`

Response:

```json
{
  "success": true,
  "data": {
    "executionId": "exe_001",
    "proofId": "prf_001",
    "generatedAt": "2026-04-12T10:16:20Z",
    "downloadUrl": "/api/audit/proof/prf_001/download"
  }
}
```

- `GET /api/audit/export?format=csv`
- `GET /api/audit/export?format=pdf`

Audit events:

- `audit_exported`
- `replay_viewed`
- `proof_viewed`

---

### 0.9.20 Usage / Billing / Capacity

`GET /api/usage/summary`

Response:

```json
{
  "success": true,
  "data": {
    "totalExecutions": 1240,
    "successRate": 0.94,
    "failureRate": 0.06,
    "monthlySpend": 1820.45,
    "burnRate": 61.2,
    "quotaUsage": [
      {
        "team": "Operations",
        "used": 420,
        "limit": 600
      },
      {
        "team": "Fraud",
        "used": 820,
        "limit": 1000
      }
    ],
    "alerts": [
      {
        "type": "quota_warning",
        "message": "Fraud Team has used 82% of monthly quota"
      }
    ]
  }
}
```

`GET /api/billing/summary`

Response:

```json
{
  "success": true,
  "data": {
    "currentPlan": "enterprise",
    "estimatedMonthEndSpend": 2450.0,
    "overageRisk": true,
    "costPerSuccessfulExecution": 1.56
  }
}
```

Audit events:

- `usage_viewed`
- `billing_viewed`
- `usage_alert_triggered`

---

### 0.9.21 Error Code Set ขั้นต่ำ

ระบบควรมี reason / error code ที่ใช้ได้จริงและซ้ำได้ทุก layer

Validation / auth

- `VALIDATION_ERROR`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `INVALID_CREDENTIALS`
- `EMAIL_VERIFICATION_REQUIRED`

Policy / approval

- `POLICY_BLOCKED`
- `APPROVAL_REQUIRED`
- `APPROVAL_REJECTED`
- `TICKET_REQUIRED`
- `BUSINESS_JUSTIFICATION_REQUIRED`

Execution / integration

- `EXECUTION_FAILED`
- `INTEGRATION_AUTH_FAILED`
- `INTEGRATION_SCOPE_MISSING`
- `DELIVERY_FAILED`
- `RECOVERY_REQUIRED`

Audit / reporting

- `AUDIT_EXPORT_FAILED`
- `PROOF_GENERATION_FAILED`

---

### 0.9.22 Minimum Audit Schema

ทุก event สำคัญควรเขียน audit record ด้วย schema เดียวกัน

```json
{
  "eventId": "evt_001",
  "timestamp": "2026-04-12T10:20:00Z",
  "actor": {
    "userId": "usr_001",
    "email": "admin@acme-fintech.com",
    "role": "admin"
  },
  "organizationId": "org_001",
  "action": "policy_activated",
  "resource": {
    "type": "policy",
    "id": "pol_001"
  },
  "result": "success",
  "reasonCode": null,
  "correlationId": "corr_001",
  "metadata": {
    "ipAddress": "127.0.0.1",
    "userAgent": "browser"
  }
}
```

---

### 0.9.23 Acceptance Criteria สำหรับ Backend

ถือว่า backend พร้อมใช้เมื่อครบทุกข้อ:

- signup → verify → login → onboarding ทำงานครบ
- checklist state คำนวณจากข้อมูลจริงได้
- role / invitation / role assignment ทำงานได้
- create / activate / preview policy ทำงานได้
- connect / test integration ทำงานได้
- readiness check ให้ผล pass / warning / fail ได้
- create execution → review → run / block / submit approval ทำงานได้
- approval inbox → approve / reject ทำงานได้
- execution detail มี timeline และ status ถูกต้อง
- audit / replay / proof / export ใช้งานได้
- usage / billing summary อ่านได้
- action สำคัญทุกตัวมี audit event

---


## 0.10 Frontend UI Spec ต่อหน้า (สำหรับ Product / Design / Frontend)

> ส่วนนี้กำหนด UI behavior ขั้นต่ำต่อหน้า  
> เพื่อให้ทีม design / frontend / product สื่อสารตรงกันว่า  
> หน้านี้ต้องมีอะไร, state อะไร, CTA อะไร, validation แบบไหน, และแสดงผลยังไง  
> โดยยึดเป้าหมายหลัก 3 ข้อ:
> 1. ลูกค้ารู้ว่าต้องทำอะไรต่อ
> 2. ลูกค้าเข้าใจว่าระบบกำลังทำอะไร
> 3. ลูกค้าเห็นผลลัพธ์และความเสี่ยงก่อน execute

---

### 0.10.1 Shared UI Principles

ทุกหน้าที่อยู่ใน onboarding / setup / execution flow ต้องมีโครงมาตรฐานเดียวกัน

#### Layout structure
- Top bar
  - Organization switcher
  - User menu
  - Notification / alert icon
- Left navigation
  - Dashboard
  - Settings
  - Policies
  - Integrations
  - Command Center
  - Approvals
  - Executions
  - Audit
  - Usage / Billing
- Main content area
  - Page title
  - Helper text
  - Primary CTA
  - Contextual status banner (ถ้ามี)
  - Main form / table / detail panel
- Right rail (optional)
  - Setup progress
  - Tips
  - Next step guidance
  - Related links / docs

#### Shared UI elements
- Status badge
- Toast notification
- Inline validation
- Empty state
- Loading skeleton
- Error state with recovery action
- Confirmation modal
- Audit-visible confirmation text for risky action

#### Shared status colors
- Success / Completed
- Warning / Needs attention
- Danger / Blocked / Failed
- Neutral / Draft / Not started
- Info / Pending review / Pending approval

#### Shared CTA rules
- มี primary CTA เด่นสุดแค่ 1 ปุ่มต่อหน้า
- secondary CTA ต้องไม่แย่งความสนใจ
- destructive action ต้องมี confirmation modal
- risky action ต้องมี explanatory copy ก่อนยืนยัน

---

### 0.10.2 Signup Page

**Route:** `/signup`

#### Required components
- Auth card container
- Form fields:
  - Work Email
  - Password
  - Confirm Password
  - Organization Name
  - Terms checkbox
- Primary CTA: `Create Organization`
- Secondary text link: `Already have an account? Log in`

#### Page copy
- Title: `Create your organization`
- Helper text: `Start with your work email and create an isolated workspace for your team.`

#### UI states
- Default
- Typing
- Validation error
- Submitting
- Success redirect
- Server error

#### Validation behavior
- validate on blur + submit
- field error ต้องอยู่ใต้ field
- form-level error ต้องอยู่บน form card

#### Loading behavior
- CTA เปลี่ยนเป็น loading state
- disable duplicate submit
- preserve entered form values ถ้า server error

#### Success behavior
- redirect ไป verification pending page
- show success toast

---

### 0.10.3 Verification Pending / Email Verified

**Route:** `/verify-email/pending` และ `/verify-email/result`

#### Required components
- Centered status card
- Success / expired / invalid state illustration or icon
- CTA:
  - `Continue Setup`
  - `Resend verification email`

#### UI states
- Pending verification
- Verification success
- Verification expired
- Verification failed

#### Expected behavior
- success state ต้องพาไป login หรือ onboarding
- expired state ต้องมี resend CTA
- copy ต้องชัด ไม่ใช้ technical wording

---

### 0.10.4 Login Page

**Route:** `/login`

#### Required components
- Email field
- Password field
- Primary CTA: `Log in`
- Optional CTA:
  - `Continue with SSO`
  - `Forgot password`

#### Page copy
- Title: `Log in to your organization`
- Helper text: `Use your work account to access your workspace.`

#### UI states
- Default
- Invalid credentials
- SSO redirecting
- Login success
- Locked / throttled (ถ้ามี)

#### Expected behavior
- success → redirect `/dashboard`
- error → preserve email field
- invalid credentials ต้องไม่บอกละเอียดเกินจำเป็นด้าน security

---

### 0.10.5 Dashboard First-Run Experience

**Route:** `/dashboard`

#### Required components
- Welcome banner
- Setup checklist card
- Readiness status summary
- Quick links:
  - Set roles and access
  - Create first policy
  - Connect integration
  - Complete Auto-Setup

#### Checklist component structure
Each item must include:
- Label
- Short description
- Status badge
- CTA
- Optional dependency note

#### Example checklist item
- Label: `Create your first policy`
- Description: `Define what should be allowed, blocked, or escalated before execution.`
- Status: `not_started`
- CTA: `Start`

#### Empty state behavior
ถ้าลูกค้าเพิ่ง login ครั้งแรก:
- checklist ต้องอยู่บน fold แรก
- ห้ามเอา metrics card ขึ้นก่อน checklist

#### Expected behavior
- checklist state ดึงจาก backend
- clicking item → navigate ไป route ที่เกี่ยวข้อง
- completed item → เปลี่ยน CTA เป็น `Review`

---

### 0.10.6 Organization Settings Page

**Route:** `/dashboard/settings/organization`

#### Required components
- Page header
- Form card
- Save bar / sticky footer CTA
- Optional right rail:
  - Why this matters
  - Security owner note

#### Fields
- Organization Name
- Industry
- Team Size
- Region / Country
- Timezone
- Security Contact Email

#### CTA
- `Save Organization Settings`

#### UI states
- Empty
- Editing
- Dirty state
- Saving
- Save success
- Save error

#### Expected behavior
- dirty form should show unsaved changes indicator
- save success should update checklist
- invalid email must show inline error

---

### 0.10.7 Roles and Access Page

**Route:** `/dashboard/settings/access`

#### Required components
- Role matrix table
- User list table
- Invite user modal / drawer
- Assign role action menu
- Warning banner when no approver exists

#### Role matrix UI
Columns:
- Permission
- Admin
- Operator
- Approver
- Auditor

Rows:
- Run low-risk tasks
- Run high-risk tasks
- Approve high-risk tasks
- View audit logs
- Manage policies
- Manage integrations

#### User list table columns
- Name / Email
- Current Role
- Status
- Last Active
- Actions

#### Invite user modal fields
- Email
- Role

#### CTA
- `Invite User`
- `Save Access Model`

#### Important UX rules
- if no approver exists, show blocking banner:
  - `At least one approver is required before high-risk flows can go live.`
- role change should require confirmation if permission is elevated
- auditor role must visually indicate read-only

---

### 0.10.8 Policies List Page

**Route:** `/dashboard/policies`

#### Required components
- Policy list table
- Filter bar
- Search input
- Primary CTA: `Create Policy`

#### Table columns
- Policy Name
- Status
- Action
- Risk Scope
- Last Updated
- Updated By
- Actions

#### Empty state
- message: `No policies created yet`
- CTA: `Create your first policy`

#### Filters
- Status
- Action type
- Risk level
- Updated by

---

### 0.10.9 Create / Edit Policy Page

**Route:** `/dashboard/policies/new` และ `/dashboard/policies/:id`

#### Required components
- Multi-section form
- Sticky action bar
- Policy outcome preview panel
- Validation summary for missing critical fields

#### Sections
1. Basic Info
2. Trigger Conditions
3. Action
4. Reason Code
5. Approval Requirements
6. Advanced Restrictions

#### Fields
- Policy Name
- Description
- Task Type
- Data Sensitivity
- Destination
- Risk Level
- Action
- Reason Code
- Approval Group
- Ticket Required
- Business Justification Required
- Sandbox Only

#### CTA
- `Save Policy`
- `Activate Policy`
- `Preview Outcome`

#### Important UX rules
- preview ต้องเห็นก่อน activate
- ถ้าเลือก `Require approval` ต้องโชว์ approval group field ทันที
- ถ้าเลือก `Block` หรือ `Require approval` ต้องบังคับ reason code
- activate action ต้องมี confirm modal

#### Preview panel output
ต้องแสดง sample results แบบอ่านง่าย:
- Allowed
- Blocked
- Approval required

---

### 0.10.10 Integrations List Page

**Route:** `/dashboard/integrations`

#### Required components
- Provider cards
- Status badge
- Search / filter (optional)
- CTA per provider:
  - `Connect`
  - `Manage`
  - `Test Connection`

#### Provider card content
- Provider name
- Short description
- Status
- Last tested
- Allowed scopes summary

#### Empty state
- message: `No integrations connected yet`
- CTA: `Connect your first integration`

---

### 0.10.11 Integration Connect Drawer / Page

**Route:** `/dashboard/integrations/:provider/connect`

#### Required components
- Provider setup form
- Security scope explanation
- Test result panel

#### Example fields for Slack
- Workspace Name
- Credential / token
- Allowed Channels
- Allowed Scopes

#### CTA
- `Connect`
- `Test Connection`

#### UI states
- Default
- Connecting
- Connected
- Test success
- Test failed
- Missing scope warning

#### Important UX rules
- secret fields must be masked
- allowed scope summary must be visible before save
- test result must explain what failed, not just “Connection failed”

---

### 0.10.12 Readiness Check Page / Widget

**Route:** `/dashboard/readiness`

#### Required components
- Summary header
- Overall status badge
- Checklist result cards
- CTA per failed check

#### Check item structure
- Check name
- Status
- Explanation
- Fix CTA

#### Statuses
- Pass
- Warning
- Fail

#### Important UX rules
- overall status must be obvious at first glance
- fail checks should sort to top
- each fail must link directly to fixing route

---

### 0.10.13 Command Center Page

**Route:** `/dashboard/command-center`

#### Required components
- Request form
- Guidance card
- Recent requests panel
- Optional templates panel

#### Fields
- Request / Instruction
- Task Type
- Business Justification
- Ticket ID
- Target System
- Output Destination

#### CTA
- `Review Request`

#### Page copy
- Title: `Command Center`
- Helper text: `Submit an automation request with enough context for policy and approval decisions.`

#### Important UX rules
- business context fields must not feel optional in enterprise flows
- if a selected task type implies high risk, show inline guidance before submit
- recent requests should help repeat common flows

---

### 0.10.14 Review Request Modal / Page

**Route:** modal or `/dashboard/command-center/review/:executionId`

#### Required components
- Summary card
- Risk assessment card
- Policy match card
- Target systems card
- Expected output card
- Next action CTA

#### Possible CTAs
- `Run Now`
- `Submit for Approval`
- `Edit Request`
- `Cancel`

#### Important UX rules
- review must appear before actual execution
- blocked outcome must visually differ strongly from allow outcome
- high-risk outcome must call out reason code clearly

---

### 0.10.15 Approval Inbox Page

**Route:** `/dashboard/approvals`

#### Required components
- Approval queue table
- Filter bar
- Approval detail drawer / side panel
- Approve / reject modal

#### Table columns
- Approval ID
- Request Summary
- Requested By
- Risk Level
- Submitted At
- Status
- Actions

#### Detail panel sections
- Request summary
- Business justification
- Ticket ID
- Matched policies
- Data sensitivity
- Scope
- Previous approval history (if any)

#### CTA
- `Approve`
- `Reject`
- `Request Changes`

#### Important UX rules
- approver should never need to open multiple pages to make a decision
- reject action must require reason
- approve action should allow optional scope restriction

---

### 0.10.16 Executions List Page

**Route:** `/dashboard/executions`

#### Required components
- Execution table
- Filter bar
- Search
- Saved views (optional)

#### Table columns
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
- Date Range
- Team

#### Important UX rules
- blocked / failed / pending approval should be easy to isolate
- row click should open detail view
- execution list should support operational triage use

---

### 0.10.17 Execution Detail Page

**Route:** `/dashboard/executions/:executionId`

#### Required components
- Header summary
- Status badge
- Timeline component
- Policy decision panel
- Approval panel
- Output preview
- Failure / recovery panel (when applicable)

#### Header content
- Execution ID
- Request Summary
- Requested By
- Created At
- Risk Level
- Status

#### Timeline component
Each step should show:
- Step name
- Status
- Timestamp
- Expandable details (optional)

#### Important UX rules
- success, blocked, failed, recovered states must each have different empty / banner behavior
- if failed, next action should be visible
- if blocked, reason code and remediation path must be visible

---

### 0.10.18 Audit Page

**Route:** `/dashboard/audit`

#### Required components
- Tabs:
  - Audit Log
  - Replay
  - Proof
  - Export
- Filter bar
- Results table
- Detail drawer / preview panel

#### Audit log table columns
- Event Time
- Actor
- Action
- Resource
- Result
- Reason Code
- Correlation ID

#### Important UX rules
- audit view must be searchable
- replay must be readable by humans, not only raw JSON
- export CTA must be visible without entering deep menus

---

### 0.10.19 Usage / Billing Page

**Route:** `/dashboard/usage` และ `/dashboard/billing`

#### Required components
- KPI cards
- Team quota table
- Spend trend chart
- Alert panel
- Cost per successful execution card

#### KPI cards
- Total Executions
- Success Rate
- Failure Rate
- Monthly Spend
- Burn Rate
- Overage Risk

#### Team quota table columns
- Team
- Used
- Limit
- Usage %
- Trend
- Alert

#### Important UX rules
- alerts should explain why it matters
- cost view must connect usage to business impact
- avoid showing only raw volume without governance context

---

### 0.10.20 Empty States That Must Exist

ระบบต้องมี empty state อย่างน้อยในจุดต่อไปนี้:

- No policies
- No integrations
- No pending approvals
- No executions yet
- No audit results
- No alerts

แต่ละ empty state ต้องมี:
- plain-language message
- 1 primary CTA
- optional helper text

ตัวอย่าง:
- `No policies created yet`
- `Create your first policy to control what gets allowed, blocked, or escalated.`

---

### 0.10.21 Error States That Must Exist

ระบบต้องมี friendly error states อย่างน้อยในจุดต่อไปนี้:

- Signup failed
- Login failed
- Save settings failed
- Invite user failed
- Policy activation failed
- Integration test failed
- Readiness check failed
- Execution failed
- Approval action failed
- Audit export failed

ทุก error state ต้องมี:
- What happened
- Why it may have happened
- What the user should do next

ตัวอย่าง:
- `Connection test failed`
- `The token is valid, but required scope 'send_messages' is missing.`
- `Update the allowed scopes and test again.`

---

### 0.10.22 Global Notifications / Alerts

ระบบควรมี notification center หรือ top-level alerts สำหรับ:

- Pending approvals
- Failed integrations
- Quota nearing limit
- Repeated blocked attempts
- Audit export ready
- Recovery required

Alert example:
- `3 high-risk requests are waiting for approval`
- `Fraud Team has reached 82% of monthly quota`
- `1 integration is degraded and may affect scheduled executions`

---

### 0.10.23 Frontend Acceptance Criteria

ถือว่า frontend พร้อมใช้เมื่อครบทุกข้อ:

- ผู้ใช้ใหม่ login แล้วเห็น onboarding checklist ทันที
- ทุกหน้าใน flow มี title + helper text + primary CTA
- ทุก form มี inline validation และ loading state
- policy page มี preview outcome ก่อน activate
- command center มี review-before-execute
- blocked state มี reason code + next step
- approval inbox ใช้งานได้ในหน้าเดียว
- execution detail มี timeline อ่านง่าย
- audit page search / filter / export ได้
- usage page แสดง quota + burn rate + alerts
- ทุก empty state และ error state มี CTA ที่ไปต่อได้


## 1) ฉากจำลองลูกค้า (Customer Persona)

- ประเภทธุรกิจ: Fintech/Enterprise Operations
- ขนาดองค์กร: 500–2,000 พนักงาน
- ผู้ใช้ระบบหลัก:
  - Security & Compliance
  - Operations Team
  - Data/AI Team
  - ทีมผู้อนุมัติธุรกรรม (Approvers)

### Pain Points ปัจจุบัน

- ใช้ AI ทำงานอัตโนมัติได้เร็ว แต่ **ควบคุมความเสี่ยงไม่ทัน**
- สิทธิ์การใช้งานละเอียดไม่พอ (ใครทำอะไรได้บ้าง)
- เมื่อเกิดเหตุผิดพลาด สืบย้อนหลังยาก (audit/replay ไม่ครบ)
- ต้นทุนพุ่งเมื่อใช้งานมากขึ้น แต่ไม่เห็น quota/capacity ชัดเจน

---

## 2) สิ่งที่ลูกค้า “ต้องมี” ก่อนซื้อ/ขยายใช้งาน

## 2.1 Security & Governance (ขั้นต่ำ)

- SSO + RBAC + JIT provisioning
- นโยบายอนุมัติ (Approval policy) ก่อนรันงานเสี่ยงสูง
- Audit trail ที่ค้นหาและ export ได้
- Rate limit และ error handling มาตรฐาน
- หลักฐานยืนยันการรัน (proof/ledger) สำหรับตรวจสอบภายใน

## 2.2 Reliability & Recovery

- Checkpoint และ Recovery เมื่อ executor ล่ม
- Retry/timeout policy แยกตามประเภทงาน
- Runtime summary เพื่อบอกสถานะงานภาพรวม

## 2.3 Control Plane ที่จับต้องได้

- Dashboard เห็นภาพรวม: executions, policies, audit, capacity, billing
- API ที่เชื่อมระบบภายนอกได้ (SIEM/ITSM/Slack)
- Metrics ที่เทียบก่อน-หลังได้เป็นตัวเลข

---

## 3) ขั้นตอนใช้งานแบบ End-to-End (ต้องใช้จริงทุกขั้น)

## Step 0 — Baseline (ก่อนเปิดใช้งาน)

**เป้าหมาย:** เก็บ baseline KPI 2–4 สัปดาห์จากกระบวนการเดิม

- ตัวชี้วัด baseline:
  - อัตรางานผิดพลาดจาก automation (%failed / %manual rollback)
  - MTTR (เวลาฟื้นตัวเฉลี่ย)
  - จำนวน incident ด้านสิทธิ์/ข้อมูล
  - เวลาที่ใช้ในการ audit ย้อนหลังต่อเคส

**ผลลัพธ์ที่จับต้องได้:** มีตัวเลขตั้งต้นสำหรับเปรียบเทียบหลังเปิดระบบ

## Step 1 — Identity & Access Hardening

**การใช้งาน:** เปิด SSO, map กลุ่มผู้ใช้, กำหนด RBAC รายบทบาท

- บทบาทตัวอย่าง:
  - Operator: สั่งงานปกติ
  - Approver: อนุมัติงานเสี่ยงสูง
  - Auditor: ดูหลักฐาน/รายงานเท่านั้น
  - Admin: จัดการนโยบายและ integration

**เงื่อนไขผ่าน:**

- ผู้ใช้ที่ไม่อยู่ใน role ที่กำหนดไม่สามารถรันงานเสี่ยงสูงได้
- Event sign-in/sign-out และ role change ถูกบันทึก audit ครบ

## Step 2 — Policy + Guardrail ก่อนรันจริง

**การใช้งาน:** กำหนดนโยบาย intent → gate → execute

- ตัวอย่าง policy ที่ต้องมี:
  - ห้ามโพสต์/ส่งข้อความภายนอกถ้าไม่มี approved ticket
  - ห้ามดึงข้อมูล PII โดยไม่มีเหตุผลทางธุรกิจ + approval
  - จำกัด executor บางประเภทให้ใช้เฉพาะ sandbox

**เงื่อนไขผ่าน:**

- งานที่ผิด policy ต้องถูก block พร้อม reason code
- งานที่ผ่าน policy ต้องมีหลักฐานอนุมัติผูกกับ execution id

## Step 3 — Controlled Pilot (กลุ่มเล็ก)

**การใช้งาน:** เปิดใช้งานกับ 1–2 use case ความเสี่ยงกลาง

- ตัวอย่าง use case:
  - จัดทำรายงานปฏิบัติการรายวันอัตโนมัติ
  - triage ticket ระดับ low/medium

**การควบคุม:**

- เปิด checkpoint ทุกงาน
- เปิด replay/audit สำหรับทุก execution
- ตั้ง capacity/quota แยกทีม

**เงื่อนไขผ่าน:**

- Error rate ลดลงจาก baseline อย่างน้อย 20%
- ไม่มี critical policy violation
- MTTR ดีขึ้นอย่างน้อย 15%

## Step 4 — Enterprise Rollout

**การใช้งาน:** ขยายหลายทีม พร้อม billing/usage governance

- สิ่งที่ต้อง monitor รายสัปดาห์:
  - execution success rate
  - blocked-by-policy ratio
  - approval latency
  - spend per team / quota burn rate

**เงื่อนไขผ่าน:**

- แต่ละทีมมี owner ของ policy และ incident runbook
- มี monthly control review ระหว่าง Security + Ops + Product

## Step 5 — Continuous Improvement Loop

**การใช้งาน:** เอาข้อมูล audit + replay + failures มาปรับ policy

- ปรับ threshold approval
- ลด false positive ของนโยบาย
- เพิ่ม automation เฉพาะ flow ที่ผลลัพธ์เสถียรแล้ว

**เงื่อนไขผ่าน:**

- Trend 90 วัน: incident ลดลงต่อเนื่อง, success rate สูงขึ้น, ต้นทุนต่อ execution คงที่หรือลดลง

---

## 4) KPI Dashboard ที่ต้องเห็น “แบบจับต้องได้”

- Security KPIs
  - Unauthorized attempt blocked
  - Policy violation by severity
  - Time-to-contain
- Reliability KPIs
  - Success rate / Failure rate
  - MTTR / Retry success
  - Checkpoint recovery success
- Governance KPIs
  - Approval SLA
  - Audit completeness score
  - Replay coverage
- Cost KPIs
  - Cost per successful execution
  - Overage events
  - Team-level quota utilization

---

## 5) Gap Template สำหรับหา “สิ่งที่ขาด” ในแอปของเรา

ให้ประเมินแต่ละหัวข้อเป็น: **พร้อมใช้ / พอใช้ / ยังขาด**

| Capability | สถานะ | หลักฐานที่มี | ช่องว่าง (Gap) | ผลกระทบ | แผนปิด Gap | เจ้าของ | Due Date |
|---|---|---|---|---|---|---|---|
| SSO + RBAC |  |  |  |  |  |  |  |
| Approval ก่อนงานเสี่ยงสูง |  |  |  |  |  |  |  |
| Policy block + reason code |  |  |  |  |  |  |  |
| Audit export/replay |  |  |  |  |  |  |  |
| Checkpoint/recovery |  |  |  |  |  |  |  |
| Capacity/quota control |  |  |  |  |  |  |  |
| Billing governance |  |  |  |  |  |  |  |
| Incident runbook |  |  |  |  |  |  |  |

---

## 6) ตัวอย่างผลลัพธ์หลังใช้งาน 60 วัน (Simulation)

- Error rate: 8.5% → 5.9% (ลด 30.6%)
- MTTR: 95 นาที → 68 นาที (ลด 28.4%)
- Unauthorized execution attempts: ถูก block 100%
- เวลาเตรียมหลักฐาน audit ต่อเคส: 2.5 ชั่วโมง → 35 นาที
- Cost per successful execution: ลดลง 12% หลังจูน policy และ capacity

> หมายเหตุ: ตัวเลขด้านบนเป็น **simulation template** สำหรับใช้ตั้งเป้าหมายและ benchmark เท่านั้น

---

## 7) นิยาม Definition of Done (DoD) สำหรับองค์กร

ถือว่า “พร้อมใช้งานระดับองค์กร” เมื่อครบทุกข้อ:

- มี role model ชัดเจน + ตรวจสอบสิทธิ์ได้
- งานเสี่ยงสูงทุกงานต้องผ่าน approval chain
- มี audit/replay/proof ครบและดึงรายงานได้
- มี recovery runbook ที่ซ้อมจริงแล้ว
- มี KPI dashboard รายสัปดาห์ + control review รายเดือน
- บรรลุเป้าหมายลด error อย่างน้อย 20% ภายใน 1 ไตรมาส

---

## 8) One-Page Demo Script (เวอร์ชันขายคุณค่าแบบลูกค้าองค์กร)

> เป้าหมายของเดโมนี้ไม่ใช่พาลูกค้าดูเมนู  
> แต่ต้องพิสูจน์ให้เห็นใน 15 นาทีว่า:
> 1. ระบบหยุดงานเสี่ยงก่อนเกิด incident ได้
> 2. ระบบบังคับ approval chain ได้จริง
> 3. ระบบตรวจย้อนหลังได้ครบ
> 4. ระบบคุมการขยายใช้งานและต้นทุนได้

---

### ก่อนเริ่มเดโม: ตั้งกรอบให้ลูกค้า

**ประโยคเปิดเดโม**
> “วันนี้เราจะไม่เริ่มจากฟีเจอร์ แต่จะพิสูจน์ 4 เรื่องให้เห็นจริง:
> - งานเสี่ยงถูก block ได้หรือไม่
> - งานที่ต้องอนุมัติถูกคุมได้หรือไม่
> - ถ้าถูกถามย้อนหลัง เราดึงหลักฐานได้หรือไม่
> - ถ้าขยายใช้งาน ต้นทุนยังถูกควบคุมได้หรือไม่”

---

### นาทีที่ 0–2: สมัครและเข้าองค์กรครั้งแรก

**หน้าที่เปิด**
- `/signup`
- `/login`
- `/dashboard`

**สิ่งที่ต้องทำให้ลูกค้าเห็น**
1. สมัครด้วย work email
2. สร้าง organization
3. login เข้าระบบ
4. เห็น onboarding checklist ทันที

**สิ่งที่พูด**
> “ระบบนี้เริ่มจาก organization workspace ไม่ใช่บัญชีเดี่ยว  
> แปลว่าข้อมูล บทบาท และการตรวจสอบย้อนหลังจะถูกผูกกับขอบเขตองค์กรตั้งแต่ต้น”

**สิ่งที่ลูกค้าต้องเห็นบนจอ**
- checklist 5 ขั้นตอน
- สถานะ Not started / In progress / Completed
- ปุ่ม Start / Continue

**คุณค่าที่ลูกค้าเห็นทันที**
- เริ่มต้นใช้งานได้แบบองค์กรจริง
- ไม่ต้องเดาว่าขั้นตอนถัดไปคืออะไร

---

### นาทีที่ 2–5: ตั้งบทบาทและ policy แรก

**หน้าที่เปิด**
- `/dashboard/settings/access`
- `/dashboard/policies`

**สิ่งที่ต้องทำให้ลูกค้าเห็น**
1. assign user เป็น Operator / Approver / Auditor
2. สร้าง policy:
   - ถ้า export PII ออกภายนอก
   - ต้องมี ticket
   - ต้องมี approval
   - ถ้าไม่มีให้ block

**สิ่งที่พูด**
> “ตรงนี้ไม่ใช่แค่สิทธิ์การเข้าใช้งาน  
> แต่เป็นการกำหนดว่าใครสั่งได้ ใครอนุมัติได้ และใครดูย้อนหลังได้  
> ส่วน policy คือ guardrail ที่หยุดงานเสี่ยงก่อนระบบลงมือทำจริง”

**สิ่งที่ลูกค้าต้องเห็นบนจอ**
- role matrix
- create policy form
- action = allow / block / require approval
- reason code
- policy outcome preview

**คุณค่าที่ลูกค้าเห็นทันที**
- งานสำคัญไม่ถูกปล่อยให้ AI ตัดสินใจลำพัง
- governance อยู่ใน flow จริง ไม่ใช่เอกสารนโยบายเฉยๆ

---

### นาทีที่ 5–7: เชื่อม integration จริง

**หน้าที่เปิด**
- `/dashboard/integrations`

**สิ่งที่ต้องทำให้ลูกค้าเห็น**
1. เลือก Slack หรือ integration ตัวอย่าง
2. connect
3. test connection
4. status ขึ้น Healthy

**สิ่งที่พูด**
> “เราต้องพิสูจน์ว่าระบบนี้ไม่จบแค่เดโม  
> แต่เชื่อมกับ environment จริงของลูกค้าได้ โดยยังคุม scope การเข้าถึงไว้ได้”

**สิ่งที่ลูกค้าต้องเห็นบนจอ**
- allowed channels / allowed scopes
- ปุ่ม Test Connection
- สถานะ Healthy

**คุณค่าที่ลูกค้าเห็นทันที**
- ระบบพร้อมใช้กับ workflow จริง
- การเชื่อมต่อไม่เปิดกว้างเกินจำเป็น

---

### นาทีที่ 7–9: เคสที่ “ผ่าน” และรันได้ทันที

**หน้าที่เปิด**
- `/dashboard/command-center`
- `/dashboard/executions/:id`

**ตัวอย่าง request**
- `Generate daily operations summary and send to #ops-daily`

**สิ่งที่ต้องทำให้ลูกค้าเห็น**
1. operator กรอก request
2. กด Review Request
3. ระบบสรุป intent / risk / policy result
4. กด Run Now
5. execution ขึ้น Running → Completed

**สิ่งที่พูด**
> “นี่คืองานความเสี่ยงต่ำที่ระบบอนุญาตให้วิ่งได้ทันที  
> แต่ก่อนรันจริง ระบบยังสรุปให้เห็นก่อนว่ากำลังจะทำอะไร เพื่อป้องกันการสั่งผิด”

**สิ่งที่ลูกค้าต้องเห็นบนจอ**
- detected intent
- risk = low
- policy result = allow
- execution timeline
- output preview

**คุณค่าที่ลูกค้าเห็นทันที**
- automation ทำงานเร็ว
- แต่ยังมี trace และความโปร่งใส

---

### นาทีที่ 9–11: เคสที่ “ถูก block” ก่อนเกิดความเสียหาย

**หน้าที่เปิด**
- `/dashboard/command-center`
- review state / execution blocked state

**ตัวอย่าง request**
- `Export customer contact list and send externally`
- ไม่มี ticket
- ไม่มี approval

**สิ่งที่ต้องทำให้ลูกค้าเห็น**
1. operator ส่ง request
2. ระบบประเมินว่าเป็น high-risk
3. policy result = blocked
4. แสดง reason code และ next action

**สิ่งที่พูด**
> “นี่คือคุณค่าหลักของระบบ  
> ไม่ใช่แค่ทำงานอัตโนมัติได้  
> แต่หยุดงานที่ไม่ควรถูกทำอัตโนมัติได้ก่อนเกิด incident”

**สิ่งที่ลูกค้าต้องเห็นบนจอ**
- status = Blocked
- reason code
- explanation
- ปุ่ม Attach Ticket / Submit for Approval / Edit Request

**คุณค่าที่ลูกค้าเห็นทันที**
- ลด risk ก่อนเสียหายจริง
- compliance ไม่ต้องมาตามเก็บทีหลัง

---

### นาทีที่ 11–13: เคสที่ “ต้องขอ approval”

**หน้าที่เปิด**
- `/dashboard/command-center`
- `/dashboard/approvals`
- `/dashboard/executions/:id`

**ตัวอย่าง request**
- `Export customer transaction anomalies for fraud review`
- มี ticket แล้ว
- policy บอกว่าต้อง approval

**สิ่งที่ต้องทำให้ลูกค้าเห็น**
1. operator กด Submit for Approval
2. approver เปิด approval inbox
3. approver ดู justification / ticket / policy match / scope
4. approver กด Approve
5. execution ถูกปล่อยให้รัน

**สิ่งที่พูด**
> “งานเสี่ยงสูงไม่จำเป็นต้องถูก block ทิ้งเสมอไป  
> แต่ต้องเดินผ่านเส้นทางที่ควบคุมได้ และตรวจสอบได้ว่าใครเป็นคนอนุมัติ”

**สิ่งที่ลูกค้าต้องเห็นบนจอ**
- approval queue
- approval detail
- approval note
- approved → execution released

**คุณค่าที่ลูกค้าเห็นทันที**
- มี 4-eyes control จริง
- ลดความเสี่ยงจากการตัดสินใจอัตโนมัติลำพัง

---

### นาทีที่ 13–14: เปิด Audit / Replay / Proof

**หน้าที่เปิด**
- `/dashboard/audit`

**สิ่งที่ต้องทำให้ลูกค้าเห็น**
1. เปิด execution ที่เพิ่งรัน
2. เปิด timeline / audit log
3. เปิด replay
4. เปิด proof หรือ export

**สิ่งที่พูด**
> “ถ้าพรุ่งนี้มีคำถามจาก compliance, internal audit หรือ incident review  
> ทีมไม่ต้องไปไล่หลายระบบ  
> เพราะ trace ทั้งหมดอยู่ใน execution เดียวกัน”

**สิ่งที่ลูกค้าต้องเห็นบนจอ**
- actor
- action
- policy result
- reason code
- approval state
- export / proof

**คุณค่าที่ลูกค้าเห็นทันที**
- audit-ready
- incident response เร็วขึ้น
- ลดเวลาตามหลักฐานย้อนหลัง

---

### นาทีที่ 14–15: ปิดด้วย Usage / Capacity / Billing

**หน้าที่เปิด**
- `/dashboard/usage`
- `/dashboard/billing`

**สิ่งที่ต้องทำให้ลูกค้าเห็น**
1. execution success rate
2. blocked-by-policy ratio
3. team quota usage
4. projected overage / spend trend

**สิ่งที่พูด**
> “ยิ่ง automation มากขึ้น ยิ่งต้องมี cost governance  
> เราไม่ได้แสดงแค่ว่าระบบถูกใช้เยอะแค่ไหน  
> แต่แสดงด้วยว่าการใช้เยอะขึ้นกำลังนำไปสู่ต้นทุนหรือความเสี่ยงอะไร”

**สิ่งที่ลูกค้าต้องเห็นบนจอ**
- team quota
- burn rate
- monthly spend
- alerts

**คุณค่าที่ลูกค้าเห็นทันที**
- พร้อมคุยเรื่อง rollout หลายทีม
- ผู้บริหารเห็นต้นทุนและการควบคุมได้ชัด

---

## 8.1 สรุปคุณค่าที่ต้องย้ำตอนจบ

**ประโยคปิดเดโม**
> “ภายใน 15 นาที คุณเห็นครบแล้วว่า:
> - ระบบนี้ปล่อยงานที่ควรปล่อย
> - ระบบนี้บล็อกงานที่ไม่ควรปล่อย
> - ระบบนี้บังคับ approval ในงานเสี่ยงสูง
> - ระบบนี้ตอบคำถามย้อนหลังได้
> - และระบบนี้ขยายใช้งานได้โดยยังคุมต้นทุนและ governance ได้”

---

## 8.2 สิ่งที่ทีมขาย / CS ห้ามพลาดระหว่างเดโม

- อย่าเริ่มด้วยเมนูเยอะเกิน
- อย่าอธิบายเชิงเทคนิคก่อนเห็นคุณค่า
- อย่าโชว์แค่ happy path
- ต้องโชว์ blocked path และ approval path เสมอ
- ต้องปิดด้วยตัวเลขและ governance ไม่ใช่จบที่หน้าผลลัพธ์

---

## 8.3 Demo DoD

ถือว่าเดโม “พิสูจน์คุณค่าได้” เมื่อผู้ชมเห็นครบ 4 เรื่อง:
- **Pass**: งานความเสี่ยงต่ำรันได้จริง
- **Block**: งานเสี่ยงสูงถูกหยุดได้จริง
- **Approve**: งานที่ต้อง approval เดินต่อได้จริง
- **Audit**: trace ย้อนหลังครบจริง

> ถ้าเดโมยังไม่ครบ 4 เรื่องนี้ ถือว่ายังไม่ตอบคำถามลูกค้าองค์กรที่เข้มงวดพอ

---

## 11) QA Test Cases / UAT Checklist (End-to-End Enterprise Flow)

> ส่วนนี้ใช้สำหรับ QA, UAT, PM, และทีม demo  
> เพื่อยืนยันว่า flow ตั้งแต่ signup → policy → integration → execution → approval → audit → usage  
> ทำงานครบจริง และให้ประสบการณ์ระดับ enterprise ตามที่ออกแบบไว้

> รูปแบบการประเมิน:
> - Pass
> - Fail
> - Blocked
> - N/A

> แนะนำให้รันอย่างน้อย 3 ชุด:
> 1. Happy path
> 2. Policy blocked path
> 3. Approval required path

---

## 11.1 Test Data / Roles

### Test users
- Admin: `admin@acme-fintech.com`
- Operator: `nont@acme-fintech.com`
- Approver: `fon@acme-fintech.com`
- Auditor: `audit@acme-fintech.com`

### Sample policy
- Name: `PII export approval required`
- Condition:
  - task type = data_export
  - data sensitivity = pii
  - destination = external
  - risk = high
- Action:
  - require approval
- Reason code:
  - `HIGH_RISK_PII_EXPORT`

### Sample integrations
- Slack
- Internal API

### Sample requests
1. Low-risk:
   - `Generate daily operations summary and send to #ops-daily`
2. High-risk blocked:
   - `Export customer contact list and send externally`
3. High-risk approval:
   - `Export customer transaction anomalies for fraud review`

---

## 11.2 Signup / Verification / Login

### TC-001 Signup success
**Precondition**
- ยังไม่มี account นี้ในระบบ

**Steps**
1. เปิด `/signup`
2. กรอก work email
3. กรอก password / confirm password
4. กรอก organization name
5. กดยอมรับ terms
6. กด `Create Organization`

**Expected**
- ระบบสร้าง account สำเร็จ
- แสดงข้อความให้ verify email
- มี audit event:
  - `account_created`
  - `organization_created`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-002 Signup validation
**Steps**
1. เปิด `/signup`
2. กรอก email ไม่ถูก format
3. กรอก password สั้นกว่า 8 ตัว
4. ไม่กรอก organization name
5. กด submit

**Expected**
- เห็น inline validation ทุก field ที่ผิด
- ไม่มี account ถูกสร้าง
- ฟอร์มไม่ reset โดยไม่จำเป็น

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-003 Email verification success
**Steps**
1. เปิดลิงก์ verify จากอีเมล
2. กดยืนยัน

**Expected**
- แสดงสถานะ verify สำเร็จ
- พาไป login หรือ onboarding
- มี audit event `email_verified`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-004 Login success
**Precondition**
- user verify email แล้ว

**Steps**
1. เปิด `/login`
2. กรอก email / password ถูกต้อง
3. กด `Log in`

**Expected**
- redirect ไป `/dashboard`
- แสดง onboarding checklist
- มี audit event `login_success`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-005 Login invalid credentials
**Steps**
1. เปิด `/login`
2. กรอก password ผิด
3. กด `Log in`

**Expected**
- แสดง `Invalid email or password`
- ไม่ login สำเร็จ
- มี audit event `login_failed`

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.3 Onboarding Checklist

### TC-006 Checklist first-run visibility
**Steps**
1. login เป็น admin ครั้งแรก
2. เข้า `/dashboard`

**Expected**
- checklist แสดงบนส่วนบนของหน้า
- มี 5 ขั้นตอนหลัก
- แต่ละขั้นตอนมี status + CTA

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-007 Checklist progress update
**Steps**
1. กรอก organization settings ครบ
2. save สำเร็จ
3. กลับ dashboard

**Expected**
- checklist item `organization_profile` เปลี่ยนเป็น completed
- CTA เปลี่ยนจาก Start เป็น Review

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.4 Organization Settings

### TC-008 Save organization settings success
**Steps**
1. เปิด `/dashboard/settings/organization`
2. กรอกทุก field ให้ครบ
3. กด save

**Expected**
- save สำเร็จ
- มี success toast
- checklist update
- มี audit event `organization_updated`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-009 Save organization settings validation
**Steps**
1. เปิดหน้า settings
2. กรอก security contact email ไม่ถูกต้อง
3. กด save

**Expected**
- แสดง inline validation
- ไม่บันทึกข้อมูลผิด
- form ไม่พัง

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.5 Roles and Access

### TC-010 Invite operator success
**Steps**
1. เปิด `/dashboard/settings/access`
2. กด `Invite User`
3. กรอก email operator
4. เลือก role = Operator
5. กดยืนยัน

**Expected**
- invitation ถูกสร้าง
- แสดง status pending
- มี audit event `user_invited`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-011 Assign approver success
**Steps**
1. เลือก user ที่มีอยู่
2. เปลี่ยน role เป็น Approver
3. save

**Expected**
- role เปลี่ยนสำเร็จ
- มี audit event `role_assigned` หรือ `role_changed`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-012 High-risk policy blocked without approver
**Precondition**
- ยังไม่มี approver ในระบบ

**Steps**
1. ไปสร้าง policy แบบ require approval
2. กด activate

**Expected**
- ระบบไม่ให้ activate
- แสดงข้อความว่าต้องมี approver อย่างน้อย 1 คน
- ไม่มี policy active โดยผิดเงื่อนไข

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.6 Policies

### TC-013 Create policy draft success
**Steps**
1. เปิด `/dashboard/policies`
2. กด `Create Policy`
3. กรอก fields ครบ
4. กด `Save Policy`

**Expected**
- policy ถูกสร้างเป็น draft
- มี audit event `policy_created`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-014 Policy preview success
**Steps**
1. เปิด policy draft
2. กด `Preview Outcome`

**Expected**
- ระบบแสดง sample outcome:
  - allow
  - blocked
  - approval required
- ไม่มี error

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-015 Activate policy success
**Precondition**
- มี approver แล้ว
- policy fields ครบ

**Steps**
1. กด `Activate Policy`
2. ยืนยัน modal

**Expected**
- status เปลี่ยนเป็น active
- มี audit event `policy_activated`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-016 Policy validation for missing reason code
**Steps**
1. เลือก action = Block หรือ Require approval
2. ไม่กรอก reason code
3. กด save หรือ activate

**Expected**
- ระบบ block การบันทึกหรือ activate
- แจ้งว่าต้องมี reason code

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.7 Integrations

### TC-017 Connect integration success
**Steps**
1. เปิด `/dashboard/integrations`
2. เลือก Slack
3. กรอก credential
4. เลือก allowed channels / scopes
5. กด connect

**Expected**
- integration connected
- แสดง status healthy หรือพร้อม test
- มี audit event `integration_connected`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-018 Test connection success
**Steps**
1. เปิด integration ที่เชื่อมแล้ว
2. กด `Test Connection`

**Expected**
- ระบบแสดง test success
- checks ผ่าน
- มี audit event `integration_tested`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-019 Test connection missing scope
**Steps**
1. ใช้ credential ที่ขาด required scope
2. กด `Test Connection`

**Expected**
- ระบบแจ้งว่าขาด scope ไหน
- ไม่ขึ้น generic error อย่างเดียว
- มี audit event `integration_failed`

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.8 Readiness Check

### TC-020 Readiness check pass / warning / fail
**Steps**
1. เปิด `/dashboard/readiness`
2. กด `Run Check`

**Expected**
- ระบบแสดงผลรวม
- แต่ละ check มี status pass / warning / fail
- fail item มี CTA ไปแก้

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.9 Command Center / Review

### TC-021 Create low-risk execution request
**Steps**
1. login เป็น operator
2. เปิด `/dashboard/command-center`
3. กรอก low-risk request
4. กด `Review Request`

**Expected**
- execution ถูกสร้าง
- status = pending_review
- มี audit event `execution_request_created`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-022 Review low-risk request
**Steps**
1. เปิด review state ของ low-risk request

**Expected**
- detected intent แสดง
- risk = low
- policy outcome = allow
- ปุ่ม `Run Now` แสดง

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-023 Run low-risk execution success
**Steps**
1. จาก review state
2. กด `Run Now`

**Expected**
- execution status เปลี่ยนเป็น running → completed
- timeline แสดงครบ
- output preview มีข้อมูล
- audit event:
  - `execution_started`
  - `execution_completed`

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.10 Blocked Path

### TC-024 High-risk blocked request without ticket
**Steps**
1. login เป็น operator
2. ส่ง request `Export customer contact list and send externally`
3. ไม่กรอก ticket
4. กด review

**Expected**
- risk = high
- status = blocked
- reason code แสดง
- next action แสดงชัด
- ไม่มีปุ่ม run ตรงๆ
- audit event:
  - `execution_reviewed`
  - `execution_blocked`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-025 Blocked state remediation guidance
**Steps**
1. เปิด execution ที่ถูก block

**Expected**
- เห็น reason code
- เห็น explanation
- เห็น CTA เช่น:
  - Attach Ticket
  - Submit for Approval
  - Edit Request

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.11 Approval Required Path

### TC-026 Submit high-risk request for approval
**Steps**
1. ส่ง request ที่เข้าข่าย high-risk
2. กรอก business justification + ticket ครบ
3. review แล้ว outcome = require approval
4. กด `Submit for Approval`

**Expected**
- approval request ถูกสร้าง
- execution status = pending_approval
- audit event `approval_requested`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-027 Approver sees request in inbox
**Steps**
1. login เป็น approver
2. เปิด `/dashboard/approvals`

**Expected**
- approval request แสดงใน queue
- เปิด detail แล้วเห็น:
  - request summary
  - business justification
  - ticket id
  - matched policies
  - risk level
  - target systems

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-028 Approval granted success
**Steps**
1. approver เปิด approval detail
2. กด `Approve`
3. กรอก note
4. ยืนยัน

**Expected**
- approval status = approved
- execution ถูกปล่อยให้ run ได้
- audit event `approval_granted`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-029 Approval rejected success
**Steps**
1. approver เปิด approval detail
2. กด `Reject`
3. กรอกเหตุผล
4. ยืนยัน

**Expected**
- approval status = rejected
- execution ไม่ถูก run
- audit event `approval_rejected`

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-030 Cannot run high-risk execution before approval
**Steps**
1. ใช้ execution ที่ pending approval
2. พยายาม run ตรงๆ ผ่าน UI หรือ API

**Expected**
- ระบบ block
- แสดง `Approval required`
- execution ไม่เริ่ม

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.12 Executions List / Detail

### TC-031 Executions list filter works
**Steps**
1. เปิด `/dashboard/executions`
2. filter ตาม status = blocked
3. filter ตาม pending approval
4. filter ตาม date range

**Expected**
- รายการแสดงถูกต้องตาม filter
- ไม่มี execution หายหรือมั่ว

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-032 Execution detail timeline visible
**Steps**
1. เปิด execution completed
2. เปิด execution blocked
3. เปิด execution failed (ถ้ามี)

**Expected**
- แต่ละ execution แสดง header summary
- timeline ครบตาม state
- blocked case มี reason code
- failed case มี failure reason / recovery status

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.13 Audit / Replay / Proof

### TC-033 Audit log searchable
**Steps**
1. เปิด `/dashboard/audit`
2. filter ด้วย execution id หรือ actor
3. ค้นหา event

**Expected**
- event ที่เกี่ยวข้องถูกแสดง
- fields สำคัญครบ:
  - actor
  - action
  - result
  - reason code
  - correlation id

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-034 Replay execution success
**Steps**
1. เปิด replay ของ execution ที่ run สำเร็จ

**Expected**
- เห็น original request
- policy snapshot
- approval snapshot
- decision path
- output trace

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-035 Proof / Export success
**Steps**
1. เปิด proof ของ execution
2. export audit เป็น CSV หรือ PDF

**Expected**
- proof เปิดได้
- export สำเร็จ
- มี audit event:
  - `proof_viewed`
  - `audit_exported`

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.14 Usage / Billing

### TC-036 Usage summary visible
**Steps**
1. เปิด `/dashboard/usage`

**Expected**
- เห็น KPI cards
- เห็น team quota
- เห็น burn rate
- เห็น alerts ถ้ามี

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-037 Billing summary visible
**Steps**
1. เปิด `/dashboard/billing`

**Expected**
- เห็น current plan
- estimated spend
- cost per successful execution
- overage risk

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-038 Quota warning alert visible
**Precondition**
- team usage เกิน threshold warning

**Steps**
1. เปิด usage page

**Expected**
- เห็น alert เช่น `Fraud Team has used 82% of monthly quota`
- alert อธิบายได้ว่าเสี่ยงอะไร

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.15 Empty States / Error States

### TC-039 Empty states show correct CTA
**Steps**
1. ใช้องค์กรใหม่ที่ยังไม่มี:
   - policy
   - integration
   - execution
   - approval

**Expected**
- แต่ละหน้าแสดง empty state ที่เหมาะสม
- มี CTA ไป action ถัดไปได้ทันที

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-040 Friendly error state
**Steps**
1. ทำให้ integration test fail
2. ทำให้ audit export fail
3. ทำให้ execution fail

**Expected**
- ทุกกรณีมี:
  - what happened
  - why
  - next action
- ไม่แสดง generic error อย่างเดียว

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.16 Role-Based Access Control

### TC-041 Operator cannot approve
**Steps**
1. login เป็น operator
2. เปิด approval page หรือเรียก approve action

**Expected**
- ไม่เห็น approve CTA
- หรือถูก block ที่ backend / API
- มี result = forbidden

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-042 Auditor cannot execute
**Steps**
1. login เป็น auditor
2. เปิด command center
3. พยายาม run execution

**Expected**
- ไม่มี run CTA หรือถูก block
- read-only behavior ชัดเจน

**Result**
- [ ] Pass
- [ ] Fail

---

### TC-043 Admin can manage policy and integrations
**Steps**
1. login เป็น admin
2. เข้า policy page
3. เข้า integrations page

**Expected**
- admin ทำได้ครบตาม role
- ไม่มีสิทธิ์ผิด role

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.17 Audit Event Completeness

### TC-044 Critical actions must generate audit events
**Steps**
ทำ action ต่อไปนี้อย่างน้อย 1 ครั้ง:
- signup
- login
- save organization settings
- invite user
- assign role
- create policy
- activate policy
- connect integration
- run readiness check
- create execution
- review execution
- block execution
- submit approval
- approve / reject
- run execution
- export audit

**Expected**
- ทุก action มี audit event
- event fields ครบ:
  - timestamp
  - actor
  - action
  - resource
  - result
  - correlation id

**Result**
- [ ] Pass
- [ ] Fail

---

## 11.18 UAT Summary Table

| Area | Scenario | Expected Outcome | Result | Notes |
|---|---|---|---|---|
| Auth | Signup | Create org successfully |  |  |
| Auth | Login | Access dashboard |  |  |
| Onboarding | Checklist | Visible and updates correctly |  |  |
| Access | Roles | Correct permission boundaries |  |  |
| Policies | Block / Approval | Correct policy outcomes |  |  |
| Integrations | Connect / Test | Healthy or actionable error |  |  |
| Readiness | Run check | Pass / warning / fail works |  |  |
| Execution | Low-risk run | Completed with timeline |  |  |
| Execution | High-risk blocked | Blocked with reason code |  |  |
| Approval | High-risk approval | Approval flow works |  |  |
| Audit | Replay / Proof / Export | Trace available |  |  |
| Usage | Quota / Billing | Governance visible |  |  |

---

## 11.19 Release Gate / Exit Criteria

ถือว่า feature set นี้ “พร้อม demo / พร้อม UAT / พร้อม pilot” เมื่อครบทุกข้อ:

- signup → login → onboarding ใช้งานได้
- checklist update ตามสถานะจริง
- role boundaries ถูกต้อง
- policy preview / activate / block / approval ทำงานได้
- integration connect + test ทำงานได้
- readiness check ใช้งานได้
- low-risk execution run ได้จริง
- high-risk blocked path ใช้งานได้
- approval flow ใช้งานได้
- audit / replay / proof / export ใช้งานได้
- usage / billing / quota แสดงผลได้
- critical audit events ครบ
- ไม่มี blocker ระดับ security / data leakage / broken role permission
