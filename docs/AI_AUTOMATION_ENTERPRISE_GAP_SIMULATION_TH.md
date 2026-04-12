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
        "label": "Run your first execution",
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

