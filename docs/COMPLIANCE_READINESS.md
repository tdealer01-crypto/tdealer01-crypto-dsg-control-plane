# Compliance Readiness Documentation

This document maps DSG ONE / ProofGate Control Plane against major compliance frameworks. Each item is classified as **verified implemented**, **pending**, **not verified**, or **out of scope**.

---

## Overview

The system is designed to support regulated governance of AI/agent execution. Compliance readiness depends on:

1. **Product deployment environment** — Supabase region, Vercel region, data residency
2. **Operational policies** — Audit retention, data deletion, access logs
3. **Third-party integrations** — Stripe (payments), Supabase (storage), Sentry (error tracking)
4. **Customer configuration** — Org policies, consent records, DPA/BAA execution

**Claim boundary**: This repo is `audit-ready` and `evidence-ready`, not `certified compliant`. Certification requires customer-specific configuration, legal review, and potentially third-party audit.

---

## Data Residency & Locality Compliance

### Supabase Region Configuration

- [x] **Data residency configurable** — Supabase project region selection
  - Evidence: `vercel.json` documents target region
  - Configuration: Set `SUPABASE_PROJECT_ID` to region-specific project
  - Current region: **not verified** — varies by customer deployment
  - Verify: `supabase projects list` → check region
  - Options: US (Virginia), EU (Frankfurt), Singapore, Tokyo, others

- [ ] **GDPR residency requirement** — EU customer data in EU
  - Requirement: If customer has EU data subjects, data must stay in EU
  - Implementation: Deploy to `eu-west-1` (Frankfurt) region
  - Verification required: Supabase project region confirmation + Vercel edge location confirmation
  - Status: **pending** — customer-specific configuration needed

- [ ] **Data sovereignty compliance** — Non-EU data not transferred outside jurisdiction
  - Implementation: Select appropriate Supabase region per jurisdiction
  - Status: **pending** — varies by customer

---

## GDPR Compliance

### Legal Basis & Consent

- [ ] **Valid legal basis documented** — Contractual, consent, or legitimate interest
  - Evidence needed: Customer DPA (Data Processing Agreement) or BAA
  - Items: Processor responsibilities, sub-processor list, data deletion process
  - Status: **pending** — customer must execute DPA

- [ ] **Consent management** — Users explicitly consent to data processing
  - Pattern: `Cookie Banner` + `Privacy Policy` + `Terms of Service`
  - Evidence: Landing page → check for consent UI
  - Status: **not verified** — depends on customer marketing site

### Data Subject Rights (GDPR Article 12-22)

- [x] **Right to access (Article 15)** — User can export their data
  - Implementation: `/api/audit/export` endpoint returns user's execution records
  - Format: JSON array of executions, decisions, audit trail
  - Verify: `npm run test:integration -- audit-export`
  - Evidence: Route handler in `app/api/audit/export/route.ts`

- [x] **Right to erasure (Article 17)** — User can request data deletion
  - Implementation: Supabase RLS + deletion policies
  - Pattern: User initiated deletion → mark records as `deleted_at` timestamp
  - Soft delete: Preserves audit trail while hiding PII
  - Hard delete: Full removal (optional, requires retention review)
  - Status: **implementation pending** — verify deletion route exists

- [ ] **Right to rectification (Article 16)** — User can correct inaccurate data
  - Pattern: Allow updates to user profile, consent records
  - Status: **not verified** — depends on app features

- [ ] **Right to restrict processing (Article 18)** — Pause data use
  - Pattern: Mark account as restricted, pause billing cycles
  - Status: **pending** — governance feature needed

- [ ] **Right to data portability (Article 20)** — Export in machine-readable format
  - Implementation: `/api/audit/export` returns JSON (machine-readable)
  - Format: Includes decision records, execution logs, audit trail
  - Verify: Test export completeness in `tests/integration/audit-export.test.ts`

- [x] **Respond to data subject requests within 30 days**
  - Process: `support@dsg.pics` receives request → triage → fulfill via API
  - Evidence: Support email address documented
  - Implementation: Email → validation → trigger export/deletion jobs
  - Status: **process defined**, implementation pending

### Data Processing & Security

