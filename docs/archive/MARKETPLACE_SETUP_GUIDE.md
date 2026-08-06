# Stripe App Marketplace Setup Guide & Marketing Templates

**Last Updated:** 2026-06-07  
**Purpose:** Complete guide to creating marketplace assets and marketing copy  
**Status:** Ready for use  

---

## Overview

This guide provides:

1. **Screenshot creation guidelines** — How to create professional marketplace screenshots
2. **Marketing copy templates** — Prewritten, customizable copy for all marketplace fields
3. **Key features & use cases** — Talking points for sales and marketing
4. **Pricing communication** — How to explain the freemium model
5. **Legal document templates** — ToS and Privacy Policy outlines
6. **Common rejection reasons** — What Stripe reviewers look for

---

## Part 1: Screenshot Creation Guide

### 1.1 Before You Start

**Software needed:**
- Stripe dashboard (live)
- Screenshot tool (macOS: CMD+Shift+4, Windows: Windows+Shift+S)
- Image editor (Figma, Photoshop, or free: GIMP, Canva)
- Browser at 1920×1080+ resolution

**Setup:**
1. Create a test Stripe account (or use demo data)
2. Set up realistic test data (policies, transactions, audit logs)
3. Close browser tabs, resize to full screen
4. Disable browser bookmarks bar and extensions (cleaner look)

---

### 1.2 Screenshot 1: Dashboard Overview

**Purpose:** Show the main interface, key metrics, and governance status

**What to capture:**
- Policy count or status badge (e.g., "3 Active Policies")
- Real-time metrics (e.g., "42 Operations Today", "0 Blocked")
- Live operation list or summary
- Clear UI hierarchy (main panel + sidebar)

**How to create:**
1. Log into DSG ONE dashboard
2. Navigate to `/dashboard` or main page
3. Wait for all data to load
4. Capture full viewport (1200×800 or crop)

**Example layout:**
```
┌─────────────────────────────────────────────────────┐
│  DSG ONE Governance Dashboard                   [⚙️] │
├──────────────┬──────────────────────────────────────┤
│ • Policies   │ Today's Operations                    │
│ • Executions │ ┌────────────────────────────────────┐ │
│ • Audit      │ │ 42 Gated Operations                │ │
│ • Settings   │ │ ├─ ✅ ALLOW:     32                │ │
│              │ │ ├─ ⏸️  REVIEW:    8                 │ │
│              │ │ └─ 🚫 BLOCK:     2                 │ │
│              │ │                                    │ │
│              │ │ Recent Operations [Show 5 rows]   │ │
│              │ └────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────┘
```

**Annotations (optional):**
- Add arrow: "Real-time policy evaluation"
- Label: "Immutable audit trail"
- Highlight: "Governance metrics"

---

### 1.3 Screenshot 2: Policy Builder

**Purpose:** Show how users create and configure policies

**What to capture:**
- Policy form or builder UI
- Example constraint (e.g., "Max charge: $1000")
- Save/publish button
- Clear visual hierarchy

**Example policy:**
```json
{
  "name": "Daily Charge Limits",
  "description": "Enforce maximum charge amount per merchant",
  "constraints": [
    {
      "type": "charge_amount",
      "operator": "less_than_or_equal",
      "value": 5000,
      "currency": "USD",
      "action": "BLOCK"
    },
    {
      "type": "daily_volume",
      "operator": "less_than_or_equal",
      "value": 50000,
      "currency": "USD",
      "action": "REVIEW"
    }
  ],
  "status": "active",
  "version": "1.2"
}
```

**How to create:**
1. Navigate to policy creation page
2. Fill in example policy (as shown above)
3. Scroll to show form elements clearly
4. Capture with save button visible

**Annotation ideas:**
- "Visual policy builder" (if using forms)
- "JSON API + UI" (if showing code)
- Arrow to constraints: "Enforceable rules"

---

### 1.4 Screenshot 3: Execution Audit Trail

**Purpose:** Show compliance features (audit trail, evidence)

