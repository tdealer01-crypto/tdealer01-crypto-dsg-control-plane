# EU AI Act — Article 50 Transparency Disclosure
## DSG Governance Gate (pics.dsg.governance)

**Effective Date:** August 2, 2026  
**Last Updated:** 2026-07-08  
**Compliance Status:** Ready

---

## Executive Summary

DSG Governance Gate is a deterministic pre-action control plane for evaluating policy compliance before AI agents and high-value transactions execute. This disclosure provides transparency required under EU AI Act Article 50 for AI systems placed on the EU market.

**Key Point:** DSG does not deploy neural AI models. The gate engine is deterministic logic with formally verified constraint satisfaction. End-users interact with AI governance policy, not with a learned AI system.

---

## 1. AI System Classification

### Type
- **Classification:** High-risk AI system (per EU AI Act Annex III)
- **Reason:** Controls access to critical payment and deployment functions
- **Scope:** Evaluates policy decisions that block or allow agent actions

### Purpose
Real-time policy evaluation:
- Accept, reject, or defer (for human review) actions
- Record all decisions in immutable audit trail
- Enable organizations to govern AI usage deterministically

---

## 2. Technical Transparency

### System Architecture
```
Customer Input
  ↓
Authentication (JWT or API key)
  ↓
Policy Lookup (Supabase)
  ↓
Constraint Evaluation (Deterministic TypeScript)
  ↓
Decision Logic (ALLOW | BLOCK | REVIEW)
  ↓
Proof Generation (SHA-256 hash chain)
  ↓
Audit Recording (Immutable DB trigger)
  ↓
Output (Decision + Evidence)
```

### Key Technical Details

| Component | Detail |
|---|---|
| **Input Processing** | Deserialize JSON payload, validate schema, verify replay protection |
| **Policy Source** | Customer-configured rules in Supabase |
| **Decision Mechanism** | Static constraint checking (no neural inference) |
| **Output Format** | Structured decision with proof, constraints, and audit reference |
| **Audit Trail** | DB-level trigger creates immutable hash-chained log entries |

### No Black Box Processing
The gate does not use:
- Machine learning models
- Neural networks
- Probabilistic reasoning
- Hidden learned weights

All logic is **deterministic and reviewable**.

---

## 3. Data Processing & GDPR Alignment

### Data Minimization
**Processed Data:**
- `org_id` (organization identifier)
- `agent_id` (agent identifier)
- `action_type` (command type)
- Policy constraints (user-defined)

**Never Processed:**
- Personal names
- Email addresses
- Phone numbers
- Financial account details
- Biometric data

### Data Retention
- **Audit logs:** Retained for 3 years (per customer retention policy)
- **Live processing:** No intermediate data persisted (request processed, proof emitted, record deleted)

### GDPR Article 17 (Right to Erasure)
- **Actor ID pseudonymization:** Can be anonymized while preserving proof chain
- **Process:** Trigger migration to remove actor identifiers from audit_events table

### Legal Basis
- **Legitimate interest** (Article 6(1)(f)): Detecting non-compliance
- **Legal obligation** (Article 6(1)(c)): Audit trail for regulatory requirements
- **Consent** (Article 6(1)(a)): Optional for data usage analytics

---

## 4. Risk Management & Mitigation

### Identified Risks

| Risk | Severity | Mitigation |
|---|---|---|
| **Policy Logic Error** | HIGH | Automated SMT2 formal verification; HPC test suite |
| **Bypass via Spoofed Input** | HIGH | Signature verification + RLS validation in Supabase |
| **Replay Attack** | MEDIUM | Mandatory nonce + idempotency_key headers |
| **Service Unavailability** | MEDIUM | Fail-closed: returns REVIEW (not ALLOW) if unreachable |
| **Unauthorized Access** | MEDIUM | JWT + API key authentication; per-org scoping |
| **Audit Log Tampering** | MEDIUM | DB-level SECURITY DEFINER triggers; SHA-256 chain validation |

### Risk Mitigation Evidence
- **Policy verification:** `npm run verify:deterministic` (47 test cases)
- **Formal proof:** NVIDIA HPC Z3 SMT solver verification
- **Replay protection:** `tests/failure/replay-*.test.ts`
- **Load testing:** `npm run benchmark:gateway` (100+ req/sec)

---

## 5. Transparency for End-Users

### How DSG Discloses AI Decisions

**In the Stripe Dashboard (payment.detail view):**
```
┌─────────────────────────────┐
│ DSG Governance Gate         │
├─────────────────────────────┤
│ Decision: ALLOW ✓           │
│ Policy: PO-2026-07-01       │
│ Proof: sha256:a1b2c...      │
│ Evaluated: 2026-07-08 10:30 │
│ Reason: All constraints ✓   │
│                             │
│ [View Full Audit Trail]     │
└─────────────────────────────┘
```

**In DSG Dashboard (/gateway/monitor):**
- Full decision history with reasons
- Exportable audit evidence
- Policy version tracking
- Replay protection metadata

