# Phase 9: Company Information & Category Selection Template

**Status:** Template for Stripe Dashboard company profile  
**Product:** DSG Governance Gate  
**Purpose:** Prepare company information to fill in Stripe Dashboard  
**Required for:** App marketplace listing and business verification

---

## How to Use This Template

1. **Fill in each section** with your company's actual information
2. **Copy text** directly into Stripe Dashboard fields
3. **Review for accuracy** before pasting (no typos, verify spellings)
4. **Never include** API keys, secrets, or sensitive credentials
5. **Save responses** for future reference and compliance

---

## SECTION 1: Company Identity

### Legal Company Name

**Stripe Field:** Settings → Business Profile → Legal Company Name

**Description:** Official registered business name (as appears on business license, tax documents)

**Template:**
```
Legal Company Name: _________________________________________
```

**Examples:**
- DSG One, Inc.
- ProofGate AI, LLC
- Governance Systems Inc.

**Verification:**
- [ ] Matches business registration documents
- [ ] Matches tax identification records
- [ ] Matches bank account registration
- [ ] No misspellings or abbreviations
- [ ] Confirmed with legal/admin team

**Field Answer:**
```
COMPANY_NAME: [YOUR_LEGAL_COMPANY_NAME]
```

---

### Company Website

**Stripe Field:** Settings → Business Profile → Website URL

**Description:** Public-facing company website (HTTPS required)

**Template:**
```
Website URL: https://___________________________________
```

**Requirements:**
- [ ] Must be HTTPS (not HTTP)
- [ ] Domain must be registered to company
- [ ] Website must be live and accessible
- [ ] Must show company branding and information
- [ ] Must include company logo
- [ ] Must include team information (or "About Us" page)
- [ ] Must include contact information
- [ ] No placeholder/under-construction pages
- [ ] Mobile responsive
- [ ] Fast loading time (<3 seconds)

**Examples:**
- https://dsg.pics (if registered)
- https://governance-gate.io
- https://proofgate-ai.com

**Verification:**
- [ ] Website is live and accessible
- [ ] Test in browser (Chrome, Firefox, Safari)
- [ ] Test on mobile device
- [ ] No 404 errors
- [ ] Company info clearly visible
- [ ] Contact information present
- [ ] Professional appearance
- [ ] Stripe can access without VPN/authentication

**Field Answer:**
```
WEBSITE_URL: https://[YOUR_DOMAIN]
```

---

### Company Address

**Stripe Field:** Settings → Business Profile → Business Address

**Description:** Legal business address (where company is registered/headquartered)

**Template:**
```
Street Address: _____________________________________________
City: ____________________________ State/Province: __________
Postal Code: _________________ Country: ____________________
```

**Requirements:**
- [ ] Must be valid physical address (no PO boxes)
- [ ] Must match business registration documents
- [ ] Must match tax identification documents
- [ ] Street address must include building/suite number if applicable
- [ ] City, state/province, postal code must be valid
- [ ] Country must be in ISO 3166-1 format

**Examples:**
```
Street Address: 123 Main Street, Suite 100
City: San Francisco
State/Province: CA
Postal Code: 94105
Country: United States
```

**Verification:**
- [ ] Address matches business registration
- [ ] Address verifiable via Google Maps
- [ ] Address is not PO Box
- [ ] Address can receive mail
- [ ] Stripe can verify address if needed
- [ ] No typos in city name or postal code

**Field Answer:**
```
STREET_ADDRESS: [YOUR_STREET_ADDRESS]
CITY: [YOUR_CITY]
STATE_PROVINCE: [YOUR_STATE/PROVINCE]
POSTAL_CODE: [YOUR_POSTAL_CODE]
COUNTRY: [YOUR_COUNTRY]
```

---

## SECTION 2: Contact Information

### Support Email

**Stripe Field:** App Listing → Support Contact → Support Email

**Description:** Dedicated support email for marketplace customers

**Template:**
```
Support Email: support@______________________________
```

**Requirements:**
- [ ] Must be monitored and actively managed
- [ ] Must respond within 24 hours (urgent issues)
- [ ] Must respond within 48 hours (general inquiries)
- [ ] Should not be personal email (use support@company.com)
- [ ] Should have multiple team members with access
- [ ] Should have escalation path to engineering/product
- [ ] Must be able to handle customer issues and feature requests

