# Engineering Task Breakdown (พร้อมแตกงานเข้า Sprint)

เอกสารนี้สรุปแผน delivery สำหรับระบบควบคุมแบบ enterprise โดยแปลง requirement ให้เป็น backlog ที่ลงมือพัฒนาได้ทันที แบ่งตาม milestone, workstream, sprint, และ release control.

---

## 1) Delivery Milestones

### Milestone 1 — Demo Ready
ต้องโชว์ครบ:
- Signup + onboarding checklist
- Policy block
- Approval flow
- Audit / replay / proof

### Milestone 2 — UAT Ready
ต้องเพิ่ม:
- Role boundaries ครบ
- Readiness check
- Integration connect + test
- Execution detail / timeline
- Usage / quota / billing summary

### Milestone 3 — Pilot Ready
ต้องเพิ่ม:
- Audit completeness
- Retry / recovery
- Stronger error handling
- Export / reporting
- Alerting / notifications

---

## 2) Workstreams (7 สายหลัก)

1. Frontend App Experience
2. Backend APIs and Business Logic
3. Database / Data Model
4. Policy / Approval / Execution Engine
5. Audit / Replay / Proof
6. Usage / Billing / Governance
7. QA / UAT / Demo Enablement

---

## 3) Milestone Mapping (High-Level)

| Milestone | Focus Work |
|---|---|
| Demo Ready | FE-01/02/05/08/09/11, BE-01/02/05/08/09/11/12, DB-01 subset, DEMO-01..04 |
| UAT Ready | FE-03/04/06/07/10, BE-03/04/06/07/10, DB-02/03, QA-01/02 |
| Pilot Ready | FE-12, BE-13, ENG-05, AUD-03/04, GOV-01..04, QA-03..05, DEMO-05 |

---

## 4) Sprint Breakdown

## Sprint 1 — Demo Core

**Scope**
- FE-01, FE-02, FE-05, FE-08, FE-09, FE-11
- BE-01, BE-02, BE-05, BE-08, BE-09, BE-11, BE-12
- DB-01 (core subset)
- DEMO-01..04

**Dependency order (suggested)**
1) Core schema (org/users/memberships/policies/executions/approvals/audit)
2) Auth + onboarding API
3) Policy/review/approval API
4) Audit/replay/proof API
5) FE surfaces for auth + policy + approval + audit
6) Demo seed

**Exit Criteria**
- Signup สำเร็จและเห็น onboarding checklist
- Review outcome ครบ allow / blocked / require_approval
- Approval flow approve/reject ได้จริง (reject ต้องมี reason)
- Audit/replay/proof เปิดดูได้ครบเส้นทาง

---

## Sprint 2 — UAT Core

**Scope**
- FE-03, FE-04, FE-06, FE-07, FE-10
- BE-03, BE-04, BE-06, BE-07, BE-10
- DB-02, DB-03
- QA-01, QA-02

**Dependency order (suggested)**
1) RBAC enforcement
2) Integration connect/test + secret handling
3) Readiness checks + fix routes
4) Execution timeline + failure visibility
5) Functional + cross-role QA

**Exit Criteria**
- Cross-role boundaries ถูกต้อง
- Integrations connect/test ได้พร้อม error message ที่ใช้แก้ปัญหาได้
- Readiness แสดง fail item พร้อม CTA
- Execution detail/timeline ครบสำหรับ UAT walkthrough

---

## Sprint 3 — Pilot Readiness

**Scope**
- FE-12
- BE-13
- ENG-05
- AUD-03, AUD-04
- GOV-01..GOV-04
- QA-03, QA-04, QA-05
- DEMO-05

**Dependency order (suggested)**
1) Usage/billing aggregation
2) Quota + alert thresholds
3) Retry/recovery + manual review state
4) Export/reporting (CSV/PDF + filters + permission)
5) Pilot walkthrough + error-state QA

**Exit Criteria**
- เห็น usage/quota/billing ระดับทีม
- Retry/recovery trace ได้
- Export/replay/proof เคารพ org boundary
- Alerting ครบเหตุการณ์ critical

---

## 5) Delivery Controls

### Definition of Ready (DoR)
ทุก task ต้องมี:
- Problem statement
- User role
- Route/endpoint
- Input/output contract
- Acceptance criteria
- Dependencies
- Audit requirement
- Error states

### Definition of Done (DoD)
ทุก task ต้องผ่าน:
- Implementation complete
- Loading/empty/error states ครบ
- RBAC ถูกต้อง
- Audit events ครบทั้ง success/failure
- QA ผ่าน
- Demo path ไม่พัง
- มี logs/metrics พอสำหรับ debug

### Release Gate (ห้ามข้าม)
ห้ามปล่อย Demo/Pilot ถ้ายังมีข้อใดไม่ผ่าน:
1) Signup/login/onboarding ใช้งานไม่ได้
2) ไม่มี approver แต่ยัง activate high-risk policy ได้
3) Blocked execution ยัง run ต่อได้
4) Approval bypass ได้
5) Audit event ไม่ครบ
6) Replay/proof ใช้งานไม่ได้
7) Usage/quota มองไม่เห็น
8) Role boundaries ผิด

---

## 6) Prioritization (P0/P1/P2)

### P0 (ก่อน Demo)
- BE-01/02/05/08/09/11/12
- FE-01/02/05/08/09/11
- DB-01 subset
- SEC-01/03/04
- AUD-01/02
- DEMO-01..04

### P1 (ก่อน UAT sign-off)
- BE-03/04/06/07/10
- FE-03/04/06/07/10
- DB-02/03
- SEC-02/05
- QA-01/02

### P2 (ก่อน Pilot launch)
- FE-12, BE-13
- ENG-05
- AUD-03/04
- GOV-01..04
- QA-03..05
- DEMO-05

---

## 7) Tracking Fields (Jira / Linear)

แนะนำให้ใช้ fields เดียวกันทุกทีม:
- `milestone`: demo / uat / pilot
- `workstream`: frontend / backend / data / security / engine / audit / governance / qa / demo-ops
- `priority`: p0 / p1 / p2
- `dependency_of`: task ids
- `blocks`: task ids
- `rbac_impact`: yes/no
- `audit_required`: yes/no
- `demo_path`: low-risk-success / blocked-path / approval-path / n-a

---

## 8) Operational Notes

- Enforce server-side authorization แบบ deny-by-default ทุก endpoint สำคัญ
- เก็บ reason code ทุก blocked/denied/rejected action
- ผูก approval กับ execution version + policy snapshot
- ใช้ feature flags สำหรับ flow ที่ยังไม่พร้อม pilot-level control

---

## 9) Files

- `docs/ENGINEERING_TASK_BREAKDOWN_SPRINT_PLAN_TH.md`