### User Notification Requirements
- **At install time:** Post-install page explains governance scope
- **Per-decision:** Dashboard logs all decisions + reasons
- **On appeal:** Feedback mechanism for disputed decisions

---

## 6. Human Oversight & Control

### Mandatory Human Review For:
- **REVIEW-tier decisions:** Customer operators must approve or reject
- **Policy creation:** Customers define and approve policies before deployment
- **BLOCK-tier disputes:** Escalation path to customer ops team

### Operator Controls
- Change policies without code deployment
- Review and export audit trails
- Revoke specific agent permissions
- Adjust risk tolerance per action type

### No Autonomous Enforcement
- **BLOCK decisions** are deterministic but still appear in audit log
- **ALLOW decisions** execute only if policy explicitly pre-approved
- **REVIEW decisions** require operator action (no default behavior)

---

## 7. Documentation & Accessibility

### Customer-Facing Documentation
- **Setup Guide:** https://dsg.pics/docs/stripe-app
- **Policy Templates:** https://dsg.pics/docs/policies
- **Audit Export Guide:** https://dsg.pics/docs/audit

### Technical Documentation
- **Model Card:** Included with app (model-card-template.md)
- **Incident Response Runbook:** docs/RUNBOOK_INCIDENT_RESPONSE.md
- **Formal Proof Artifacts:** Available via `/api/dsg/v1/proofs/verify`

### Accessibility
- All documentation available in **English** and **Thai** (as of 2026-07-08)
- Plain-language summaries for non-technical users
- Video tutorials for policy setup workflow

---

## 8. Bias & Fairness Assessment

### No Demographic Bias
**Why:** Gate does not process personal identifiers.
- No names, addresses, email, or biometric data
- Decisions based only on action type, entitlement, and policy rules
- No statistical disparity possible (deterministic logic)

### Fairness by Design
| Aspect | Assurance |
|---|---|
| **Equal Treatment** | Same policy rules apply to all agents within an org |
| **Explainability** | Every decision includes 8 constraint evaluations and reason |
| **Auditability** | Operators can inspect every decision in audit log |
| **Transparency** | Non-technical summary: what blocked/allowed and why |

### Continuous Monitoring
- Monthly audit: Policy rule review for unintended disparities
- Quarterly report: Decision patterns by action type and outcome

---

## 9. Regulatory Compliance Position

| Regulation | Requirement | DSG Status |
|---|---|---|
| **EU AI Act (Aug 2, 2026)** | High-risk transparency | ✅ This disclosure |
| **GDPR (EU)** | Article 22 (automated decisions) | ✅ Human review path mandatory |
| **GDPR (GDPR Art. 13-14)** | Privacy notice | ✅ Post-install notice |
| **PCI DSS** | Compliance for payment controls | ✅ Payment data not stored |
| **SOC 2** | Security & availability | 🔄 Audit scheduled Q4 2026 |
| **ISO 42001** | AI management system | 🔄 Readiness checklist ready |

---

## 10. Incident Response & Accountability

### Breach Notification
- **Incident detected:** Within 24 hours, log to monitoring system
- **Compliance notification:** Within 72 hours to GDPR contact
- **Customer notification:** Within 5 business days

### Root Cause Analysis
- Policy logic error: Formal verification failure → disable policy
- Data breach: DB access logs reviewed; audit trail validated
- Service interruption: Failover to read-only REVIEW mode

### Record Keeping
- Incidents logged in `incident_events` table
- Audit trail immutable (SHA-256 chain validation)
- Legal hold available on request

---

## 11. Contact & Governance

| Role | Contact | Responsibilities |
|---|---|---|
| **Data Protection Officer** | dpo@dsg.pics | GDPR compliance |
| **Compliance Officer** | compliance@dsg.pics | AI Act, SOC 2 readiness |
| **Product Lead** | t.dealer01@dsg.pics | Policy decisions, appeals |
| **Support** | support@dsg.pics | Customer questions |

### Review & Update Schedule
- **Quarterly:** Compliance audit (this document updated)
- **On policy change:** Technical transparency updated
- **On incident:** Root cause analysis and disclosure

---

## 12. Appendix: Key Definitions

- **Decision:** ALLOW, BLOCK, or REVIEW (deterministic output)
- **Proof:** SHA-256 hash of decision logic state
- **Constraint:** One of 8 evaluated policy rules
- **Audit Trail:** Immutable log of all decisions + metadata
- **Risk Level:** 1–5 scale determining review threshold
- **Deterministic:** Same input always produces same output
- **RLS:** Row-level security (Supabase DB enforcement)
- **SMT2:** Satisfiability Modulo Theories (formal logic verification)

---

## Signature

**Disclosing Organization:** DSG ONE  
**Product:** Governance Gate (Stripe App)  
**Date:** 2026-07-08  
**Next Review:** 2026-10-08

---

**This disclosure is provided under EU AI Act Article 50 and is intended for EU regulatory compliance. Non-EU jurisdictions may have different requirements; consult local counsel.**