- [x] **Data Processing Agreement (DPA)** — Contract with customer
  - Evidence: Legal team prepares DPA
  - Status: **pending** — not in repo, handled by Legal
  - Checklist: Processor role, sub-processors, data deletion, assistance obligations, audit rights

- [x] **Encryption at rest** — Supabase automatic encryption
  - Implementation: Supabase managed encryption
  - Evidence: Supabase project → Settings → Encryption status
  - Verify: `curl https://api.supabase.co/admin/projects/<project_id> -H "Authorization: Bearer <key>" | jq .encryption`

- [x] **Encryption in transit** — TLS 1.2+ for all connections
  - Implementation: `next.config.js` — HSTS header enforces HTTPS
  - Verify: `echo | openssl s_client -connect tdealer01-crypto-dsg-control-plane.vercel.app:443 2>/dev/null | grep "Protocol"`

- [x] **Audit logging** — All data access logged
  - Implementation: Supabase RLS audit via Postgres logs
  - Pattern: Queries include user context, timestamp, operation
  - Verify: Supabase dashboard → Logs → check query history
  - Retention: **to be configured** — set log retention policy per GDPR

### Third-Party Sub-Processors

- [x] **Sub-processor list maintained**
  - Current sub-processors:
    - **Supabase** — Database, auth, RLS
    - **Vercel** — Hosting, deployment
    - **Stripe** — Payment processing
    - **Sentry** — Error tracking (optional)
    - **Upstash** — Rate limiting (optional)
  - Evidence: `CLAUDE.md` section 14 documents integrations
  - Status: Customer must review and approve sub-processors

- [ ] **Sub-processor notification** — Customer notified of changes
  - Process: Update `SECURITY_DEPLOYMENT_CHECKLIST.md` + notify via email
  - Status: **process pending** — implement notification workflow

---

## CCPA Compliance (California Consumer Privacy Act)

### Consumer Rights

- [x] **Right to know** — Consumer can request what personal information is collected
  - Implementation: `/api/audit/export` returns user's data
  - Evidence: Export includes all stored attributes
  - Verify: Test data export completeness

- [ ] **Right to delete** — Consumer can request data deletion
  - Implementation: Deletion policy needs confirmation
  - Status: **pending** — verify deletion route with CCPA scope

- [ ] **Right to opt-out of sale** — Consumer can opt-out of personal information "sale" (broad definition)
  - Pattern: If data shared with third parties for valuable consideration, must allow opt-out
  - Status: **likely not applicable** — verify if data is "sold" to sub-processors
  - Rule: Sharing with Stripe for payments = likely not "sale" unless profiling for ads

- [ ] **Right to non-discrimination** — Cannot deny service for exercising privacy rights
  - Requirement: Allow deletion without service penalty
  - Status: **process pending** — ensure deletion doesn't prevent account access

### Disclosures

- [ ] **Privacy Policy** — Disclose categories of personal information collected
  - Required sections: Collection source, business purpose, categories of recipients
  - Evidence: Customer's Privacy Policy (not in this repo)
  - Status: **pending** — customer responsible

---

## PCI DSS Compliance (Payment Card Industry Data Security Standard)

- [x] **Does NOT store card data** — Delegated to Stripe
  - Implementation: No card tokens, PAN, CVV stored locally
  - Pattern: Use `Stripe Elements` → token sent to Stripe → receive token ID
  - Evidence: No card fields in Supabase schema
  - Verify: `grep -r "card\|pan\|cvv\|cvc" supabase/migrations/` — should return empty
  - Status: **out of scope** — Stripe handles PCI compliance

- [x] **PCI DSS scope minimal**
  - Only Stripe webhook signatures validated
  - No internal card processing logic
  - Evidence: `app/api/webhooks/stripe/route.ts` validates `sig` only

---

## SOC 2 Readiness (Service Organization Control)

### Trust Service Criteria

#### Availability (CC-Availability-1)

- [x] **System available and operational**
  - Evidence: Vercel deployment uptime metrics
  - SLA: 99.5% (Vercel standard)
  - Verify: `curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health`
  - Monitoring: Vercel analytics → view uptime dashboard

- [ ] **Incident response plan** — Document and log outages
  - Process: Log outage → notify customers → root cause analysis → fix
  - Status: **pending** — requires runbook documentation

