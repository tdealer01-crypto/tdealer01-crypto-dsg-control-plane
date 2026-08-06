# DSG ONE Stripe App - Documentation Index

**Complete User-Facing Documentation Suite**  
**Last Updated**: 2026-06-07  
**Support Email**: t.dealer01@dsg.pics

---

## Quick Navigation

### I'm New to DSG ONE
→ Start with **[USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)**

### I Want to Create Policies
→ Read **[POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md)**

### I Need to Understand Compliance
→ See **[AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md)**

### I Have a Quick Question
→ Check **[FAQ.md](FAQ.md)**

---

## Documentation Suite Overview

This documentation package contains **4 comprehensive guides** covering all aspects of DSG ONE Stripe App:

### 1. User Setup Guide
**File**: [USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)  
**Size**: ~30 KB | **Sections**: 12 | **Examples**: 4

**Perfect for**: Installation, account linking, dashboard overview

**Key Topics**:
- What is DSG ONE Stripe App and what problem it solves
- Installing from Stripe App Marketplace
- OAuth account linking process (step-by-step with flow diagrams)
- Dashboard navigation and features
- Setting up your first policies
- Understanding ALLOW, REVIEW, and BLOCK decisions
- Handling blocked transactions
- Viewing and searching audit trails
- Exporting audit data for reports
- Troubleshooting common installation issues
- Where to get help and support

**Best For**:
- New users setting up for first time
- Operations managers onboarding the app
- Compliance officers understanding the system
- IT teams supporting users

**Time to Complete**: 15-30 minutes

---

### 2. Policy Builder Guide
**File**: [POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md)  
**Size**: ~31 KB | **Sections**: 13 | **Examples**: 8

**Perfect for**: Creating, testing, and deploying policies

**Key Topics**:
- Policy concepts (deterministic, immutable, versioned)
- Step-by-step policy creation
- Rule types:
  - Amount Thresholds (with 5 operators)
  - Rate Limits (customer, account, time-based)
  - Approval Requirements (conditional approval)
  - Time-Based Restrictions (business hours, holidays)
- Policy versioning and history
- Testing policies in sandbox mode (4 scenarios)
- Gradual production deployment
- 8 real-world policy examples
- Advanced policy patterns
- Troubleshooting policy issues

**Real-World Examples**:
1. High-Value Charge Approval ($5,000+)
2. Payout Freeze After Hours (6 PM - 8 AM)
3. Rate Limit on Refunds (10 per day)
4. Trusted Vendor Whitelist (auto-allow known customers)
5. Fraud Prevention Rate Limit (100+ per hour = block)
6. Large Refund Approval ($1,000+)
7. Compliance Window Restriction (month-end only)
8. Multi-Level Approval by Amount (tiered)

**Best For**:
- Creating your first policies
- Understanding policy logic
- Testing in sandbox before production
- Troubleshooting policy behavior
- Optimizing based on audit data

**Time to Complete**: 30-60 minutes per policy

---

### 3. Audit Trail Guide
**File**: [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md)  
**Size**: ~23 KB | **Sections**: 10 | **Examples**: Multiple

**Perfect for**: Compliance, auditing, and data management

**Key Topics**:
- What gets logged in the audit trail
- Complete record of each transaction evaluation
- Accessing audit trails (navigation, mobile)
- 15 audit trail data fields explained
- Filtering and searching:
  - By decision type (ALLOW, REVIEW, BLOCK)
  - By date range
  - By operation type
  - By policy
  - By amount
  - By free text
  - Saved filter combinations
- Exporting to CSV, JSON, or PDF
- Scheduled automatic exports
- Data retention (7-year policy explained)
- GDPR right-to-access requests
- Audit integrity verification with proof hashes
- Using audit trails for compliance scenarios
- Best practices for audit management

**Export Options**:
- CSV (spreadsheet format, easy sharing)
- JSON (machine-readable, system integration)
- PDF Audit Report (professional formatting)
- Scheduled exports (daily, weekly, monthly)

**Compliance Scenarios**:
1. Financial audits (showing all high-value transactions)
2. Regulatory inquiries (why specific transaction blocked)
3. Customer disputes (showing policy and decision)
4. Fraud investigation (finding suspicious patterns)

**Best For**:
- Compliance officers managing audits
- Finance teams reconciling transactions
- Auditors verifying governance
- Incident investigation
- Building compliance archives
- GDPR data subject requests

**Time to Complete**: 20-40 minutes

---

### 4. Frequently Asked Questions
**File**: [FAQ.md](FAQ.md)  
**Size**: ~19 KB | **Sections**: 8 | **Questions**: 25+

**Perfect for**: Quick answers without reading full guides