**Examples:**
```
support@dsg.pics
support@governance-gate.io
app-support@yourcompany.com
```

**Verification:**
- [ ] Email address is active
- [ ] Can receive external mail
- [ ] Monitored by support team
- [ ] Forwarding rules in place if needed
- [ ] Response template/process documented

**Field Answer:**
```
SUPPORT_EMAIL: support@[YOUR_DOMAIN]
```

---

### Support Phone Number

**Stripe Field:** App Listing → Support Contact → Support Phone (Optional)

**Description:** Phone number for urgent customer support

**Template:**
```
Support Phone: +[COUNTRY_CODE] [AREA_CODE] [NUMBER]
```

**Requirements:**
- [ ] Must be active and monitored during business hours
- [ ] Should have voicemail/call routing
- [ ] Should have escalation path
- [ ] International format recommended (with country code)
- [ ] Optional but recommended

**Examples:**
```
+1 (415) 555-0100
+44 (20) 7946 0958
+1-800-SUPPORT
```

**Verification:**
- [ ] Phone number is active
- [ ] Number is not personal
- [ ] Has business voicemail
- [ ] Routing to support team is configured

**Field Answer:**
```
SUPPORT_PHONE: +[COUNTRY_CODE] [YOUR_PHONE_NUMBER]
```

---

### Support Website / Help Center

**Stripe Field:** App Listing → Support Contact → Support URL

**Description:** Public support page or help center URL

**Template:**
```
Support URL: https://____________________________/support
```

**Requirements:**
- [ ] Must be HTTPS
- [ ] Must include FAQ section
- [ ] Must include documentation links
- [ ] Must include contact form or support ticket system
- [ ] Must include status page or incident history
- [ ] Should have search functionality
- [ ] Should be easy to navigate

**Examples:**
```
https://dsg.pics/support
https://governance-gate.io/help
https://yourcompany.com/customer-support
https://help.yourproduct.io
```

**Content Checklist for Support Page:**
- [ ] Contact form (for non-urgent inquiries)
- [ ] FAQ (most common issues and solutions)
- [ ] Documentation links
- [ ] Status page (system health, incidents)
- [ ] Ticket tracking/progress (if applicable)
- [ ] Response time commitments (SLA)
- [ ] Known issues list
- [ ] Feature request form
- [ ] Bug report form
- [ ] Escalation contacts

**Verification:**
- [ ] URL is live and accessible
- [ ] Page loads quickly
- [ ] Mobile responsive
- [ ] Contains helpful information
- [ ] Contact methods work
- [ ] Stripe can access and verify

**Field Answer:**
```
SUPPORT_URL: https://[YOUR_DOMAIN]/support
```

---

### Legal Contact Email

**Stripe Field:** Settings → Business Profile → Legal Contact

**Description:** Email for legal/compliance inquiries

**Template:**
```
Legal Contact Email: legal@______________________________
```

**Requirements:**
- [ ] Must be monitored by legal or compliance team
- [ ] Should not be same as support email (separate escalation path)
- [ ] Used for DPA signatures, legal agreements, data subject requests
- [ ] Must be able to respond to legal inquiries within 5-7 days

**Examples:**
```
legal@yourcompany.com
compliance@yourcompany.com
dpa-agreements@yourcompany.com
```

**Verification:**
- [ ] Email is monitored
- [ ] Has routing to legal team
- [ ] Different from support email

**Field Answer:**
```
LEGAL_CONTACT_EMAIL: legal@[YOUR_DOMAIN]
```

---

## SECTION 3: Product Description

### Short App Description (140 characters max)

**Stripe Field:** App Listing → Short Description

**Description:** Concise tagline describing the app (appears in marketplace listing preview)

**Template:**
```
[Short Description - max 140 characters]
```

**Requirements:**
- [ ] Maximum 140 characters (including spaces)
- [ ] Should highlight core value proposition
- [ ] Should be action-oriented
- [ ] Should avoid jargon where possible
- [ ] Should NOT include trademark symbols or URLs
- [ ] Should be memorable and professional

**Writing Guidelines:**
- Start with action verb (Gate, Automate, Govern, etc.)
- Include key benefit (real-time, immutable, compliance-ready)
- Keep it specific to the product

