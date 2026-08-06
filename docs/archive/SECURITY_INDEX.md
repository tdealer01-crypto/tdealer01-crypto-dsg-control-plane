# Security & Compliance Documentation Index

Quick reference for all security-related documentation in the DSG ONE / ProofGate Control Plane.

---

## Core Security Documents

### 1. [SECURITY_DEPLOYMENT_CHECKLIST.md](./SECURITY_DEPLOYMENT_CHECKLIST.md)
**Purpose**: Verify all security controls are implemented and configured correctly  
**Audience**: DevOps engineers, security team, system administrators  
**Read time**: 15 minutes  

**Covers**:
- Pre-deployment secret management verification
- API security (CORS, CSP, rate limiting, input validation)
- Authentication & authorization controls
- Data security (SQL injection, XSS, encryption)
- Security headers (HSTS, X-Frame-Options, CSP, etc.)
- Database RLS policies
- Error handling & logging
- Production readiness 13-point checklist
- Verification commands (curl, npm, grep tests)

**Key Sections**:
- [CORS & Origin Control](./SECURITY_DEPLOYMENT_CHECKLIST.md#cors--origin-control)
- [Content Security Policy](./SECURITY_DEPLOYMENT_CHECKLIST.md#content-security-policy-csp)
- [Authentication & Authorization](./SECURITY_DEPLOYMENT_CHECKLIST.md#bearer-token-validation)
- [SQL Injection Prevention](./SECURITY_DEPLOYMENT_CHECKLIST.md#sql-injection-prevention)
- [Production Readiness Checklist](./SECURITY_DEPLOYMENT_CHECKLIST.md#production-readiness-checklist)

**When to use**: Before production deployment, during security audits, for compliance verification

---

### 2. [COMPLIANCE_READINESS.md](./COMPLIANCE_READINESS.md)
**Purpose**: Map against regulatory frameworks and identify compliance gaps  
**Audience**: Legal, compliance officers, customers, auditors  
**Read time**: 20 minutes  

**Covers**:
- Data residency & locality compliance
- GDPR (Articles 12-22 on data subject rights)
- CCPA (California Consumer Privacy Act)
- PCI DSS (credit card industry standard)
- SOC 2 (Service Organization Control)
- HIPAA & FERPA (medical & education records)
- Data retention & deletion policies
- Evidence & audit trail requirements
- Customer-specific configuration needed
- Compliance roadmap (Audit-Ready → Evidence-Ready → Certifiable)

**Key Sections**:
- [GDPR Compliance](./COMPLIANCE_READINESS.md#gdpr-compliance)
- [CCPA Compliance](./COMPLIANCE_READINESS.md#ccpa-compliance-california-consumer-privacy-act)
- [PCI DSS Compliance](./COMPLIANCE_READINESS.md#pci-dss-compliance-payment-card-industry-data-security-standard)
- [SOC 2 Readiness](./COMPLIANCE_READINESS.md#soc-2-readiness-service-organization-control)
- [Compliance Roadmap](./COMPLIANCE_READINESS.md#compliance-roadmap)

**When to use**: Before customer contracts, for audit preparation, regulatory gap analysis, privacy impact assessment (DPIA)

**Current Status**: **AUDIT-READY** — awaiting customer configuration for certification

---

### 3. [VULNERABILITY_DISCLOSURE_POLICY.md](./VULNERABILITY_DISCLOSURE_POLICY.md)
**Purpose**: Define process for security researchers to report vulnerabilities responsibly  
**Audience**: Security researchers, bug bounty programs, external security teams  
**Read time**: 10 minutes  

**Covers**:
- Security contact information (`security@dsg.pics`)
- Vulnerability scope (what's in/out of scope)
- Reporting requirements & example template
- Responsible Disclosure (RD) timeline
  - Critical: 24-48 hours to patch, 72-hour disclosure delay
  - High: 3-5 days, 14-day delay
  - Medium: 7 days, 30-day delay
  - Low: 30 days, 60-day delay
- Coordinated Vulnerability Disclosure (CVD) process
- Bug bounty program details (not active, but rewards offered)
- Credit & acknowledgment
- Legal protections
- Common Q&A

**Key Sections**:
- [What We Consider a Vulnerability](./VULNERABILITY_DISCLOSURE_POLICY.md#what-we-consider-a-vulnerability)
- [Reporting Requirements](./VULNERABILITY_DISCLOSURE_POLICY.md#reporting-requirements)
- [Responsible Disclosure Process](./VULNERABILITY_DISCLOSURE_POLICY.md#responsible-disclosure-process)
- [Bug Bounty Program](./VULNERABILITY_DISCLOSURE_POLICY.md#bug-bounty-program)
- [Legal](./VULNERABILITY_DISCLOSURE_POLICY.md#legal)

**When to use**: Distributing to security researchers, security audit kickoff, researcher onboarding

---

## Automated Security Audit

### 4. [scripts/security-audit.sh](../scripts/security-audit.sh)
**Purpose**: Run 15 automated security tests against a deployment  
**Audience**: DevOps, security team, CI/CD pipelines  
**Run time**: 2-3 minutes  

**Tests**:
1. TLS version (must be 1.2+)
2. HTTPS redirect (http → https)
3. CSP headers (Content Security Policy)
4. Security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
5. CORS configuration (no wildcard, origin validation)
6. Rate limit headers (X-RateLimit-*)
7. JWT validation (invalid bearer token → 401)
8. Input validation (payload size, JSON syntax)
9. XSS prevention (Content-Type check)
10. CSRF protection (SameSite cookies)
11. SQL injection (parameterized query verification)
12. Error messages (no stack traces exposed)
13. Health endpoint (availability check)
14. Dependency vulnerabilities (npm audit)
15. CORS preflight (OPTIONS handling)

**Usage**:
```bash
# Default URL
./scripts/security-audit.sh

# Custom URL
./scripts/security-audit.sh --url https://staging.example.com

# Verbose output
./scripts/security-audit.sh --verbose
```

**Output**: JSON results file + console summary with pass/warn/fail counts

**When to use**: Daily/weekly automated testing, pre-production verification, incident investigation

---

## Related Documentation

### In This Repository

- **[CLAUDE.md](./CLAUDE.md)** — Codebase operating guide including security conventions
  - Section 9: Security conventions (secrets, auth, request body safety)
  - Section 10: Supabase & database conventions (RLS, migrations)
  - Section 14: Billing, quota, revenue, and cron conventions

- **[docs/RUNBOOK_DEPLOY.md](./RUNBOOK_DEPLOY.md)** — Production deployment checklist
  - Full production readiness verification
  - Required environment variables
  - Supabase migration verification
  - Public smoke checks

- **[docs/REPO_TRUTH.md](./REPO_TRUTH.md)** — Route and deployment boundaries

- **[docs/PROJECT_TRUTH.md](./PROJECT_TRUTH.md)** — Project control truth source

### Existing Security Modules

- **[lib/security/cors.ts](../lib/security/cors.ts)** — CORS validation & preflight
- **[lib/security/rate-limit.ts](../lib/security/rate-limit.ts)** — Upstash Redis rate limiting
- **[lib/security/api-error.ts](../lib/security/api-error.ts)** — Error redaction
- **[lib/security/request-json.ts](../lib/security/request-json.ts)** — Body size limits
- **[lib/security/cron-auth.ts](../lib/security/cron-auth.ts)** — Cron secret validation

### Configuration Files

- **[next.config.js](../next.config.js)** — CSP, HSTS, security headers
- **[middleware.ts](../middleware.ts)** — Session validation, protected routes
- **[.env.example](./.env.example)** — Environment variable names (no values)

---

## Quick Start

### For Security Team

1. **Audit existing controls**: Read [SECURITY_DEPLOYMENT_CHECKLIST.md](./SECURITY_DEPLOYMENT_CHECKLIST.md)
2. **Run automated tests**: `./scripts/security-audit.sh`
3. **Verify compliance**: Check [COMPLIANCE_READINESS.md](./COMPLIANCE_READINESS.md)
4. **Share with researchers**: [VULNERABILITY_DISCLOSURE_POLICY.md](./VULNERABILITY_DISCLOSURE_POLICY.md)

### For DevOps/SRE

1. **Pre-deployment**: Run security-audit.sh on staging
2. **Production verification**: 13-point checklist in SECURITY_DEPLOYMENT_CHECKLIST.md
3. **Incident response**: See CLAUDE.md Section 9 (security conventions)
4. **Monitor alerts**: Configure rate limiting, audit logging

### For Compliance/Legal

1. **GDPR**: [COMPLIANCE_READINESS.md#gdpr-compliance](./COMPLIANCE_READINESS.md#gdpr-compliance)
2. **CCPA**: [COMPLIANCE_READINESS.md#ccpa-compliance](./COMPLIANCE_READINESS.md#ccpa-compliance-california-consumer-privacy-act)
3. **Customer DPA**: Use VULNERABILITY_DISCLOSURE_POLICY.md as baseline
4. **Audit prep**: Export evidence via npm run ccvs:pipeline

### For External Researchers

1. **Report vulnerability**: Email security@dsg.pics
2. **Review policy**: [VULNERABILITY_DISCLOSURE_POLICY.md](./VULNERABILITY_DISCLOSURE_POLICY.md)
3. **Responsible disclosure**: Follow timeline in policy

---

## Evidence Status

| Control | Status | Evidence |
|---------|--------|----------|
| CORS validation | ✓ Implemented | `lib/security/cors.ts` |
| CSP headers | ✓ Implemented | `next.config.js` lines 116-127 |
| Rate limiting | ✓ Implemented | `lib/security/rate-limit.ts` |
| Input validation | ✓ Implemented | `lib/security/request-json.ts` |
| Error redaction | ✓ Implemented | `lib/security/api-error.ts` |
| RLS policies | ✓ Verified | `supabase/migrations/` |
| Bearer auth | ✓ Implemented | `middleware.ts` + routes |
| HTTPS/TLS | ✓ Implemented | Vercel managed, HSTS header |
| SQL injection prevention | ✓ Implemented | Supabase SDK (parameterized) |
| XSS prevention | ✓ Implemented | React/JSX auto-escaping |
| **Third-party audit** | ⚠ Pending | Not yet commissioned |
| **Penetration test** | ⚠ Pending | Not yet completed |
| **SOC 2 certification** | ⚠ Pending | Roadmap: Q1 2027 |
| **GDPR certification** | ⚠ Pending | Requires customer DPA |

---

## Verification Commands

```bash
# Run all security checks
npm run verify:security-headers
npm run typecheck
npm audit --audit-level=high

# Run security unit tests
npm run test:unit lib/security/

# Check for exposed secrets
grep -r "process.env.*SECRET\|process.env.*KEY" app/ lib/ --exclude-dir=node_modules

# Automated deployment audit
./scripts/security-audit.sh

# Integration tests (requires live DB env)
npm run test:integration
```

---

## Security Contacts

- **Security report**: `security@dsg.pics` (24-hour response)
- **General support**: `support@dsg.pics`
- **Vulnerability disclosure**: See [VULNERABILITY_DISCLOSURE_POLICY.md](./VULNERABILITY_DISCLOSURE_POLICY.md)

---

## Document Updates & Maintenance

- **Last updated**: 2026-06-07
- **Quarterly review**: September 2026
- **Annual review**: June 2027
- **Version**: 1.0

---

## Status Summary

**Security controls**: 20+ verified implemented  
**Compliance frameworks**: GDPR, CCPA, PCI DSS, SOC 2 mapped  
**Automation**: 15-test security audit script  
**Disclosure process**: Defined with 90-day CVD timeline  

**Overall status**: **AUDIT-READY** — production deployment verification required
