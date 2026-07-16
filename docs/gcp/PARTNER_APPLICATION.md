# Google Cloud Partner Network Application
## DSG ONE / ProofGate Control Plane

**Status:** Application Preparation (July 16, 2026)  
**Target Submit Date:** July 25, 2026  
**Expected Approval:** Aug 20-Sept 15, 2026  

---

## 1. Partner Application Overview

Google Cloud Partner Network (GCPN) provides pathways for technology partners to:
- Integrate with Google Cloud Platform
- Access Google's customer base
- Earn revenue through resale/revenue sharing
- Gain partner benefits (co-marketing, training, support)

**DSG ONE positioning:** AI Runtime Governance Platform for GCP workloads

---

## 2. Application Requirements

### 2.1 Company Prerequisites

**Required:**
- [ ] Legal company registration (DSG One, Inc.)
- [ ] Tax ID / EIN (US)
- [ ] Business bank account
- [ ] Business address & phone
- [ ] Website with company info
- [ ] Privacy policy & terms of service

**Status:** ✅ All in place (dsg.pics domain)

### 2.2 Technical Requirements

**Required:**
- [ ] SOC 2 Type I audit (REQUIRED for all partners)
- [ ] Data security documentation
- [ ] API/integration with GCP services
- [ ] 99% uptime commitment (SLA)
- [ ] Customer support process

**Status:** 
- SOC 2: ⏳ In progress (due Aug 15)
- APIs: ✅ REST + MCP documented
- SLA: ✅ Enterprise tier covers 99.99%
- Support: ✅ support@dsg.pics + security@dsg.pics

### 2.3 Commercial Requirements

**Required:**
- [ ] Defined pricing model
- [ ] Billing/revenue share agreement
- [ ] Customer success plan
- [ ] Marketing materials
- [ ] Sales collateral

**Status:**
- Pricing: ✅ Pro/Business/Enterprise tiers
- Revenue model: ⏳ To define (TBD)
- Collateral: ⏳ Creating marketing deck

---

## 3. GCP Partner Application Form

### 3.1 Company Information

```
Company Name: DSG One, Inc.
Legal Entity: DSG One, Inc. (Delaware C-Corp)
EIN: [EIN number]
Website: https://dsg.pics
Primary Contact: [Name], security@dsg.pics
Phone: [Phone number]
Address: [Headquarters address]

Founded: [Year]
Employees: [Count]
Annual Revenue: [Range - confidential]
Headquarters: [City, State]
```

### 3.2 Partnership Intent

```
Primary Partnership Type:
☑ Technology Partner (Integration)
☐ Reseller Partner
☐ Consulting Services
☐ Channel Partner

Partnership Focus Areas:
☑ AI/Machine Learning
☑ Security & Compliance
☑ Infrastructure/DevOps
☑ Data Analytics

Target Customer Segments:
☑ Enterprise
☑ Mid-market
☑ SaaS companies
☑ Financial services
```

### 3.3 Product/Service Description

```
PRODUCT NAME: DSG ONE / ProofGate Control Plane

DESCRIPTION:
AI runtime governance platform providing deterministic security controls,
compliance evidence generation, and audit trails for AI agent execution.
Integrates with Google Cloud Vertex AI for controlled, auditable AI operations.

KEY CAPABILITIES:
- Deterministic policy evaluation (TypeScript + Z3 SMT solver)
- Runtime execution governance (approve/block/review decisions)
- Audit trail & compliance evidence (L1-L5 CCVS levels)
- Role-based access control (RLS policies)
- Change management & incident response

TARGET USE CASES:
- Regulated AI deployment (financial, healthcare, government)
- Enterprise governance & compliance
- AI safety & alignment
- Audit trail generation for regulatory requirements

GOOGLE CLOUD INTEGRATION:
- Native Vertex AI integration (agent control plane)
- Dataflow compatibility (evidence pipeline)
- BigQuery integration (audit data warehouse)
- Cloud Logging integration (runtime traces)
- IAM integration (identity & access)

COMPETITIVE ADVANTAGES:
- Deterministic decision making (reproducible audit trail)
- Multi-layer evidence (L1-L5 CCVS compliance framework)
- Formal proof support (Z3 theorem verification)
- Zero-trust architecture (Supabase RLS + JWT)
```

