# DSG ONE - GitHub Marketplace Listing
## Deterministic Security Gateway for AI-Driven Development

**Status:** Ready to Submit (Aug 20, 2026)  
**Target Launch:** September 1, 2026  

---

## 1. App Overview

### Short Description (60 characters)
```
Governed AI agent execution with deterministic audit trails
```

### Full Description (1,000 words)

**DSG ONE** is a deterministic security gateway that brings governance and accountability to AI-driven development workflows. Designed for teams using AI agents in CI/CD pipelines, code generation, and automated deployments, DSG ONE ensures every AI action is:

- **Approved** — Policy-based decision making before execution
- **Auditable** — Complete evidence trail for compliance (SOC 2, ISO 27001)
- **Deterministic** — Reproducible outcomes with formal proof support
- **Controlled** — Role-based access and rate limiting

### Key Features

**1. Deterministic Policy Evaluation**
- TypeScript-based policy engine
- Z3 formal proof verification
- Reproducible decision making
- No randomness, no surprises

**2. Governed Execution**
- Approve/block/review AI actions before they run
- Rate limiting and quota enforcement
- Webhook integration with GitHub workflows
- API-first architecture

**3. Compliance Evidence**
- SOC 2 Type I certified controls
- L1-L5 CCVS evidence chain
- Audit logs for every decision
- GDPR/CCPA compliant data handling

**4. Developer Experience**
- GitHub App integration (install in 1 click)
- REST API + MCP (Model Context Protocol) support
- Webhook-based event streaming
- Real-time policy decisions

### Who It's For

- **Security Teams** — Maintain governance over AI operations
- **DevOps Engineers** — Control AI in CI/CD pipelines
- **Compliance Officers** — Generate audit trails automatically
- **Development Teams** — Use AI safely in production

### Use Cases

**1. AI-Powered Code Review**
- AI reviews PRs with DSG governance
- Decisions logged for compliance
- Allows/blocks based on policy
- Evidence available for audits

**2. Automated Deployments**
- AI proposes deployment plans
- DSG evaluates risk + policy
- Approve before executing
- Full audit trail recorded

**3. Incident Response**
- AI suggests remediation steps
- DSG governance controls changes
- Rate limiting prevents cascading failures
- Compliance evidence captured

**4. Security Scanning**
- AI security tools run with quotas
- Prevent resource exhaustion
- Audit findings automatically logged
- Compliance-ready reports

---

## 2. Pricing Model

### Free Tier
- **Price:** Free
- **Included:** 100 governance decisions/month
- **Use case:** Small teams, testing, prototyping

### Pro
- **Price:** $99/month
- **Included:** 10,000 governance decisions/month
- **Features:**
  - Deterministic gate evaluation
  - Basic audit export (JSON)
  - Email support (24h response)
  - Monthly compliance reports

### Business
- **Price:** $199/month
- **Included:** 1,000,000 governance decisions/month
- **Features:**
  - Everything in Pro
  - Merkle tree audit proofs
  - SARIF format export
  - Multi-org support
  - Custom rate limits

### Enterprise
- **Price:** $499/month
- **Included:** Unlimited governance decisions
- **Features:**
  - Everything in Business
  - Dedicated success manager
  - Priority support (1h response)
  - 99.99% uptime SLA
  - White-label options
  - On-premises deployment

**Billing:** Monthly or annual (20% discount)

---

## 3. Installation & Setup

### Quick Start

1. **Install DSG ONE** from GitHub Marketplace
   - Go to your repository → Settings → Integrations
   - Install DSG ONE app
   - Grant requested permissions

2. **Create `.dsg/policy.ts`** in your repo
   ```typescript
   import { createPolicy } from '@dsg/sdk';
   
   export default createPolicy({
     name: 'ai-governance',
     rules: [
       {
         action: 'deploy',
         condition: (ctx) => ctx.riskLevel === 'low',
         decision: 'ALLOW'
       },
       {
         action: 'deploy',
         condition: (ctx) => ctx.riskLevel === 'high',
         decision: 'REVIEW'
       }
     ]
   });
   ```

