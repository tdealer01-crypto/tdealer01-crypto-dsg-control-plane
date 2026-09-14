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

## Supported Versions and Surfaces

Repository source, a branch name, or `main` alone is not evidence that a component is currently deployed in production. Production claims require current deployment evidence for the relevant runtime.

| Surface | Supported |
|---------|-----------|
| Maintained non-Trinity surfaces in this repository | ✅ Security updates as maintained |
| Legacy `/api/trinity/*`, `/api/dashboard/trinity*`, and `/dashboard/trinity*` surfaces | ❌ Retired and disabled as of 2026-09-14 |
| Older releases | ❌ No |

The retired Trinity surface must remain fail-closed. Re-enabling it requires a new authenticated identity/tenant authorization design and security review; client-supplied `x-trinity-*` headers must not be treated as authority.

## Security Best Practices

This repository follows security practices including:

- dependency scanning;
- CodeQL security scanning in CI where configured;
- secret scanning;
- automated dependency updates;
- security headers;
- explicit authentication and authorization boundaries for maintained protected surfaces.

Security controls must be verified from current repository/provider evidence before they are claimed as active.

## Vulnerability Disclosure Process

1. **Report received** - We acknowledge the report
2. **Investigation** - We reproduce and assess severity
3. **Fix development** - We develop and test a patch or retire the affected surface
4. **Deployment / disablement verification** - We verify the relevant runtime state where applicable
5. **Notification** - We notify the reporter
6. **Public disclosure** - Coordinated after remediation as appropriate

## Out of Scope

We do **not** accept reports for:

- Denial of service (DoS) testing
- Social engineering or phishing
- Third-party service vulnerabilities (report to vendor)
- Automated scanner noise without verification
- Issues already known and tracked

## Legal Protection

If you follow this policy:

- We will not pursue legal action for authorized good-faith testing within this policy
- We grant limited authorization to test within the stated scope
- We support responsible disclosure

## Credit & Recognition

If your report leads to a fix:

- Public credit in a security advisory or release notes if appropriate and desired
- Potential bug bounty reward remains discretionary

## Full Disclosure Policy

For complete details, see our full vulnerability disclosure policy:

📄 [Vulnerability Disclosure Policy](docs/VULNERABILITY_DISCLOSURE_POLICY.md)

## Security Contacts

| Contact | Email | Purpose |
|---------|-------|---------|
| Security Team | security@dsg.pics | Vulnerability reports |
| Support | support@dsg.pics | General security questions |

## Recent Security Updates

- ✅ 2026-09-14: legacy Trinity API/dashboard surfaces retired at the proxy boundary; requests are designed to return HTTP 410 before route execution, authentication, or database access. Untrusted `x-trinity-role`, `x-trinity-org-id`, `x-trinity-actor-id`, and `x-trinity-wallet-address` headers are stripped from forwarded non-Trinity requests as defense in depth.
- ✅ June 2026: dependency/security remediation work recorded in repository history.

---

**Thank you for helping keep DSG ONE secure.**

*Last Updated: September 14, 2026*