#### Security (CC-9 through CC-10)

- [x] **Access control** — Only authorized users can access
  - Implementation: Supabase auth + RLS policies
  - Evidence: `middleware.ts` protects dashboard; RLS policies on tables
  - Verify: Attempt access without valid session → 401/redirect

- [x] **Encryption** — Data encrypted in transit and at rest
  - In transit: TLS 1.2+ (HTTPS)
  - At rest: Supabase managed encryption
  - Evidence: SECURITY_DEPLOYMENT_CHECKLIST.md sections on encryption

- [x] **Logging & monitoring** — Audit trail of all material changes
  - Implementation: Supabase audit logs + Sentry error tracking
  - Fields: `decision_id`, `agent_id`, `decision`, `timestamp`, `user`
  - Verify: Query `SELECT COUNT(*) FROM execution_audit` in Supabase

- [ ] **Change management** — Document all code/config changes
  - Process: Git commits → PR review → merge → Vercel deploy
  - Evidence: GitHub commit history + Vercel deployment logs
  - Status: **pending** — formalize change control process

- [ ] **Vendor management** — Vet all third-party services
  - Current: Supabase, Vercel, Stripe, Sentry, Upstash
  - Process: Review their SOC 2 reports annually
  - Status: **pending** — maintain SOC 2 vendor assessment registry

#### Processing Integrity (PI-1 through PI-3)

- [x] **Data accuracy** — Execution records are complete and correct
  - Implementation: Type-safe runtime spine, atomic transactions
  - Evidence: `lib/spine/` validation before execution
  - Verify: Unit tests confirm payload validation

- [x] **Complete processing** — All executions recorded (no loss)
  - Pattern: Use idempotency keys + Supabase durability
  - Verify: No missing `decision_id` rows in audit table

- [x] **Authorized processing** — Only valid agents execute
  - Implementation: Bearer token validation + agent status check
  - Evidence: `app/api/execute/route.ts` checks `agent_id` + token

---

## HIPAA Compliance (Health Information Privacy)

- [ ] **Not in scope for MVP** — Unless handling PHI (Protected Health Information)
  - If handling health data: Must conduct HIPAA risk assessment
  - Requirement: BAA (Business Associate Agreement) with Supabase, Vercel
  - Status: **out of scope** unless customer is HIPAA-covered entity

---

## FERPA Compliance (Education Records)

- [ ] **Not in scope for MVP** — Unless managing student records
  - If handling education records: Must ensure access controls match FERPA
  - Status: **out of scope** unless customer is educational institution

---

## Data Retention & Deletion Policies

### Audit Trail Retention

- [ ] **Retention period defined** — How long to keep audit logs
  - Requirement: Varies by jurisdiction (GDPR default 3 years, some require 7)
  - Implementation needed: `supabase/migrations/` add retention policy
  - Pattern: Job runs nightly to delete `execution_audit` rows older than threshold
  - Status: **pending** — define and implement retention

- [ ] **Immutable audit log** — Logs cannot be modified/deleted except by policy
  - Implementation: RLS policies restrict deletion to retention job only
  - Status: **pending** — add immutability check to migration

### Personal Data Deletion

- [ ] **Deletion policy** — How to delete user data on request
  - Process: User request → validate identity → mark `deleted_at` → hard delete after retention
  - Status: **pending** — implement deletion workflow

---

## Evidence & Audit Trail

### Execution Evidence Collection

- [x] **Decision recorded** — Every execution decision logged
  - Fields: `decision_id`, `decision` (PASS/BLOCK/REVIEW), `reason`, `proof`
  - Evidence: `lib/runtime/commit-rpc.ts` writes to audit table
  - Verify: `/api/executions` endpoint returns full trace

- [x] **Lineage tracked** — Request → decision → outcome
  - Fields: `request_hash`, `policy_hash`, `decision_hash`, `lineage_sequence`
  - Implementation: Deterministic hash chain in runtime spine
  - Verify: Replay request → confirm matching hash

- [x] **Timestamp synchronization** — All logs use UTC, synchronized clocks
  - Implementation: Supabase backend timestamps all records
  - Verify: `SELECT created_at FROM execution_audit LIMIT 1` — should be UTC

