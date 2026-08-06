# ISO 42001 AI Management System — Readiness Checklist
## DSG ONE / ProofGate Control Plane

**Assessment Date:** 2026-07-08  
**Certification Status:** Not certified (readiness: 82%)  
**Target Certification:** Q4 2026

---

## Checklist Structure

The ISO 42001:2024 standard defines requirements across 8 sections. This checklist maps DSG ONE's current implementation to each requirement.

**Legend:**
- ✅ Implemented and verified
- 🟡 Partially implemented (gaps listed)
- ❌ Not implemented
- 🔄 In progress (target date given)

---

## Section 1: Scope & Context (Governance)

| Requirement | Status | Evidence | Gap/Action |
|---|---|---|---|
| **4.1 Understand org context** | ✅ | Org model, role hierarchy | None |
| **4.2 Understand stakeholder needs** | 🟡 | Customer feedback form exists | Formalize process, quarterly review |
| **4.3 AI management system scope** | ✅ | Scope: deterministic gate, Supabase policy store | None |
| **4.4 AI management system** | 🟡 | Processes documented in GitHub | Formalize into procedures manual |
| **5.1 Leadership commitment** | 🟡 | Thanawat as founder + CTO | Need written AI governance policy statement |
| **5.2 Policy** | ❌ | None formal | Create AI governance policy (draft provided below) |
| **5.3 Org roles, responsibilities, authorities** | ✅ | RBAC: OWNER, ADMIN, OPERATOR, VIEWER | Documented in `docs/RBAC.md` |

**Action Items:**
- Write AI governance policy statement (1 hour)
- Formalize stakeholder feedback process (1 hour)
- Document procedures manual (4 hours)

---

## Section 2: Planning (Risk & Opportunities)

| Requirement | Status | Evidence | Gap/Action |
|---|---|---|---|
| **6.1 Actions addressing risk/opportunities** | ✅ | Risk matrix in model card | None |
| **6.2 Objectives & planning** | 🟡 | Roadmap exists (GitHub projects) | Align with ISO objectives format |
| **6.3 Planning changes** | ✅ | Semver versioning, PR process | Documented in CLAUDE.md |

**Action Items:**
- Reformat roadmap to ISO objectives template (1 hour)

---

## Section 3: Support (Resources & Competence)

| Requirement | Status | Evidence | Gap/Action |
|---|---|---|---|
| **7.1 Resources** | 🟡 | Vercel, Supabase, Stripe (paid) | Document infrastructure & costs |
| **7.2 Competence** | 🟡 | Thanawat (full-stack), team of 1 | Plan for hiring AI governance specialist |
| **7.3 Awareness** | 🟡 | AGENTS.md, CLAUDE.md documented | Create employee onboarding checklist |
| **7.4 Communication** | ✅ | GitHub issues, PR reviews, Slack | Process exists |
| **7.5 Documented info** | 🟡 | Scattered across docs/, README | Create unified documentation portal |
| **7.6 Control documented info** | 🟡 | Some versioning | Implement document control log |

**Action Items:**
- Infrastructure cost/resource doc (1 hour)
- Competence plan for team growth (2 hours)
- Employee onboarding checklist (2 hours)
- Documentation portal setup (4 hours)
- Document control log (2 hours)

---

## Section 4: Operation (AI Lifecycle)

| Requirement | Status | Evidence | Gap/Action |
|---|---|---|---|
| **8.1 Planning & control of processes** | ✅ | Documented workflows in scripts/ | None |
| **8.2 AI system requirements** | 🟡 | Requirements in PROJECT_TRUTH.md | Create formal requirement matrix |
| **8.3 AI system design & development** | ✅ | Z3 verification, HPC formal proof | None |
| **8.4 Data & data lifecycle** | ✅ | Supabase migrations, RLS policy | None |
| **8.5 Model monitoring & maintenance** | 🟡 | Monitoring exists (Phase 3 in progress) | Complete Phase 3 implementation |
| **8.6 Human oversight** | ✅ | Review queue, approval workflow | Documented in approval flow |
| **8.7 AI system performance evaluation** | 🟡 | Benchmarks in scripts/ | Formalize evaluation framework |
| **8.8 Remediation & contingency** | 🟡 | Runbook exists; incident response doc | Test remediation procedures quarterly |

**Action Items:**
- Formal requirement matrix (2 hours)
- Phase 3 monitoring completion (see roadmap)
- Performance evaluation framework (3 hours)
- Quarterly remediation drills (on schedule)

---