### 3.4 Technical Integration

```
INTEGRATION APPROACH:

Primary Integration:
- REST API for governance decisions
- Webhook endpoints for event streaming
- MCP (Model Context Protocol) for AI tooling

Supported Google Cloud Services:
- Vertex AI (AI model deployment)
- Dataflow (evidence pipeline processing)
- BigQuery (audit log warehouse)
- Cloud Logging (structured logging)
- Cloud Tasks (async job processing)
- Cloud KMS (encryption key management)

Security Model:
- OAuth 2.0 for GCP service authentication
- Signed JWTs for request validation
- Service-to-service authentication (service accounts)
- End-to-end encryption (TLS 1.3)
- VPC-native deployments supported

Data Residency:
- Multi-region support (US, EU, Asia-Pacific)
- GDPR/CCPA compliant data handling
- Customer data in customer's GCP project
- No third-party data sharing
```

### 3.5 Security & Compliance

```
SOC 2 TYPE I:
Status: ⏳ Audit in progress (expected Aug 15, 2026)
Auditor: [Selected auditor name]
Scope: DSG ONE control plane infrastructure

SECURITY CONTROLS:
✅ Data encryption (AES-256 at rest, TLS 1.3 in transit)
✅ Access control (RBAC, MFA, audit logging)
✅ Incident response procedures (documented & tested)
✅ Change management (approval workflow, testing)
✅ Backup & recovery (automated daily backups)

COMPLIANCE CERTIFICATIONS:
- SOC 2 Type I (pending Aug 2026)
- GDPR compliant
- CCPA compliant
- ISO 27001 aligned (policies documented)

THIRD-PARTY SECURITY:
- Supabase (SOC 2 Type I certified)
- Vercel (SOC 2 Type II certified)
- Stripe (PCI DSS certified for payment processing)
- Google Cloud (SOC 2 Type II certified)
```

### 3.6 Commercial Model

```
PRICING TIERS:

Pro: $99/month (10,000 executions/month)
- Deterministic gate evaluation
- Basic audit export (JSON)
- Email support (24h response)

Business: $199/month (1,000,000 executions/month)
- Everything in Pro
- Merkle tree proofs
- SARIF export
- Multi-org support

Enterprise: $499/month (Unlimited)
- Everything in Business
- Dedicated success manager
- Priority support (1h response)
- 99.99% uptime SLA
- White-label options
- On-premises deployment

REVENUE SHARE MODEL (Proposed for GCP Partnership):
- Google referral: 15% commission on customer billing
- Partner marketing development fund: 5% of customer revenue
- Co-selling opportunities: Revenue share TBD

CUSTOMER ACQUISITION:
- Direct sales (online + enterprise sales team)
- GCP marketplace integration
- Channel partner resale
- OEM integrations
```

### 3.7 Support & SLA

```
SUPPORT TIERS:

Standard (Included in Business/Enterprise):
- Email support (support@dsg.pics)
- Response time: 24 hours
- Business hours: Monday-Friday 9am-5pm PT

Priority (Enterprise only):
- Phone + Email support
- Response time: 1 hour
- Business hours: Monday-Friday 8am-6pm PT + emergency on-call

SERVICE LEVEL AGREEMENT (Enterprise):
- Uptime: 99.99% monthly uptime
- Incident response: <15 minutes (page on-call)
- Recovery time: <30 minutes target
- Monthly incident reporting
- Quarterly business reviews

INCIDENT RESPONSE:
- P1 (Critical): <15 min response, <1 hour resolution target
- P2 (High): <1 hour response, <4 hour resolution target
- P3 (Medium): <4 hour response, <24 hour resolution target
- P4 (Low): <24 hour response, best-effort resolution
```

### 3.8 Marketing Materials Checklist

**To Create (July 20-25):**

- [ ] Company overview (1-pager)
- [ ] Product overview (1-pager)
- [ ] Technical architecture diagram
- [ ] Customer use case studies (2-3)
- [ ] Pricing comparison (vs competitors)
- [ ] Integration guide (GCP Vertex AI)
- [ ] White paper (AI governance)
- [ ] Case study: Enterprise deployment
- [ ] Security brief (SOC 2 summary)
- [ ] Demo video (5 min product walkthrough)