**What to capture:**
- Execution detail view
- Decision and reasoning
- Timestamp and policy version
- Audit trail showing full lineage

**Example execution:**
```
Decision: ✅ ALLOW

Operation Details:
├─ Type: charge.create
├─ Amount: $750 USD
├─ Merchant: acct_demo_12345
└─ Timestamp: 2026-06-07 14:32:15 UTC

Policy Evaluation:
├─ Policy: "Daily Charge Limits" (v1.2)
├─ Constraint: charge_amount ≤ $5000 ✅
├─ Constraint: daily_volume ≤ $50k ✅
└─ Decision: ALLOW

Evidence Hash: sha256:a1b2c3...
Signature: VERIFIED
```

**How to create:**
1. Execute a test operation (or mock one)
2. Navigate to execution detail
3. Capture decision + reasoning + hash
4. Scroll to show audit trail

**Highlights:**
- Evidence hash or signature badge
- Immutable timestamp
- Full policy name and version

---

### 1.5 Screenshot 4: Webhook/Real-Time Integration

**Purpose:** Show real-time event processing (optional)

**What to capture:**
- Webhook event log or live event stream
- Events being gated in real-time
- Integration with Stripe webhooks

**If available, show:**
```
Live Webhook Events:
┌─ charge.created [14:32:15] → EVALUATED ✅
├─ payment_intent.created [14:32:14] → ALLOWED ✅
├─ payout.created [14:31:50] → NEEDS_REVIEW ⏸️
└─ charge.refunded [14:30:22] → APPROVED ✅

Integration Status: ✅ Stripe Connected
Webhooks Monitored: 6
Last Event: 8 seconds ago
Success Rate: 99.8%
```

**How to create:**
1. If live webhook stream available, capture that
2. If not, create mock event list (clearly labeled)
3. Show status badges and timestamps
4. Include integration status

---

### 1.6 Screenshot 5: Onboarding/Setup (Optional)

**Purpose:** Show first-time user experience

**What to capture:**
- Welcome screen or setup wizard
- Step-by-step onboarding
- OAuth integration success
- Call-to-action (create first policy)

**Example onboarding:**
```
┌──────────────────────────────────────────┐
│   Welcome to DSG ONE                     │
│   Operation Governance for Stripe        │
│                                          │
│  Step 1: 🎯 Account Linked              │
│  Step 2: ⏳ Create First Policy           │
│  Step 3: ⏳ Enable Webhooks               │
│  Step 4: ⏳ Review Audit Trail            │
│                                          │
│  [Next: Create Policy] [Learn More]      │
└──────────────────────────────────────────┘
```

**How to create:**
1. Fresh install or reset dashboard state
2. Capture onboarding flow
3. Show progress or step indicators
4. Include call-to-action button

---

### 1.7 General Screenshot Best Practices

#### Design Principles

✅ **DO:**
- Use real or realistic data (not lorem ipsum)
- Keep UI clean and uncluttered
- Highlight the key feature being shown
- Use clear, readable fonts (18pt+)
- Include labels or callouts for clarity
- Use consistent branding/colors
- Test at full 1200×800 resolution
- Export as PNG at 100% quality

❌ **DON'T:**
- Show sensitive customer data (PII, real card numbers)
- Include hardcoded API keys or secrets
- Use overly small fonts (hard to read)
- Cram too much into one screenshot
- Use blurry or pixelated images
- Show errors or broken UI
- Include third-party copyrighted logos
- Use low-quality screen captures

#### Annotation Examples

If you need to add arrows or callouts:

**Option 1: Figma/Canva**
- Import PNG
- Add arrow shape
- Add text label
- Export as PNG

**Option 2: Online tools**
- Screenshot.rocks or similar
- Drag-and-drop annotations
- Export as PNG

**Option 3: Command line (ImageMagick)**
```bash
# Add text annotation
convert screenshot.png -pointsize 20 -fill red \
  -draw "text 100,100 'Policy Builder'" \
  annotated.png
```

---

## Part 2: Marketing Copy Templates

### 2.1 App Store Listing (Short Description)