## Section 5: Evaluation & Corrective Action (Testing & Audit)

| Requirement | Status | Evidence | Gap/Action |
|---|---|---|---|
| **9.1 Monitoring & measurement** | ✅ | 2895 tests, benchmark scripts | None |
| **9.2 Internal audit** | 🟡 | Security audit done (PR #858–#859) | Schedule quarterly audits |
| **9.3 Management review** | 🟡 | Quarterly product review exists | Formalize management review agenda |
| **9.4 Control nonconformity & corrective action** | ✅ | Issue/PR process, incident runbook | None |

**Action Items:**
- Schedule quarterly internal audits (calendar invite)
- Formalize management review template (1 hour)

---

## Section 6: Improvement (Continuous)

| Requirement | Status | Evidence | Gap/Action |
|---|---|---|---|
| **10.1 General** | ✅ | Feedback loop via GitHub, customer issues | None |
| **10.2 Nonconformity & corrective action** | ✅ | Root cause analysis process | None |
| **10.3 Continual improvement** | 🟡 | Roadmap updated quarterly | Formalize improvement metric tracking |

**Action Items:**
- Improvement metric dashboard (2 hours)

---

## Detailed Assessment

### Governance & Leadership

**Status: 85% ready**

**Implemented:**
- ✅ Founder-led governance with clear decision authority
- ✅ RBAC model with 4 roles (OWNER, ADMIN, OPERATOR, VIEWER)
- ✅ PR-based change control
- ✅ Evidence-first culture documented in AGENTS.md

**Gaps:**
- 🟡 No formal AI governance policy document
- 🟡 Stakeholder consultation process not formalized
- 🟡 No AI ethics or responsible AI statement

**Remediation (4 hours):**
```markdown
## AI Governance Policy

**Purpose:** Ensure all AI systems (gates, agents, models) are 
developed, deployed, and monitored with appropriate governance controls.

**Scope:** DSG ONE platform, all AI decision systems.

**Policy:**
1. All AI decisions must be explainable and auditable
2. No autonomous enforcement without human review path
3. Deterministic logic preferred over learned models
4. Quarterly risk assessments required
5. Incidents must be reported within 24 hours

**Roles:**
- CTO: Policy approval, risk tolerance decisions
- AI Governance Officer: Monitoring, audit, incident response
- Operators: Policy enforcement, decision review
- Developers: Design & testing per standards

**Review Schedule:** Annually or on incident
```

---

### Risk & Opportunity Management

**Status: 88% ready**

**Implemented:**
- ✅ Risk matrix in model card (8 risks × 3 mitigations each)
- ✅ Formal proof verification (Z3 HPC)
- ✅ Replay protection (nonce + idempotency)
- ✅ Fail-closed error handling (REVIEW on service down)

**Gaps:**
- 🟡 No risk register tracking open risks over time
- 🟡 No opportunity assessment (market expansion, new customers)
- 🟡 Risk reviews not scheduled

**Remediation (2 hours):**
- Create risk register spreadsheet (5 columns: ID, risk, probability, impact, owner, review_date)
- Add quarterly risk review to calendar
- Map market opportunities to product roadmap

---

### Resource Management

**Status: 70% ready**

**Implemented:**
- ✅ Cloud infrastructure (Vercel, Supabase, Stripe, Upstash)
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Monitoring & alerting (Sentry, PostHog)

**Gaps:**
- 🟡 No documented infrastructure & cost model
- 🟡 Single founder (no backup for CTO role)
- 🟡 No training budget or competence plan
- 🟡 Documentation scattered across 5+ locations

**Remediation (6 hours):**
- Infrastructure doc: CPU/memory/cost per component (1 hour)
- Competence plan: hiring timeline for operations role (2 hours)
- Documentation portal: centralized index (3 hours)

---

### AI Development & Testing

**Status: 92% ready**

**Implemented:**
- ✅ 2895 unit + integration tests
- ✅ Formal proof via Z3 SMT solver (HPC verification)
- ✅ Replay & adversarial test suite
- ✅ Load benchmarks (100+ req/sec)
- ✅ Mutation testing (Stryker)

**Gaps:**
- 🟡 No formal requirements traceability matrix (RTM)
- 🟡 Design reviews not scheduled
- 🟡 No third-party code review

**Remediation (5 hours):**
- RTM mapping tests to requirements (3 hours)
- Schedule monthly design reviews (1 hour)
- Plan for security audit retainer (1 hour, planning only)

---

### Data Governance

**Status: 89% ready**

**Implemented:**
- ✅ GDPR Article 17 pseudonymization plan
- ✅ RLS policies in Supabase
- ✅ Immutable audit trail (DB-level trigger)
- ✅ Data retention policy documented
- ✅ No PII in gate logic

**Gaps:**
- 🟡 No data classification schema (public/internal/restricted)
- 🟡 Data subject access request (DSAR) process manual not written
- 🟡 No vendor data processing agreements documented

**Remediation (4 hours):**
- Data classification doc (1 hour)
- DSAR response procedure (2 hours)
- Vendor DPA checklist (1 hour)

---

### Monitoring & Incident Response

**Status: 80% ready**

**Implemented:**
- ✅ Incident runbook (docs/RUNBOOK_INCIDENT_RESPONSE.md)
- ✅ Error alerting via Sentry
- ✅ Performance monitoring (Vercel Analytics)
- ✅ Audit log immutability verified

**Gaps:**
- 🟡 No SLA documentation (uptime target, response time)
- 🟡 No incident metrics tracking (MTTR, incident rate)
- 🟡 No post-incident review template
- 🟡 No war games / incident drills

**Remediation (6 hours):**
- SLA doc: 99.9% uptime, <5min response (1 hour)
- Incident metrics dashboard (2 hours)
- Post-incident review template (1 hour)
- Quarterly drill schedule (2 hours setup)

---

### Continuous Improvement

**Status: 75% ready**

**Implemented:**
- ✅ GitHub issues for feedback
- ✅ Quarterly product review
- ✅ Customer feedback form
- ✅ Root cause analysis on incidents

**Gaps:**
- 🟡 No metrics for improvement tracking (velocity, defect rate, CSAT)
- 🟡 No formal retrospective process
- 🟡 No innovation/R&D allocation

**Remediation (4 hours):**
- KPI dashboard (velocity, defect rate, uptime, CSAT) (2 hours)
- Retrospective template + schedule (1 hour)
- R&D allocation policy (1 hour)

---

## Overall Readiness Summary

| Section | Status | Gap Hours | Target Close |
|---|---|---|---|
| 1. Governance | 70% | 4 | 2026-07-15 |
| 2. Planning | 90% | 1 | 2026-07-08 |
| 3. Support | 70% | 12 | 2026-08-01 |
| 4. Operation | 85% | 8 | 2026-07-30 |
| 5. Evaluation | 85% | 3 | 2026-07-15 |
| 6. Improvement | 75% | 4 | 2026-07-30 |
| **TOTAL** | **79%** | **32** | **2026-08-01** |

**Certification Timeline:**
- **2026-07-15:** Complete governance, evaluation, planning gaps (8 hours)
- **2026-07-30:** Complete operation & improvement gaps (12 hours)
- **2026-08-01:** Complete support gaps (12 hours)
- **2026-09-01:** Internal audit readiness verification
- **2026-10-01:** Third-party audit + certification

---

## Immediate Actions (Next 2 Weeks)

### Week 1 (2026-07-08 to 2026-07-15)

- [ ] Write AI Governance Policy (4 hours) → `docs/ai-governance-policy.md`
- [ ] Create risk register spreadsheet (1 hour)
- [ ] Schedule quarterly audit calendar invites (0.5 hours)
- [ ] Reformat roadmap to ISO objectives (1 hour)
- [ ] Create post-incident review template (0.5 hours)

**Total:** 7 hours (1 day)

### Week 2–3 (2026-07-15 to 2026-08-01)

- [ ] Infrastructure & cost doc (1 hour)
- [ ] Competence/hiring plan (2 hours)
- [ ] Documentation portal setup (4 hours)
- [ ] Document control log (2 hours)
- [ ] Requirements traceability matrix (3 hours)
- [ ] SLA & incident metrics docs (3 hours)
- [ ] Data governance docs (4 hours)

**Total:** 19 hours (2–3 days)

---

## Contact & Support

| Role | Name | Contact |
|---|---|---|
| **ISO 42001 Lead** | Thanawat | t.dealer01@dsg.pics |
| **Compliance Officer** | (TBD — hire Q3 2026) | compliance@dsg.pics |

---

## References

- **ISO/IEC 42001:2024** — AI Management System
- **NIST AI RMF v1.1** — AI Risk Management Framework
- **EU AI Act** — High-risk classification & transparency
- **GDPR Article 22** — Automated decision-making
- **DSG ONE Repository** — Implementation evidence

---

**Next Review Date:** 2026-10-08  
**Certification Target:** 2026-10-31
