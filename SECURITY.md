# Security Policy

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

**Primary Contact:** security@dsg.pics

**Response Time:** Within 24 hours (business days)

**Reporting Steps:**

1. Email security@dsg.pics with full details
2. Include reproduction steps and proof of concept
3. Describe the impact and severity
4. Do NOT post publicly until we confirm a fix is deployed

### What to Include in Your Report

- **Description:** What is the vulnerability?
- **Reproduction steps:** How to reproduce the issue
- **Proof of concept:** Minimal code or curl command
- **Affected component:** Which endpoint, page, or library
- **Impact:** What could an attacker do?
- **Severity:** Your assessment (critical/high/medium/low)
- **Environment:** Production, staging, or local
- **Contact info:** Your name and email for follow-up

### Response Timeline

| Severity | Response Time | Public Disclosure Delay |
|----------|--------------|------------------------|
| **Critical** | Fix within 24-48 hours | 72 hours after fix |
| **High** | Fix within 3-5 days | 14 days after fix |
| **Medium** | Fix within 7 days | 30 days after fix |
| **Low** | Fix within 30 days | 60 days after fix |

## Supported Versions

We actively support and provide security updates for:

| Version | Supported |
|---------|-----------|
| Latest production (main branch) | ✅ Yes |
| Development branches | ⚠️ Best effort |
| Older releases | ❌ No |

## Security Best Practices

This repository follows security best practices:

- ✅ All dependencies scanned (npm audit)
- ✅ CodeQL security scanning in CI
- ✅ Gitleaks secret scanning
- ✅ Automated security updates via Dependabot
- ✅ Branch protection and required reviews
- ✅ Signed commits encouraged
- ✅ Security headers enforced

## Vulnerability Disclosure Process

1. **Report received** - We acknowledge within 24 hours
2. **Investigation** - We reproduce and assess severity
3. **Fix development** - We develop and test a patch
4. **Deployment** - We deploy the fix to production
5. **Notification** - We notify the reporter
6. **Public disclosure** - After fix is deployed (coordinated)

## Out of Scope

We do **not** accept reports for:

- Denial of service (DoS) testing
- Social engineering or phishing
- Third-party service vulnerabilities (report to vendor)
- Automated scanner noise without verification
- Issues already known and tracked

## Legal Protection

If you follow this policy:

- We will not pursue legal action
- We grant limited authorization to test
- You are protected under responsible disclosure

## Credit & Recognition

If your report leads to a fix:

- Public credit in security advisory (if desired)
- Acknowledgment in release notes
- Potential bug bounty reward (discretionary)

## Full Disclosure Policy

For complete details, see our full vulnerability disclosure policy:

📄 [Vulnerability Disclosure Policy](docs/VULNERABILITY_DISCLOSURE_POLICY.md)

## Security Contacts

| Contact | Email | Purpose |
|---------|-------|---------|
| Security Team | security@dsg.pics | Vulnerability reports |
| Support | support@dsg.pics | General security questions |

## Recent Security Updates

Track our security improvements:

- ✅ June 2026: npm audit 8 vulnerabilities → 0 vulnerabilities (PR #781)
- ✅ CI/CD: CodeQL and Gitleaks automated scanning
- ✅ 2501 tests passing with security coverage

---

**Thank you for helping keep DSG ONE secure.**

*Last Updated: June 2026*