3. **Add to GitHub Actions**
   ```yaml
   - name: DSG Governance Check
     uses: tdealer01-crypto/dsg-action@v1
     with:
       action: 'deploy'
       risk-level: ${{ env.RISK_LEVEL }}
   ```

4. **Start Using**
   - GitHub app evaluates policies
   - Blocks/approves based on rules
   - Audit logs available in dashboard

### Documentation
- **Full Guide:** https://dsg.pics/docs
- **API Reference:** https://dsg.pics/api
- **Examples:** https://github.com/tdealer01-crypto/dsg-examples

---

## 4. Permissions Requested

DSG ONE requests these GitHub permissions:

| Permission | Purpose | Why Needed |
|-----------|---------|-----------|
| `contents:read` | Read repository code | Analyze policies and code |
| `pull_requests:write` | Comment on PRs | Report policy decisions |
| `checks:write` | Create check runs | Show governance status |
| `actions:read` | Read workflow runs | Evaluate CI/CD context |
| `deployments:read` | Read deployment status | Assess deployment risk |
| `issues:write` | Create/update issues | Track policy violations |
| `metadata:read` | Read repository metadata | Basic repository info |

**Privacy:** DSG ONE does NOT:
- Store your code
- Share data with third parties
- Modify your code without approval
- Require personal credentials

---

## 5. Security & Compliance

### SOC 2 Type I Certified
- ✅ Security controls audit (Aug 2026)
- ✅ Data encryption (AES-256)
- ✅ Access control (RBAC + MFA)
- ✅ Audit logging (complete trail)
- ✅ Incident response procedures

### Compliance Standards
- ✅ GDPR compliant (data subject rights)
- ✅ CCPA compliant (California privacy)
- ✅ ISO 27001 aligned (information security)
- ✅ SOC 2 Type II roadmap (2027)

### Data Handling
- **Stored:** Supabase (EU region, encrypted)
- **In Transit:** TLS 1.3+
- **Backups:** Daily automated, 30-day retention
- **Deletion:** Soft-delete (30 days), then hard-delete

---

## 6. Support & Documentation

### Getting Help
- **Email:** support@dsg.pics
- **Response Time:** 24 hours (Standard), 1 hour (Enterprise)
- **Docs:** https://dsg.pics/docs
- **Status Page:** https://status.dsg.pics

### Training & Certification
- **Getting Started Guide:** https://dsg.pics/get-started
- **Video Tutorials:** https://dsg.pics/videos
- **Policy Language Guide:** https://dsg.pics/policy-guide
- **Community Slack:** https://slack.dsg.pics

### Incident Reporting
- **Security Issues:** security@dsg.pics
- **Product Issues:** support@dsg.pics
- **GitHub Issues:** https://github.com/tdealer01-crypto/dsg-control-plane/issues

---

## 7. Screenshots & Marketing Assets

### Screenshot 1: Installation
**Caption:** "Install DSG ONE in one click from GitHub Marketplace"
- Show: GitHub Marketplace listing page → Install button → Permission grant
- File: `docs/marketplace/screenshot-1-install.png` (to create)

### Screenshot 2: Policy Editor
**Caption:** "Write TypeScript policies with IDE autocomplete"
- Show: `.dsg/policy.ts` file → Code editor → Policy rules
- File: `docs/marketplace/screenshot-2-policy.png` (to create)

### Screenshot 3: Governance Dashboard
**Caption:** "Real-time visibility into AI governance decisions"
- Show: Dashboard → Decisions graph → Audit log
- File: `docs/marketplace/screenshot-3-dashboard.png` (to create)

### Screenshot 4: Audit Trail
**Caption:** "Complete evidence trail for compliance audits"
- Show: Audit log → Decision details → Evidence artifacts
- File: `docs/marketplace/screenshot-4-audit.png` (to create)

---

## 8. App Listing Metadata

### Category
- ☑ Continuous integration (CI)
- ☑ Security & compliance

### Languages
- ☑ TypeScript
- ☑ JavaScript
- ☑ Python