**Options (choose one or adapt):**

**Option A (Risk-focused):**
```
"Gate AI operations in Stripe. Real-time policy gating, immutable audit trails."
```
**Character count:** 76 characters ✓

**Option B (Compliance-focused):**
```
"Govern Stripe operations with real-time policies. Immutable audit trails for compliance."
```
**Character count:** 88 characters ✓

**Option C (Governance-focused):**
```
"Real-time governance gate for Stripe operations. Policies, decisions, immutable proof."
```
**Character count:** 85 characters ✓

**Option D (Security-focused):**
```
"Gate Stripe charges, payouts, refunds. Policies before execution. Immutable audit trail."
```
**Character count:** 87 characters ✓

**Verification:**
- [ ] Character count ≤ 140
- [ ] No spelling errors
- [ ] Professional tone
- [ ] Clearly explains what app does
- [ ] Differentiates from competitors

**Field Answer:**
```
SHORT_DESCRIPTION: [SELECT_OPTION_OR_CUSTOM]
Character count: ___ / 140
```

---

### Long App Description (4,000 characters max)

**Stripe Field:** App Listing → Long Description

**Description:** Detailed explanation of app features, benefits, and use cases

**Template Instructions:**
1. Copy the template below
2. Replace [PLACEHOLDERS] with your information
3. Verify character count ≤ 4,000
4. Ensure markdown formatting is correct
5. No markdown rendering issues

**Template:**

```markdown
## Gate AI Operations in Stripe

[Your Company Name] Governance Gate is a real-time governance system for Stripe 
payment operations. Gate charges, payouts, and refunds before execution with 
real-time policies, and record immutable audit trails for compliance.

### Key Features

**Real-Time Policy Gating**
Define policies in minutes. Gate charges by amount, customer, region, or custom rules. 
Decisions appear instantly: Allow, Review, or Block.

**Immutable Audit Trails**
Every operation is logged immutably with timestamp, decision, reason, and policy version. 
Perfect for regulatory audits (PCI DSS, SOC 2, GDPR compliance).

**Multi-Operation Support**
Gate Stripe charges, payouts, refunds, and customer operations. Protect your entire 
payment flow end-to-end.

**Deterministic Proof System**
Policies are versioned and hashed for proof of compliance. Decisions include evidence 
of why each operation was gated.

### Who Should Use This?

- **E-commerce businesses** protecting high-value orders from fraud
- **Payment processors** governing merchant payouts
- **Financial SaaS** companies requiring compliance-ready audit trails
- **Enterprise teams** needing multi-level approval workflows

### Getting Started

1. Connect your Stripe account via OAuth
2. Create your first policy (2 minutes)
3. Gate your first operation (instant)
4. Review audit trail in dashboard

### Pricing

[INSERT YOUR PRICING STRUCTURE]

Examples:
- Freemium: First 100 operations/month free, then $99/month
- Per-Operation: $0.01 per gated operation
- Enterprise: Custom pricing for 10K+ operations/month

### Support

Questions? Contact us at support@[YOUR_DOMAIN] or visit [YOUR_SUPPORT_URL]

### Documentation

Full API documentation, code examples, and integration guides available at [YOUR_DOCS_URL]

---

Learn more at [YOUR_WEBSITE_URL]
```

**Content Customization Checklist:**
- [ ] Replace [Your Company Name] with actual name
- [ ] Replace [INSERT YOUR PRICING STRUCTURE] with actual pricing
- [ ] Replace [YOUR_DOMAIN] with your domain
- [ ] Replace [YOUR_SUPPORT_URL] with actual support page
- [ ] Replace [YOUR_DOCS_URL] with actual documentation URL
- [ ] Replace [YOUR_WEBSITE_URL] with your website

**Verification:**
- [ ] Character count ≤ 4,000
- [ ] No spelling errors
- [ ] Markdown renders correctly
- [ ] All URLs are HTTPS and live
- [ ] All contact information accurate
- [ ] Professional tone and formatting
- [ ] Clear value proposition
- [ ] Differentiates from competitors
- [ ] No marketing hype or unverifiable claims

**Field Answer:**
```
LONG_DESCRIPTION: [COPY_TEMPLATE_ABOVE_WITH_CUSTOMIZATIONS]
Character count: ___ / 4000
```