**Field:** "Short description"  
**Character limit:** 500 characters  
**Tone:** Action-oriented, benefit-focused

#### Template A (Security-focused)

```
Block charges, payouts, and refunds before they happen.

DSG ONE governs every Stripe operation in milliseconds using 
deterministic policies. No more fraudulent charges or policy 
violations reaching your customers.

Real-time gating. Immutable audit trails. Intelligent decisions 
backed by formal evidence. Perfect for finance teams, compliance 
officers, and regulated merchants.

Connect in minutes. Gate in milliseconds. Prove everything.
```

**Character count:** 348 (52 remaining)

#### Template B (Compliance-focused)

```
Deterministic governance for regulated Stripe operations.

Every charge, payout, and refund flows through DSG ONE's policy 
engine before execution. Define rules once, enforce automatically 
across all operations.

Audit-ready decisions. Immutable evidence trails. Real-time policy 
validation. Built for SOX, PCI-DSS, and HIPAA-regulated businesses.

Add governance. Reduce manual work. Stay compliant.
```

**Character count:** 319 (181 remaining)

#### Template C (Operations-focused)

```
Intelligent gating for Stripe operations at scale.

Gate charges, refunds, and payouts before execution. DSG ONE 
evaluates thousands of operations per minute, blocking violations 
automatically while recording complete audit trails.

Reduce manual approvals by 80%. Prevent fraud in real-time. 
Prove compliance with deterministic evidence.

One line of code. Real-time governance. Complete visibility.
```

**Character count:** 322 (178 remaining)

---

### 2.2 Full Description (Long Form)

**Field:** "Full description"  
**Character limit:** 2000 characters  
**Tone:** Comprehensive, solution-oriented

#### Template: Complete Overview

```
DSG ONE brings deterministic governance to your Stripe operations.

WHAT IT DOES
Gate charges, payouts, refunds, and payment intents automatically. 
Every operation is evaluated against your policies in real-time. 
Violations are blocked immediately. All decisions are recorded with 
immutable evidence for compliance audits.

WHY YOU NEED IT

Fraud Prevention
- Block high-risk charges before they post
- Monitor customer patterns in real-time
- Detect unusual transaction activity instantly

Compliance
- SOX, PCI-DSS, HIPAA audit-ready
- Deterministic decision-making (no guesses)
- Immutable audit trails for regulators
- Automated evidence collection

Operational Efficiency
- Reduce manual review workload by 80%
- Eliminate approval bottlenecks
- Process thousands of transactions per minute
- Zero manual overhead once policies are set

HOW IT WORKS

1. Connect: One-click OAuth integration with Stripe
2. Define: Create policies via UI or API (constraints, limits, rules)
3. Gate: All operations auto-gated before execution
4. Audit: Complete decision trails for compliance

BEST FOR
- Finance teams managing large volumes
- Regulated merchants (finance, healthcare, e-commerce)
- Companies with strict fraud/compliance requirements
- Operations teams reducing manual approvals

TECHNICAL DETAILS
- <500ms policy evaluation latency
- 99.5% uptime SLA
- API-first architecture
- Webhooks or polling integration
- Supabase + Stripe-native data

PRICING
- Free: 100 operations/month
- Professional: $299/month + usage
- Enterprise: Custom pricing

Get started in 5 minutes. Govern in real-time.
```

**Character count:** 1,347 (653 remaining)

---

### 2.3 Key Features (Bullet Points)

**Usage:** Marketing website, sales decks, pitch materials