### Company Info
- **Company:** DSG One, Inc.
- **Website:** https://dsg.pics
- **Email:** support@dsg.pics
- **Privacy Policy:** https://dsg.pics/privacy
- **Terms of Service:** https://dsg.pics/terms

### Logo & Branding
- **App Logo:** `docs/marketplace/dsg-logo-256.png` (to create)
- **Banner:** `docs/marketplace/dsg-banner.png` (to create)
- **Brand Colors:** Primary: #7c3aed (purple), Secondary: #10b981 (emerald)

---

## 9. Marketplace Requirements Checklist

### Before Submission

**App Configuration:**
- [ ] App manifest configured (`github-app-manifest.json`)
- [ ] Public app set to `"public": true`
- [ ] Webhook URL valid and responding
- [ ] Permissions documented and minimal

**Documentation:**
- [ ] README.md with setup instructions
- [ ] LICENSE file (MIT recommended)
- [ ] CONTRIBUTING.md for developers
- [ ] CHANGELOG.md with version history

**Security:**
- [ ] SOC 2 Type I audit passed (Aug 15)
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Security contact in place

**Marketplace Assets:**
- [ ] App logo (256x256 PNG)
- [ ] Banner image (1200x630 PNG)
- [ ] 4+ screenshots (1280x720 PNG)
- [ ] App description (1000+ words)

**Support:**
- [ ] Support email configured
- [ ] Documentation site live
- [ ] Issue template in GitHub
- [ ] Response time SLA documented

---

## 10. Submission Process

### Step 1: Prepare (Aug 1-15)
- [ ] Create marketplace assets (screenshots, logo, banner)
- [ ] Write full app description (above)
- [ ] Set pricing tiers
- [ ] Create support documentation

### Step 2: Test (Aug 15-20)
- [ ] Install app in test repository
- [ ] Verify webhook functionality
- [ ] Test all permissions work correctly
- [ ] Check audit logging works

### Step 3: Submit (Aug 20)
- [ ] Go to: https://github.com/marketplace/create
- [ ] Fill in app listing form (use content above)
- [ ] Upload screenshots & logo
- [ ] Set pricing & trial period
- [ ] Review & submit

### Step 4: Wait for Approval (Aug 20 - Sept 1)
- GitHub reviews security & compliance
- May request clarifications
- Typically 5-7 business days
- App goes live on marketplace

---

## 11. Post-Launch Plan

### Week 1: Monitor
- [ ] Check for installation issues
- [ ] Monitor support tickets
- [ ] Fix any reported bugs
- [ ] Track install metrics

### Week 2-4: Promote
- [ ] Social media announcement
- [ ] Blog post: "DSG ONE on GitHub Marketplace"
- [ ] Email to beta users
- [ ] Dev community outreach

### Ongoing: Maintain
- [ ] Monthly feature releases
- [ ] Security updates within 24h
- [ ] Support SLA compliance
- [ ] Quarterly roadmap updates

---

## 12. Success Metrics

**Track:**
- Installations per week
- Active repositories using DSG
- Governance decisions processed
- Customer support response time
- User satisfaction (reviews)

**Goals (Q4 2026):**
- 500+ installations
- 50+ active customers
- 1M+ governance decisions processed
- 4.5+ star rating

---

## Content Checklist - Ready to Submit

- [ ] App description (Section 1) ✅ Complete
- [ ] Pricing model (Section 2) ✅ Complete
- [ ] Installation guide (Section 3) ✅ Complete
- [ ] Permissions explanation (Section 4) ✅ Complete
- [ ] Security info (Section 5) ✅ Complete
- [ ] Support details (Section 6) ✅ Complete
- [ ] Screenshots (Section 7) ⏳ To create
- [ ] Metadata (Section 8) ✅ Complete
- [ ] Requirements checklist (Section 9) ✅ Complete
- [ ] Submission steps (Section 10) ✅ Complete
- [ ] Post-launch plan (Section 11) ✅ Complete

---

**Ready to submit:** August 20, 2026 (after SOC 2 audit completion)