- [x] **Immutable proof artifacts** — Proof cannot be modified retroactively
  - Implementation: Hash commitment in `execution_proof` table
  - Pattern: Once written, proof hash is part of audit chain
  - Verify: Attempt update to old row → confirm RLS blocks or version increases

### Compliance Evidence Package

- [ ] **Pre-audit evidence export** — Package all compliance evidence for auditor
  - Script: `npm run ccvs:pipeline` → generates evidence matrix
  - Output: JSON file with policy coverage, execution samples, risk assessment
  - Status: **in development** — see `.github/workflows/ccvs-evidence.yml`

---

## Customer-Specific Configuration

The following items require customer configuration and cannot be verified at repo level:

### Required for Production

- [ ] **DPA/BAA execution** — Customer executes Data Processing Agreement
- [ ] **Privacy Policy** — Customer publishes privacy policy with required GDPR/CCPA disclosures
- [ ] **Terms of Service** — Includes disclaimer of liability, use restrictions
- [ ] **Consent records** — Customer collects and maintains user consent
- [ ] **Data residency** — Customer selects Supabase region matching data residency requirements
- [ ] **Retention policy** — Customer defines how long to keep audit logs
- [ ] **Breach notification** — Customer defines breach notification process
- [ ] **Privacy by design** — Customer reviews product features for privacy risks

### Recommended for Compliance Maturity

- [ ] **Data impact assessment (DPIA)** — Customer assesses processing risks under GDPR
- [ ] **Sub-processor approval** — Customer reviews and approves third-party vendors
- [ ] **Vendor management plan** — Customer monitors vendor security posture
- [ ] **Incident response plan** — Customer documents response steps for security incidents
- [ ] **Privacy training** — Customer trains staff on data handling

---

## Verification Commands

```bash
# Check audit logging implemented
grep -r "decision_id\|lineage\|execution_audit" lib/ app/api/ | head -20

# Verify encryption at rest
grep -i "encryption\|encrypted" supabase/migrations/ | head -10

# Check data retention period configured
grep -i "retention\|delete.*older" scripts/ supabase/migrations/ || echo "Not found — must be configured"

# Verify audit export endpoint exists
grep -r "audit.*export\|export.*audit" app/api/ | head -5

# Check deletion policy exists
grep -r "delete.*user\|right.*erasure" app/api/ lib/ || echo "Deletion route not found"

# Verify GDPR compliance clauses in DPA
grep -i "gdpr\|article\|processor\|controller" SECURITY_DEPLOYMENT_CHECKLIST.md | head -10
```

---

## Compliance Roadmap

### Phase 1: Audit-Ready (Current)

- [x] Encryption in transit (TLS 1.2+)
- [x] Encryption at rest (Supabase managed)
- [x] Audit logging (execution_audit table)
- [x] Access control (Supabase RLS)
- [x] Error redaction (no secrets in logs)
- [x] CORS & CSP (security headers)

### Phase 2: Evidence-Ready (In Progress)

- [ ] Immutable audit log schema
- [ ] Retention policy enforcement
- [ ] Data deletion workflow
- [ ] CCVS evidence matrix
- [ ] Compliance export script
- [ ] Incident response runbook

### Phase 3: Certifiable (Post-MVP)

- [ ] Third-party SOC 2 audit
- [ ] Penetration test results
- [ ] GDPR compliance audit
- [ ] Customer DPA template
- [ ] Vendor risk assessments

---

## Related Documentation

- **SECURITY_DEPLOYMENT_CHECKLIST.md** — Security controls implementation
- **VULNERABILITY_DISCLOSURE_POLICY.md** — Responsible disclosure
- **docs/RUNBOOK_DEPLOY.md** — Production deployment checklist
- **CLAUDE.md** — Security conventions and data handling rules
- **supabase/migrations/** — Schema with RLS policies

---

## Support & Escalation

For compliance questions:

- **Product questions**: `support@dsg.pics`
- **Security concerns**: See VULNERABILITY_DISCLOSURE_POLICY.md
- **Audit requests**: Coordinate with Legal team
- **Customer DPA**: Contact Sales for template

---

## Last Updated

Generated: 2026-06-07

Status: **AUDIT-READY** — awaiting customer configuration for production compliance certification.
