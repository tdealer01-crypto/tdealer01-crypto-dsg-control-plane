# Data Security Policy
## DSG ONE / ProofGate Control Plane

**Effective Date:** July 16, 2026  
**Last Updated:** July 16, 2026  
**Classification:** INTERNAL - SOC 2 Type I

---

## 1. Overview

DSG ONE (ProofGate Control Plane) is an AI runtime governance platform that processes, stores, and transmits sensitive execution data, audit trails, and compliance evidence. This policy establishes requirements for protecting all data assets throughout their lifecycle.

**Scope:** All data processed, stored, or transmitted by DSG infrastructure including:
- Customer AI execution requests and responses
- Runtime evidence and audit logs
- Compliance certificates and proofs
- API keys and authentication credentials
- System configuration and deployment state

---

## 2. Data Classification

### 2.1 Data Types

**Level 1: Public Data**
- Marketing materials
- Public API documentation
- Published blog posts
- GitHub public repositories

**Level 2: Internal Data**
- Employee names and roles
- Internal process documentation
- Non-sensitive metrics (uptime, version numbers)

**Level 3: Confidential Data**
- Customer API keys and secrets
- Database credentials
- Deployment configurations
- Customer execution logs

**Level 4: Restricted Data**
- Customer PII (if any)
- Financial data
- Third-party service secrets
- Compliance audit artifacts

### 2.2 Handling Requirements

| Classification | Storage | Access | Encryption | Retention |
|---|---|---|---|---|
| Public | Cloud (CDN) | Unlimited | Optional | Indefinite |
| Internal | Cloud (Vercel, Supabase) | Employees | TLS in transit | Business need |
| Confidential | Cloud (Supabase) | Auth required | AES-256 at rest, TLS in transit | 1 year |
| Restricted | Supabase vault | Role-based RLS | Encrypted + HSM | Compliance period |

---

## 3. Data Collection

### 3.1 Authorized Collection Points

```
✅ POST /api/execute          - AI execution requests
✅ POST /api/spine/execute    - Governance pipeline
✅ POST /api/billing/webhook  - Stripe billing events
✅ GET /api/audit             - Audit log retrieval
✅ POST /api/delivery-proof   - Compliance scanning
```

### 3.2 Collection Practices

- **Purpose Limitation:** Data collected only for stated business purpose
- **Consent:** API users consent via Terms of Service
- **Minimization:** Collect only necessary fields for stated purpose
- **Transparency:** Privacy policy available at `/privacy`

### 3.3 Prohibited Collection

- ❌ Biometric data (unless explicitly required)
- ❌ Financial account numbers (card details handled by Stripe only)
- ❌ Social security numbers
- ❌ Health/medical information

---

## 4. Data Storage

### 4.1 Storage Infrastructure

**Primary Datastore: Supabase (PostgreSQL)**
- **Location:** EU region (compliant with GDPR)
- **Encryption:** AES-256 encryption at rest
- **Backups:** Automated daily backups, 30-day retention
- **Redundancy:** Multi-replica configuration, automatic failover
- **Access:** PostgreSQL JDWC/HTTP via Row-Level Security (RLS)

**Cache Layer: Vercel Edge Network**
- **Function:** Static asset delivery, API response caching
- **Duration:** Configurable TTL (1 hour default)
- **Scope:** Non-sensitive data only (user IDs, timestamps)
- **Purge:** Immediate on policy change

**Secrets Vault: Supabase dsg_secrets Table**
- **Purpose:** Store API keys, credentials, service secrets
- **Access:** Credential Broker only (restricted RPC function)
- **Encryption:** Double-encrypted (Supabase + Broker fingerprinting)
- **Audit:** All access logged to runtime_evidence table

### 4.2 Redundancy

- Database replicas in 2+ zones
- Automated failover within 30 seconds
- Point-in-time recovery available for 30 days
- Weekly automated backup verification

---

## 5. Data Transmission

### 5.1 Encryption in Transit

**All Data Transmission:**
- ✅ HTTPS/TLS 1.3+ (enforced)
- ✅ Certificate pinning (client SDKs)
- ✅ Certificate monitoring via Vercel
- ✅ No unencrypted HTTP allowed

**API Endpoints:**
```
https://tdealer01-crypto-dsg-control-plane.vercel.app/api/*
- Certificate: Vercel managed (auto-renewed)
- Protocol: TLS 1.3
- Cipher suites: Modern only (no legacy)
```

**Database Connections:**
```
Supabase PGWIRE (SSL mode=require)
- Connection pooling: Encrypted
- Replica failover: Transparent
- Connection timeout: 30 seconds
```