---

## SECTION 4: Category & Subcategory Selection

**Stripe Field:** App Listing → Category

**Description:** Marketplace categories help customers discover your app

### Primary Category Selection

**Options Available in Stripe:**
1. Risk Management
2. Compliance & Security
3. Fraud Detection
4. Payments & Billing
5. Reporting & Analytics
6. Data Integration
7. Accounting
8. Other

**Recommendation for DSG Governance Gate:**
```
PRIMARY CATEGORY: Risk Management
RATIONALE: Core function is governing payment operations to manage risk
```

**Alternative Option:**
```
PRIMARY CATEGORY: Compliance & Security
RATIONALE: Emphasizes audit trail and compliance-ready feature
```

**Selection Worksheet:**

| Category | Match Score | Rationale |
|----------|-------------|-----------|
| Risk Management | **9/10** | Primary function gates risky operations |
| Compliance & Security | **8/10** | Audit trails enable compliance |
| Fraud Detection | **7/10** | Can detect unusual patterns |
| Payments & Billing | **6/10** | Operates on Stripe payment operations |
| Reporting & Analytics | **5/10** | Provides audit reports/analytics |

**Final Selection:**
```
PRIMARY_CATEGORY: Risk Management
```

---

### Subcategory Selection (if available)

**Stripe Options (if subcategories exist):**
- Fraud Detection
- Policy Automation
- Operational Risk
- Compliance Management

**Recommendation:**
```
SUBCATEGORY: Policy Automation
RATIONALE: Emphasizes automated policy-based gating
```

**Alternative:**
```
SUBCATEGORY: Fraud Detection
RATIONALE: Prevents fraudulent operations from executing
```

**Final Selection:**
```
SUBCATEGORY: Policy Automation
```

---

## SECTION 5: Compliance & Certifications

### Current Certifications & Compliance Status

**Stripe Field:** App Listing → Compliance / Certifications

**Important:** Only claim certifications that are currently valid with documented proof.

**Template:**

| Certification | Status | Valid Until | Evidence Location |
|---------------|--------|-------------|-------------------|
| SOC 2 Type II | [ ] Certified [ ] In Progress [ ] None | _________ | _________________ |
| ISO 27001 | [ ] Certified [ ] In Progress [ ] None | _________ | _________________ |
| PCI DSS | [ ] Certified [ ] In Progress [ ] None | _________ | _________________ |
| GDPR Compliant | [ ] Yes [ ] Partial [ ] Planning | N/A | _________________ |
| HIPAA Ready | [ ] Yes [ ] In Progress [ ] No | N/A | _________________ |

**Instructions:**
- [ ] Mark current certifications only (not planned)
- [ ] Include valid certification dates
- [ ] Provide evidence location (report URL, audit firm)
- [ ] Never claim certification without proof
- [ ] Mark "In Progress" if audit is underway (include expected completion date)

**Examples:**

**Example 1 - Established Company:**
```
- SOC 2 Type II Certified (TrustArc, 2025-06-30)
- ISO 27001 Certified (Bureau Veritas, 2025-12-31)
- GDPR Compliant (Privacy Impact Assessment completed 2026-01-15)
```

**Example 2 - Startup / In Progress:**
```
- GDPR Compliant (Privacy Policy and Data Processing Agreements in place)
- SOC 2 Type II audit in progress (expected certification 2026-08-31)
- PCI DSS Compliance: not applicable (no cardholder data storage)
```

**Example 3 - Minimal Compliance:**
```
- GDPR Compliant (Privacy Policy published, DPA available)
- SOC 2 Type II: In planning phase (planned for 2026 Q3)
- Security audits conducted by [THIRD_PARTY_FIRM] (reports available)
```

**Verification Checklist:**
- [ ] All claimed certifications have valid expiration dates
- [ ] Certification documents are available (can be shared with Stripe if requested)
- [ ] No exaggerated claims (avoid "certified for compliance" - certify specific standards)
- [ ] "In Progress" marked clearly with expected dates
- [ ] Evidence can be provided within 5 business days if Stripe requests