**Key Topics by Section**:

**Getting Started** (5 questions):
- How to get started
- Do I need technical knowledge
- Pricing information

**How It Works** (6 questions):
- How governance gating works
- Real-time vs asynchronous
- Can you block in real-time
- Decision types (ALLOW, REVIEW, BLOCK)
- Handling blocked legitimate transactions

**Policies** (6 questions):
- How many policies should I have
- Changing policies live
- Deleting policies
- Customer-specific policies
- Policy best practices

**Approvals & Reviews** (4 questions):
- Team member approvals
- Automating approvals
- Review queue SLAs

**Data & Security** (5 questions):
- Data security layers
- What data is stored
- Data retention period
- GDPR compliance

**Troubleshooting** (4 questions):
- Policy not working
- Too many false positives
- Wrong policy applying
- Uninstalling the app

**Advanced Topics** (3 questions):
- System integrations
- Multiple Stripe accounts
- Audit integrity verification

**Support & Resources** (4 questions):
- Getting support
- Uptime SLA
- Feature requests
- Product roadmap

**Quick Reference Sections**:
- Common tasks index
- Key resources table

**Best For**:
- Quick answers to specific questions
- First-time users confused about something
- Managers wanting high-level overview
- Support staff answering customer questions
- Sales teams during demos

**Time to Complete**: 5-15 minutes per question

---

## How to Use This Documentation

### Scenario 1: User Just Installed the App

1. Read: **[USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)** sections 1-6
2. Time: ~20 minutes
3. Next: Create first policy

### Scenario 2: Creating First Policy

1. Start: **[POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md)** "Creating Your First Policy"
2. Reference: Example policies section
3. Test: "Testing Policies in Sandbox Mode"
4. Deploy: "Deploying Policies to Production"
5. Time: ~45 minutes

### Scenario 3: Understanding Decisions

1. Read: **[USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)** "Understanding Policy Decisions"
2. Or: **[FAQ.md](FAQ.md)** "What's the difference between ALLOW, REVIEW, and BLOCK?"
3. Time: ~10 minutes

### Scenario 4: Preparing for Audit

1. Read: **[AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md)** sections 1-6
2. Time: ~30 minutes
3. Action: Export audit data using "Exporting Audit Logs"
4. Verify: "Audit Integrity Verification"

### Scenario 5: Troubleshooting Issue

1. Check: **[FAQ.md](FAQ.md)** "Troubleshooting" section first
2. If not found: **[USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md)** "Troubleshooting Installation"
3. Or: **[POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md)** "Policy Troubleshooting"
4. Email: t.dealer01@dsg.pics if issue persists

### Scenario 6: Compliance Question

1. Start: **[AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md)** "Using Audit Trails for Compliance"
2. Reference: Data retention, GDPR, integrity verification
3. Export: Using the export guidance
4. Verify: Proof hash verification

---

## Content Map

```
USER_SETUP_GUIDE.md
├── Installation (Stripe Marketplace)
├── OAuth Account Linking
├── Dashboard Overview
├── Basic Policy Setup
├── Policy Decisions
├── Audit Trail Viewing
└── Support & Troubleshooting

POLICY_BUILDER_GUIDE.md
├── Policy Concepts
├── Rule Types (4 types)
├── Creating Policies
├── Testing in Sandbox
├── Production Deployment
├── Real-World Examples (8)
├── Advanced Patterns
└── Troubleshooting

AUDIT_TRAIL_GUIDE.md
├── What's Logged
├── Accessing Audit Trails
├── Filtering & Searching
├── Exporting Data
├── Data Retention
├── GDPR Compliance
├── Proof Verification
└── Compliance Use Cases

FAQ.md
├── Getting Started
├── How It Works
├── Policies
├── Approvals
├── Security
├── Troubleshooting
├── Advanced Topics
└── Support Resources
```

---

## Key Topics by Role

### For End Users (Operators)
- [USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md) - Dashboard Overview section
- [FAQ.md](FAQ.md) - How It Works section
- [POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md) - Policy examples

### For Compliance Officers
- [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md) - All sections
- [FAQ.md](FAQ.md) - Data & Security section
- [USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md) - Audit viewing section

### For Finance Teams
- [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md) - Exporting section
- [POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md) - Amount threshold policies
- [FAQ.md](FAQ.md) - Data & Security section

### For Operations Managers
- [USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md) - All sections
- [POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md) - Creating policies section
- [FAQ.md](FAQ.md) - All sections

### For System Administrators
- [USER_SETUP_GUIDE.md](USER_SETUP_GUIDE.md) - Installation section
- [POLICY_BUILDER_GUIDE.md](POLICY_BUILDER_GUIDE.md) - Deployment section
- [FAQ.md](FAQ.md) - Advanced Topics section