### 5.2 Third-Party Transmission

**Allowed Destinations:**
- ✅ Stripe (payment processing) - PCI DSS certified
- ✅ Vercel (deployment) - SOC 2 certified
- ✅ Supabase (data storage) - SOC 2 Type I
- ✅ GitHub (code repository) - SOC 2 Type II

**Data Minimization:**
- Only essential fields transmitted
- No customer data to third parties except Stripe (payment only)

---

## 6. Data Access Control

### 6.1 Access Principles

- **Least Privilege:** Users access only necessary data
- **Role-Based:** Supabase RLS policies enforce by user role
- **Audit Trail:** All access logged to runtime_executions table
- **Time-Limited:** Temporary credentials expire after use

### 6.2 RLS Policies (Supabase)

**Example: runtime_executions Table**
```sql
CREATE POLICY "agent_sees_own_executions" ON runtime_executions
  USING (agent_id = auth.uid());

CREATE POLICY "admin_sees_all" ON runtime_executions
  USING (auth.role() = 'admin');
```

**Coverage:**
- ✅ runtime_executions - actor scoped
- ✅ runtime_evidence - actor scoped
- ✅ dsg_mcp_usage - key owner scoped
- ✅ billing_subscriptions - org scoped

### 6.3 API Authentication

```
Authorization: Bearer <JWT_TOKEN>

Token Requirements:
- Issued by: Supabase Auth
- Expiration: 1 hour (refresh tokens: 30 days)
- Signature: RS256 (JWKS published)
- Claims: sub (user_id), iat, exp, role
```

---

## 7. Data Retention & Disposal

### 7.1 Retention Schedules

| Data Type | Retention | Rationale |
|---|---|---|
| Execution logs | 1 year | Compliance audit trail |
| Billing records | 7 years | Tax/financial compliance |
| Audit evidence | 2 years | SOC 2/compliance requirement |
| API keys (inactive) | 90 days after revocation | Security cleanup |
| Customer deletions | 30 days (soft delete) | GDPR/data subject request |

### 7.2 Disposal Process

**Hard Delete Procedure:**
```sql
-- Soft delete first
UPDATE runtime_executions SET deleted_at = NOW() WHERE id = $1;

-- 30 days later: hard delete
DELETE FROM runtime_executions WHERE deleted_at < NOW() - INTERVAL '30 days';

-- Verified: Backup retention also expires per policy
```

**Verification:**
- Deletion logged to audit_log table
- Backup retention checked weekly
- Spot checks: Query for deleted records (should be 0)

---

## 8. Incident Response

### 8.1 Suspected Data Breach

**Detection Methods:**
- ✅ Automated alerts (unauthorized access patterns)
- ✅ Security scanning (Gitleaks, CodeQL)
- ✅ User reports (support@dsg.pics)
- ✅ Log analysis (daily review of access patterns)

**Response Timeline:**
- **T+0:** Receive report → Log incident (security.log)
- **T+1h:** Assess severity, contain if needed
- **T+4h:** Notify affected parties (if material)
- **T+24h:** Root cause analysis complete
- **T+7d:** Remediation + follow-up comms

**Disclosure:**
- GDPR/CCPA compliance: 72-hour notification
- Customers: Direct notification + status page update
- Regulators: As required by jurisdiction

---

## 9. Compliance Mappings

### 9.1 Relevant Standards

| Standard | Requirement | DSG Implementation |
|---|---|---|
| GDPR | Confidentiality, integrity, availability | Encryption TLS/AES-256, MFA |
| CCPA | Right to access/delete | API routes: /api/audit, soft-delete RLS |
| SOC 2 | Security controls, monitoring | CloudTrail, GitHub Actions logging |
| ISO 27001 | Information security management | ISMS documented in this policy |

---

## 10. Policy Compliance

### 10.1 Training

- All engineers: Annual data security training
- Onboarding: Security policy review (sign-off required)
- Contractors: NDA + policy acknowledgment

### 10.2 Monitoring

- **Automated:** Daily log analysis for access anomalies
- **Manual:** Weekly security team review of audit logs
- **Audit:** Quarterly internal audit of RLS policies
- **SOC 2:** Annual external audit

### 10.3 Violations

Unauthorized access, data exfiltration, or policy violation → Immediate investigation + disciplinary action per company policy.

---

## 11. Contact & Questions

**Data Security Officer:** security@dsg.pics  
**Privacy Officer:** privacy@dsg.pics  
**Incident Report:** security@dsg.pics  

**Last Reviewed:** July 16, 2026  
**Next Review:** January 16, 2027  
**Approved By:** Engineering & Security Leadership