**Field Answer:**
```
CERTIFICATIONS: [SELECT_EXAMPLE_ABOVE_OR_CUSTOM]

Provide evidence:
1. SOC 2 Report: [URL or "Not yet certified"]
2. ISO 27001: [URL or "Not yet certified"]
3. Privacy Policy: [HTTPS_URL]
4. DPA: [HTTPS_URL]
```

---

## SECTION 6: Business Model & Pricing

### Pricing Model

**Stripe Field:** App Listing → Pricing

**Description:** How you plan to charge customers using your app

**Options:**

**A. Freemium Model**
```
Free Tier: 100 operations/month
Paid Tier: $99/month (unlimited operations)
Justification: Allows users to test before paying
```

**B. Per-Operation Model**
```
Price: $0.01-$0.10 per gated operation
Justification: Fair pricing, usage-based, scales with customer volume
```

**C. Per-Agent/Connection Model**
```
Price: $10-$50/month per connected agent
Justification: Reasonable SaaS subscription, accounts for support burden
```

**D. Per-Organization Model**
```
Price: $500-$5,000/month flat rate
Justification: Enterprise pricing, supports implementation/onboarding
```

**E. Revenue Share Model**
```
Price: 15% of Stripe processing volume or savings
Justification: Aligned incentives, customer only pays if they benefit
```

**Template - Select One:**

```
PRICING_MODEL: [SELECT_MODEL_A_THROUGH_E]

Description: [EXPLAIN_YOUR_PRICING_IN_2-3_SENTENCES]

Examples / Pricing Tiers:
- Tier 1: [DESCRIPTION] @ [PRICE]
- Tier 2: [DESCRIPTION] @ [PRICE]
- Tier 3: [DESCRIPTION] @ [PRICE] (Optional)

Trial Period: [FREE_TRIAL_DURATION_IF_APPLICABLE]
Currency: USD (or [YOUR_CURRENCY])
```

**Verification:**
- [ ] Pricing model is clearly explained
- [ ] Pricing is competitive (research similar apps)
- [ ] Pricing aligns with customer value proposition
- [ ] Payment terms are clear (monthly, per-use, annual)
- [ ] Trial period mentioned (if applicable)
- [ ] Currency specified
- [ ] Pricing sustainable (covers infrastructure + support)

**Field Answer:**
```
PRICING_MODEL: [YOUR_SELECTED_MODEL]
PRICING_DESCRIPTION: [YOUR_PRICING_DETAILS]
```

---

## FINAL COMPANY INFO CHECKLIST

Before submitting to Stripe Dashboard:

**Identity & Contact:**
- [ ] Legal company name confirmed
- [ ] Website URL live and verified
- [ ] Physical address confirmed
- [ ] Support email active and monitored
- [ ] Legal contact email configured
- [ ] Support phone number (optional) provided

**Descriptions:**
- [ ] Short description ≤ 140 characters
- [ ] Long description ≤ 4,000 characters
- [ ] Both descriptions are accurate and professional
- [ ] All URLs in descriptions are HTTPS and live
- [ ] No spelling errors or typos

**Categories:**
- [ ] Primary category selected
- [ ] Subcategory selected (if available)
- [ ] Categories accurately reflect app purpose

**Compliance:**
- [ ] Only valid certifications claimed
- [ ] Certification dates verified
- [ ] Evidence available (if requested by Stripe)
- [ ] DPA and Privacy Policy links working

**Pricing:**
- [ ] Pricing model selected
- [ ] Pricing is clearly described
- [ ] Pricing is competitive and sustainable
- [ ] Trial period mentioned (if applicable)

**Quality Assurance:**
- [ ] All information reviewed for accuracy
- [ ] All contact information verified active
- [ ] Legal team approved all legal/compliance claims
- [ ] Marketing team approved all descriptions
- [ ] Executive team approved pricing model

---

## Ready to Submit to Stripe?

When all items above are checked:

1. Log into **Stripe Dashboard**
2. Go to **Apps & Integrations** → **Develop an App**
3. Click your app → **App Details** → **Listing** tab
4. Fill in all fields with information from this template
5. Upload images (from PHASE9_ASSETS_CHECKLIST.md)
6. Review all information one final time
7. Click **Submit for Review**

---

**Document Created:** 2026-06-07  
**Next Step:** Use PHASE9_SUBMISSION_FORM.md to track overall submission progress