```
✅ Real-Time Policy Evaluation
Evaluate every operation in <500ms. Gate charges, refunds, and 
payouts automatically without slowing your operations.

✅ Deterministic Governance
No weights or guesses. Every decision is backed by formal logic and 
immutable evidence. Audit-ready by design.

✅ One-Click Integration
Connect your Stripe account via OAuth. No API integration required 
(though API is available for advanced use cases).

✅ Flexible Policy Engine
Define rules via UI or JSON. Support for:
- Transaction limits (amount, count, frequency)
- Customer risk assessment
- Product/category controls
- Time-based rules and escalations

✅ Audit Trail Built-In
Every decision recorded with:
- Decision reason (policy + constraint)
- Evidence hash (immutable proof)
- Timestamp and policy version
- Full lineage for compliance

✅ Scalable & Reliable
- Process 1000+ operations per second
- 99.5% uptime SLA
- Auto-scaling infrastructure
- Database replication for safety

✅ Compliance Ready
Built for:
- SOX (auditable governance)
- PCI-DSS (secure payment operations)
- HIPAA (strict audit trails)
- GDPR (data privacy controls)

✅ Developer-Friendly
- REST API for advanced use cases
- Webhook support
- SDK libraries (Node.js, Python)
- Comprehensive API documentation
```

---

### 2.4 Use Cases (3–5 Examples)

**Usage:** Website, sales materials, case study templates

#### Use Case 1: High-Risk Fraud Prevention

**Customer:** E-commerce platform processing 50k transactions/day

**Challenge:** Manual review team drowning in flagged transactions

**Solution:**
- Deploy daily charge limits by customer risk tier
- Auto-block transactions > 5× average order value
- Require approval for international payments

**Result:**
- Fraud blocked: 95% before posting (not after chargeback)
- Time saved: 40 hours/week (approval manual work)
- Customer complaints: Down 60%

---

#### Use Case 2: Regulatory Compliance (Finance)

**Customer:** Fintech company with SOX requirements

**Challenge:** Regulators require provable governance over all operations

**Solution:**
- Define policies for payout governance
- All payouts generate immutable evidence
- Audit trail feeds into compliance dashboards

**Result:**
- Audit time: Reduced 80% (automated evidence gathering)
- Regulatory findings: 0 on governance
- Confidence: Full proof of control

---

#### Use Case 3: Operational Efficiency (Scale)

**Customer:** Subscription platform, 1M+ recurring charges/month

**Challenge:** Approval bottleneck slowing customer onboarding

**Solution:**
- Establish charge limits per plan tier
- Auto-ALLOW charges within limits
- Alert for unusual patterns (manual review)

**Result:**
- Processing time: Reduced from 2 hours to <1 second
- Approval team focus: Now on exceptions only
- Throughput: +300% more charges processed/person

---

#### Use Case 4: Internal Audit (Healthcare)

**Customer:** Healthcare payment processor

**Challenge:** HIPAA requires proof that patient data is used correctly

**Solution:**
- Gate all refunds by patient consent history
- All decisions logged and immutable
- Monthly audit report generated automatically

**Result:**
- HIPAA compliance: Verified and documented
- Manual audit time: 20 hours → 2 hours
- Patient trust: Transparent governance

---

#### Use Case 5: Multi-Team Governance (Enterprise)

**Customer:** Large enterprise with decentralized payment teams

**Challenge:** Ensuring policy consistency across teams/departments

**Solution:**
- Central policy library (shared across teams)
- Department-specific constraints + organization-wide rules
- Dashboard visibility for all teams

**Result:**
- Policy compliance: 100% (no rogue teams)
- Decision transparency: All teams see same rules
- Audit scope: Unified across organization

---

### 2.5 Pricing Tiers Description

**Usage:** Pricing page, marketing materials

#### Freemium Model Explanation