### For External Auditors
- [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md) - All sections
- [AUDIT_TRAIL_GUIDE.md](AUDIT_TRAIL_GUIDE.md) - Audit Integrity Verification
- [FAQ.md](FAQ.md) - Data & Security section

---

## Key Features Documented

### Installation & Setup
- ✓ Stripe Marketplace installation (5 steps)
- ✓ OAuth authorization flow
- ✓ Account linking verification
- ✓ Initial configuration

### Policy Management
- ✓ 4 rule types with examples
- ✓ 8 real-world policy examples
- ✓ Policy versioning and history
- ✓ Testing in sandbox mode
- ✓ Gradual production deployment

### Decision Making
- ✓ ALLOW (auto-proceed)
- ✓ REVIEW (manual approval)
- ✓ BLOCK (reject operation)
- ✓ Handling false positives

### Audit & Compliance
- ✓ Complete audit logging
- ✓ 7-year data retention
- ✓ CSV/JSON/PDF exports
- ✓ Scheduled exports
- ✓ Proof hash verification
- ✓ GDPR compliance

### Filtering & Search
- ✓ By decision type
- ✓ By date range
- ✓ By operation type
- ✓ By policy
- ✓ By amount
- ✓ By free text

### Support & Troubleshooting
- ✓ 10+ installation troubleshooting steps
- ✓ 5+ policy troubleshooting steps
- ✓ 4+ approval workflow issues
- ✓ Email support contact

---

## Statistics

| Document | Lines | Sections | Examples | Tables |
|----------|-------|----------|----------|--------|
| User Setup Guide | 1,024 | 12 | 4 | 8+ |
| Policy Builder Guide | 1,391 | 13 | 8 | 10+ |
| Audit Trail Guide | 958 | 10 | 4 | 5+ |
| FAQ | 778 | 8 | 25+ Q&A | 3+ |
| **TOTAL** | **4,151** | **43** | **40+** | **26+** |

---

## Document Maintenance

### Last Updated
- **Date**: 2026-06-07
- **Version**: 1.0.0
- **Status**: Complete and ready for release

### How to Update

When features change or new information emerges:

1. Update the relevant document section
2. Update "Last Updated" date to today
3. Keep version number (increment on major releases)
4. Update cross-references if needed
5. Test examples if code changes

### Version History

- **1.0.0** (2026-06-07): Initial comprehensive documentation suite
  - 4 complete guides
  - 4,151 lines of content
  - 40+ real-world examples
  - Covers all major features

---

## Support & Feedback

### Getting Help

For questions about using these guides:
- **Email**: t.dealer01@dsg.pics
- **Response Time**: 24-48 hours

### Providing Feedback

Found an error or want to suggest improvements?
- Email suggestions to t.dealer01@dsg.pics
- Include: Document name, section, and feedback

### Feature Documentation

When new features are added:
1. Document in appropriate guide
2. Add example(s)
3. Update FAQ with common questions
4. Update this index if needed

---

## Quick Links

| What You Need | Document | Section |
|--------------|----------|---------|
| Installation steps | USER_SETUP_GUIDE.md | Installation from Stripe App Marketplace |
| How to create a policy | POLICY_BUILDER_GUIDE.md | Creating Your First Policy |
| Understanding ALLOW/REVIEW/BLOCK | USER_SETUP_GUIDE.md | Understanding Policy Decisions |
| Real policy examples | POLICY_BUILDER_GUIDE.md | Policy Examples |
| Sandbox testing | POLICY_BUILDER_GUIDE.md | Testing Policies in Sandbox Mode |
| Production deployment | POLICY_BUILDER_GUIDE.md | Deploying Policies to Production |
| Viewing audit trail | USER_SETUP_GUIDE.md | Viewing Audit Trails |
| Exporting audit data | AUDIT_TRAIL_GUIDE.md | Exporting Audit Logs |
| GDPR requests | AUDIT_TRAIL_GUIDE.md | GDPR Right-to-Access Requests |
| Proof verification | AUDIT_TRAIL_GUIDE.md | Audit Integrity Verification |
| Troubleshooting | USER_SETUP_GUIDE.md | Troubleshooting Installation |
| Quick answers | FAQ.md | All sections |

---

## Publishing Guide

These documents are ready to:
- Publish to online help center
- Share with customers during onboarding
- Provide to compliance auditors
- Use as training material
- Print as PDF guides
- Link from website
- Include in product emails

---

**Last Updated**: 2026-06-07  
**Version**: 1.0.0  
**Status**: Ready for Release

**Support**: t.dealer01@dsg.pics