---

## 4. DRP (Delivery Readiness Program) Requirements

### 4.1 Competency Assessment

Google evaluates partners on competencies:

| Competency | Level | Status | Evidence |
|-----------|-------|--------|----------|
| **Platform Knowledge** | Foundational | ⏳ In progress | Architecture docs, API guides |
| **Security** | Advanced | ✅ Ready | SOC 2 policies, penetration test |
| **Compliance** | Advanced | ✅ Ready | SOC 2 audit, CCVS framework |
| **Customer Success** | Intermediate | ⏳ Create | Support procedures, SLA docs |
| **Sales** | Intermediate | ⏳ Create | Sales collateral, pricing |
| **Technical Support** | Intermediate | ✅ Ready | Support@dsg.pics, runbooks |

### 4.2 Certification Training

**Required training modules:**
- [ ] Google Cloud Platform fundamentals (Google Cloud Skills Boost)
- [ ] Vertex AI deep dive (partner certification track)
- [ ] GCP Security best practices
- [ ] Data privacy & compliance on GCP

**Timeline:** Complete by Sept 1, 2026

### 4.3 Project Demonstration

**Required:**
- [ ] Reference customer deployment (GCP-based)
- [ ] Case study: DSG governance workflow
- [ ] Architecture diagram (DSG + Vertex AI integration)
- [ ] Proof of concept demo

**Status:** ⏳ Using internal test deployment

---

## 5. Application Timeline

| Date | Milestone | Owner | Status |
|------|-----------|-------|--------|
| July 16 | Gather application requirements | DSG Security | ⏳ In progress |
| July 20 | Create marketing materials | DSG Marketing | ⏳ Start |
| July 25 | Submit GCP Partner application | DSG Operations | ⏳ Ready |
| Aug 15 | Receive SOC 2 Type I report | Auditor | ⏳ Expected |
| Aug 20 | Submit SOC 2 to Google (if requested) | DSG Security | ⏳ Contingent |
| Sept 1 | Complete DRP training | DSG Team | ⏳ Target |
| Sept 15 | Google Partner Network approval | Google | ⏳ Expected |

---

## 6. Supporting Documentation

**Files to prepare:**

1. **Company_Profile.pdf**
   - Company overview, team, locations
   - Customer base summary
   - Annual revenue (confidential)

2. **Product_Overview.pdf**
   - Feature list, capabilities
   - Use cases, differentiators
   - Pricing model

3. **Technical_Architecture.pdf**
   - System diagram (DSG + GCP)
   - Integration points
   - Data flow diagram
   - Security architecture

4. **SOC_2_Summary.pdf**
   - Executive summary of SOC 2 audit
   - Control highlights
   - Compliance certifications

5. **Customer_Reference.txt**
   - Reference customer details
   - Use case description
   - Contact for Google to verify

6. **Integration_Guide.md**
   - How to integrate with Vertex AI
   - API documentation
   - Sample code

---

## 7. Next Steps

### Phase 1: Preparation (July 16-25)
1. [ ] Complete application form (this template)
2. [ ] Gather company/legal docs
3. [ ] Create marketing collateral (5-10 pieces)
4. [ ] Prepare reference customer case
5. [ ] Screenshot system architecture
6. [ ] Write technical integration guide
7. [ ] Submit application to Google

### Phase 2: Review (July 25 - Aug 15)
1. [ ] Google asks clarifying questions
2. [ ] Provide additional documentation
3. [ ] Pass initial security review
4. [ ] Receive SOC 2 audit report

### Phase 3: Activation (Aug 15 - Sept 15)
1. [ ] Complete DRP training modules
2. [ ] Upload DRP competency evidence
3. [ ] Google reviews and approves
4. [ ] Partner portal activated
5. [ ] Begin co-marketing activities

---

## 8. Contact Information

**Primary Contact:**
- Name: [Name]
- Title: Security/Operations Lead
- Email: security@dsg.pics
- Phone: [Phone]

**Secondary Contact:**
- Name: [Name]
- Title: Sales/Business Development
- Email: [Email]

**Support Email:** support@dsg.pics

---

**Last Updated:** July 16, 2026  
**Next Review:** July 20, 2026 (before submission)