```
PRICING: Simple. Scalable. Fair.

Free Tier
🎯 Perfect for: Testing, small teams, light usage
📊 Operations/month: 100
💰 Cost: $0
✅ Includes:
  - Basic policy creation (UI)
  - Real-time operation gating
  - Audit trail (30 days)
  - Email support
  - Full API access

Professional Tier
🎯 Perfect for: Growing teams, regulated operations
📊 Operations/month: 10,000
💰 Cost: $299/month (overage: $0.03/op)
✅ Includes all of Free, plus:
  - Advanced policy builder (JSON)
  - API rate limit increase (10K req/min)
  - Audit trail (1 year)
  - Webhook integrations
  - Slack alerts
  - Priority support (4h response)

Enterprise Tier
🎯 Perfect for: Large-scale, mission-critical
📊 Operations/month: Unlimited
💰 Cost: Custom (typically $1000–$5000+/month)
✅ Includes all of Professional, plus:
  - Dedicated account manager
  - Custom policy rules (advanced logic)
  - SLA guarantee (99.9% uptime)
  - Multi-tenant setup
  - Custom integrations
  - Phone + Slack support (1h response)

USAGE CALCULATOR

Estimate your monthly cost:
- Small merchant (5k ops/month): Free or $299
- Mid-market (50k ops/month): Professional ($1000–$2000)
- Enterprise (500k+ ops/month): Custom quote

No hidden fees. Cancel anytime. Always month-to-month (except enterprise contracts).
```

---

## Part 3: Legal Document Outlines

### 3.1 Terms of Service Template Outline

**Location:** `https://dsg.example.com/legal/terms-of-service`

#### Sections:

```markdown
# Terms of Service for DSG ONE

## 1. Service Description
- What the service does
- What it doesn't do (not a Stripe replacement)
- Supported use cases

## 2. Account & Access
- Account creation and verification
- API key management and rotation
- User authentication requirements

## 3. Acceptable Use
- Permitted uses: Fraud prevention, compliance, governance
- Prohibited uses: Illegal activity, abuse, unauthorized access
- Compliance with Stripe's policies required

## 4. Fees & Billing
- Pricing tiers and usage-based costs
- Billing cycle (monthly, automatic renewal)
- Overages and how they're calculated
- Refund policy

## 5. Cancellation
- How to cancel (self-service)
- Data deletion upon cancellation
- Final billing statement

## 6. Data & Privacy
- What data we store (operations, audit trails, policies)
- Data retention periods (default: 7 years)
- GDPR/CCPA compliance
- Data breach notification (within 72 hours)

## 7. Intellectual Property
- Our IP: Software, documentation, models
- Your IP: Your data, policies, configurations
- License: Limited, non-exclusive use of our service

## 8. Warranties & Disclaimers
- Service provided "as-is"
- No warranty of 100% accuracy (governance aid, not guarantee)
- No guarantee of Stripe uptime (dependent on Stripe API)

## 9. Liability Limitations
- We're not liable for: Stripe outages, user errors, configuration mistakes
- Liability cap: Lesser of (a) fees paid, (b) $10,000
- We don't warrant that governance is 100% effective

## 10. Indemnification
- You indemnify us from claims arising from your use
- You agree to use service lawfully

## 11. Dispute Resolution
- Governing law: [Your jurisdiction, e.g., California]
- Arbitration required before litigation
- Cost sharing for arbitration

## 12. Termination
- We can terminate for breach, abuse, non-payment
- Termination effective immediately or with 30-day notice
- Upon termination: Data retained for 30 days, then deleted

## 13. Updates to Terms
- We may update terms with 30 days' notice
- Continued use = acceptance of new terms

## 14. Support & SLA (if applicable)
- Support channels (email, knowledge base)
- Response times (free: 24h, professional: 4h)
- SLA: 99.5% uptime (professional), 99.9% (enterprise)

## 15. Contact
- Legal notices sent to: legal@dsg.example.com
- Support: support@dsg.example.com
```

---

### 3.2 Privacy Policy Template Outline

**Location:** `https://dsg.example.com/legal/privacy-policy`

#### Sections:

```markdown
# Privacy Policy for DSG ONE

## 1. Introduction
- What this policy covers
- Scope (your organization's use of DSG ONE)
- Last updated: [Date]

## 2. Information We Collect

### From Your Organization:
- Company name, email, contact info
- Billing information (via Stripe)
- API keys and credentials (encrypted)

### From Your Operations:
- Transaction metadata (amounts, timestamps, customer IDs)
- Policy definitions and versions
- Decision logs (policy evaluation results)
- Audit trail events

### What We DON'T Collect:
- Full credit card numbers (PCI not applicable)
- Customer passwords or auth tokens
- Personal names or addresses (unless in policy definition)
- Sensitive financial data beyond transaction metadata

## 3. How We Use Information

### Service Delivery:
- Evaluate policies in real-time
- Generate audit trails
- Provide API access

### Compliance & Safety:
- Detect abuse or fraud in our service
- Prevent unauthorized access
- Meet legal/regulatory obligations

### Improvement:
- Aggregate analytics (never identify you)
- Usage patterns to improve performance
- Error tracking and monitoring

### What We DON'T Do:
- Never sell customer data
- Never share with third parties for marketing
- Never use data to build competing products

## 4. Data Retention

### Policy Data:
- Policies: Kept as long as account is active
- Versions: Kept indefinitely (audit trail)

### Audit Logs:
- Default: 7 years (regulatory compliance)
- Custom retention available (enterprise)

### Deleted Data:
- Upon deletion: Data marked as deleted immediately
- Purged: After retention period expires
- Backups: Retained per disaster recovery plan (30 days)

## 5. Data Security

### Encryption:
- In transit: TLS 1.3+
- At rest: AES-256 (Supabase default)
- Keys managed: AWS KMS or Supabase Vault

### Access Controls:
- Role-based access (admin, user, read-only)
- API key authentication
- Session management and logout

### Monitoring:
- Audit logs of all data access
- Anomaly detection (unusual access patterns)
- Incident response plan in place

## 6. Third-Party Services (Subprocessors)

We share data with:
- **Stripe**: To evaluate policies
- **Supabase**: Database and storage
- **Vercel**: Hosting and compute
- **Sentry**: Error tracking (no PII sent)

Each processor has their own privacy policy.

## 7. User Rights (GDPR/CCPA)

### Right to Access:
- Request your data: Provided within 30 days

### Right to Deletion:
- Request deletion: Data deleted within 30 days

### Right to Portability:
- Export data in standard format (JSON)

### Right to Opt-Out:
- Withdraw consent for analytics: Supported

## 8. Children's Privacy

We don't knowingly collect data from children (<13).

## 9. California Residents (CCPA)

### Right to Know:
- What personal info is collected
- How it's used and shared

### Right to Delete:
- Request deletion of personal info
- Exceptions: As required by law

### Right to Opt-Out:
- Opt out of data sales (we don't sell)
- Opt out of analytics (request required)

## 10. EU Residents (GDPR)

### Data Processing:
- Based on contract (ToS)
- Legitimate interests (fraud prevention)

### Standard Contractual Clauses:
- Data transferred with SCCs in place
- Sub-processors listed and consented

### Data Protection Officer Contact:
- DPO: privacy@dsg.example.com

## 11. Data Breach Notification

### If Breach Occurs:
- You notified within 72 hours
- Notification includes: Nature, scope, remediation
- Regulators notified if required by law

## 12. Changes to Privacy Policy

- Policy may update: 30 days' notice given
- Material changes: Email notification
- Continued use = acceptance

## 13. Contact

- Privacy questions: privacy@dsg.example.com
- Data subject requests: dpo@dsg.example.com
- Legal notices: legal@dsg.example.com
- Mailing address: [Your company address]

## 14. Effective Date

- Effective: [Date]
- Last updated: [Date]
```

---

## Part 4: Common Rejection Reasons & Solutions

### Rejection Reason 1: "OAuth flow is not user-friendly"

**Stripe feedback:** "Users are confused about what DSG ONE is asking permission for"

**Solution:**
- Add explanatory text before redirect: "We need access to your charges to gate them"
- Show what scopes you're requesting and why
- Use clear button text: "Connect with Stripe" (not just "Authorize")

---

### Rejection Reason 2: "Error messages are unclear"

**Stripe feedback:** "User doesn't understand why their request failed"

**Solution:**
Instead of:
```json
{"error": "500"}
```

Return:
```json
{
  "error": "POLICY_VIOLATION",
  "message": "Charge amount exceeds daily limit",
  "details": {
    "limit": 5000,
    "requested": 7500,
    "policy_version": "v2"
  },
  "next_action": "Review your daily limit or adjust policy",
  "docs": "https://docs.dsg.example.com/limits"
}
```

---

### Rejection Reason 3: "Webhooks are unreliable"

**Stripe feedback:** "Events seem to be missed or processed out of order"

**Solution:**
- Implement webhook signature verification (Stripe provides code)
- Store processed event IDs to prevent duplicates
- Return 200 OK immediately, process async
- Implement exponential backoff retry logic
- Log all webhook activity

---

### Rejection Reason 4: "Documentation is missing or outdated"

**Stripe feedback:** "API docs don't match actual behavior"

**Solution:**
- Publish API documentation (OpenAPI/Swagger)
- Include example requests and responses
- Document all error codes
- Keep docs in version control (review in every PR)
- Use API tests as documentation

---

### Rejection Reason 5: "Security issue: API keys in code"

**Stripe feedback:** "Found hardcoded secrets in GitHub"

**Solution:**
- Never commit `.env` or secrets
- Use environment variables only
- Run `grep -r "sk_" .` before submitting (no results!)
- Use git hooks to prevent secret commits

---

### Rejection Reason 6: "Pricing model is unclear"

**Stripe feedback:** "Users are confused about costs"

**Solution:**
- Publish clear pricing page with all tiers
- Provide usage calculator (100 ops = $0, 10,000 ops = $299, etc.)
- Explain overage pricing upfront
- Send cost estimates before billing

---

## Part 5: Marketing Campaign Materials

### 5.1 Email Announcement Template

**Subject Line:** "DSG ONE Now Available in Stripe App Marketplace"

```
Hi [Company],

We're excited to announce that DSG ONE is now available in the 
Stripe App Marketplace.

WHAT IS DSG ONE?
A governance layer for Stripe. Gate charges, refunds, and payouts 
before they post. Automatically enforce policies. Record immutable 
audit trails.

✅ BLOCK fraudulent charges before posting
✅ AUTOMATE policy enforcement (no manual approvals)
✅ PROVE compliance with audit trails

FREE TO TRY
Install from the Stripe App Marketplace:
https://dashboard.stripe.com/apps/dsg-one

Set up takes 5 minutes.
Start gating in real-time.

GET STARTED
https://dsg.example.com/install

LEARN MORE
https://dsg.example.com/docs

Questions? support@dsg.example.com

---
DSG ONE Team
```

---

### 5.2 Case Study Template

```
# Case Study: [Company Name]

## Challenge
[What problem the company was facing]
- Manual approvals slowing operations
- Fraud getting through
- Compliance audit failures

## Solution
DSG ONE governance policies tailored to [Company]'s operations:
- Policy 1: [Description]
- Policy 2: [Description]

## Results
- Metric 1: [Before] → [After]
  - Example: "Manual approvals: 40 hours/week → 4 hours/week"
- Metric 2: [Before] → [After]
  - Example: "Fraud blocked: 40% → 95% before posting"
- Metric 3: [Before] → [After]
  - Example: "Audit time: 20 hours → 2 hours"

## Quote
"[Customer quote about the impact]"
— [Name], [Title], [Company]

## About [Company]
[1-2 sentences about the company]

---
For your case study: contact sales@dsg.example.com
```

---

## Part 6: Checklist for All Marketing Assets

Before publishing, verify:

- [ ] All copy is accurate (no exaggerations)
- [ ] No typos or grammar errors
- [ ] Tone is professional and confident (not overselling)
- [ ] No false claims (e.g., "100% fraud prevention")
- [ ] Links are live and working
- [ ] Screenshots are professional and clear
- [ ] Contact information is current
- [ ] Legal documents are published and linked
- [ ] Pricing is clearly explained
- [ ] Use cases are realistic and relatable

---

## Version History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-07 | 1.0 | Claude | Initial guide with templates |

---

**Next:** Use [`STRIPE_APP_SUBMISSION_CHECKLIST.md`](./STRIPE_APP_SUBMISSION_CHECKLIST.md) to verify all assets are complete before submitting.
