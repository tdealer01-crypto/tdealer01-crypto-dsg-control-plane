# Phase 9: Stripe App Marketplace Submission Checklist

**Status:** Preparation Guide for Stripe Dashboard Submission
**Duration:** 2 weeks prep → 2-4 weeks Stripe review → 1 week post-approval setup
**Owner:** Product & Marketing Team
**Target Launch Date:** Week of [INSERT DATE]

---

## Overview

This checklist guides you through preparing DSG Governance Gate for Stripe App Marketplace submission. Stripe's review process typically takes **2-4 weeks**. All items below must be completed BEFORE clicking "Submit for Review" in Stripe Dashboard.

**Important:** You cannot complete this checklist programmatically. Each item requires manual action in Stripe Dashboard or external preparation. However, all supporting documentation, templates, and assets are prepared in this Phase 9 delivery.

---

## Pre-Submission Timeline

```
Week 1 (Days 1-7):     Prepare & Review Checklist (complete items 1-25)
Week 2 (Days 8-14):    Finalize Marketing & Assets (complete items 26-50)
Submission (Day 15):   Submit to Stripe → Approval begins
Weeks 3-6:             Stripe review cycle (2-4 weeks typical)
Post-Approval (Day 43+): Launch & monitoring
```

---

## SECTION A: App Identity & Legal (Items 1-10)

These form the foundation of your Stripe Dashboard listing.

### 1. App Name & Category
- [ ] **Action:** Log into Stripe Dashboard → **Apps & Integrations** → **Develop an App** → **Create App**
- [ ] **Input:** App name = "DSG Governance Gate" (or your branded variant)
- [ ] **Input:** Category = "Risk Management" or "Compliance & Security"
- [ ] **Input:** Subcategory = "Fraud Detection" or "Policy Automation"
- [ ] **Reference:** See `PHASE9_MARKETING/app-positioning.txt`
- [ ] **Verification:** Confirm slug is SEO-friendly (e.g., `dsg-governance-gate`)

### 2. Company/Partner Profile
- [ ] **Action:** Verify company profile in Stripe Dashboard → **Settings** → **Business Profile**
- [ ] **Input:** Legal company name, address, phone, email
- [ ] **Input:** Stripe account (live, not test mode)
- [ ] **Input:** Tax ID if required in your region
- [ ] **Reference:** See `CLAUDE.md` — secrets policy (do not paste API keys here)
- [ ] **Verification:** Stripe confirms profile matches application

### 3. App Description (Short)
- [ ] **Action:** Stripe Dashboard → App Listing → **Short Description** (max 140 characters)
- [ ] **Input:** Draft = "Gate AI operations in Stripe. Real-time policy gating, immutable audit trails."
- [ ] **Reference:** `PHASE9_MARKETING/app-descriptions.md` (short version)
- [ ] **Verification:** Character count ≤ 140

### 4. App Description (Long)
- [ ] **Action:** Stripe Dashboard → App Listing → **Long Description** (max 4,000 characters)
- [ ] **Input:** Use template from `PHASE9_MARKETING/app-descriptions.md` (long version)
- [ ] **Customization Points:**
  - [ ] Insert your live product URL
  - [ ] Add Stripe app marketplace URL once assigned
  - [ ] Include pricing model (freemium, per-operation, per-agent)
- [ ] **Reference:** See complete template with multiple variants
- [ ] **Verification:** Markdown renders correctly in Stripe Dashboard preview

### 5. Privacy Policy
- [ ] **Action:** Stripe Dashboard → App Listing → **Privacy Policy URL**
- [ ] **Input:** Full public URL to your privacy policy
- [ ] **Requirements:**
  - [ ] Explicitly state data types processed (API keys, request payloads, operation metadata)
  - [ ] Explain retention policy (typically 12 months for audit)
  - [ ] Mention GDPR/CCPA compliance if in scope
  - [ ] Include contact email for privacy inquiries
- [ ] **Reference:** Template at `PHASE9_MARKETING/legal/privacy-policy-template.md`
- [ ] **Verification:** Privacy policy is publicly accessible via HTTPS

### 6. Terms of Service
- [ ] **Action:** Stripe Dashboard → App Listing → **Terms of Service URL**
- [ ] **Input:** Full public URL to your terms
- [ ] **Requirements:**
  - [ ] Acceptable use (no malware, fraud, illegal activity)
  - [ ] Limitation of liability
  - [ ] Indemnification clause
  - [ ] Termination rights
  - [ ] Data processing agreement reference
- [ ] **Reference:** Template at `PHASE9_MARKETING/legal/terms-of-service-template.md`
- [ ] **Verification:** ToS is publicly accessible via HTTPS

### 7. Data Processing Agreement (DPA)
- [ ] **Action:** Prepare DPA document (use template)
- [ ] **Requirements:**
  - [ ] GDPR Article 28 compliance (if EU customers)
  - [ ] Data processing terms, sub-processors, retention
  - [ ] Customer rights and audit clauses
  - [ ] Contact details for data subject requests
- [ ] **Reference:** `PHASE9_MARKETING/legal/dpa-template.md`
- [ ] **Availability:** Make available via link in ToS or on website
- [ ] **Verification:** Legal review completed (internal or external counsel)

### 8. Support Email & Contact
- [ ] **Action:** Stripe Dashboard → App Listing → **Support Contact**
- [ ] **Input:** Dedicated support email (e.g., `support@yourcompany.com`)
- [ ] **Input:** Support page URL (e.g., `https://yourcompany.com/support`)
- [ ] **Requirements:**
  - [ ] Response time commitment (recommend ≤24 hours for urgent issues)
  - [ ] Escalation path to technical team
  - [ ] Known issue tracker or status page
- [ ] **Reference:** `PHASE9_SUPPORT_PLAYBOOK.md` (support response times section)
- [ ] **Verification:** Email is monitored and responds within SLA

### 9. Company Website & Blog
- [ ] **Action:** Stripe Dashboard → **Company Profile** → **Website**
- [ ] **Input:** Public company website URL
- [ ] **Requirements:**
  - [ ] Company information, team, product vision
  - [ ] Blog or announcements section (for post-approval communication)
  - [ ] Case studies section (prepare 3-5 use cases)
- [ ] **Reference:** See `PHASE9_MARKETING/website-requirements.md`
- [ ] **Verification:** Website is production-ready (SSL, mobile responsive, no 404s)

### 10. Compliance & Certifications
- [ ] **Action:** Document existing certifications or compliance posture
- [ ] **Input:** Optional certifications (e.g., SOC 2, ISO 27001, PCI DSS in progress)
- [ ] **Input:** Regulatory alignment (e.g., GDPR, HIPAA if applicable)
- [ ] **Reference:** See `docs/RUNBOOK_DEPLOY.md` for production readiness standards
- [ ] **Verification:** Only claim certifications that are currently valid with proof

---

## SECTION B: Visual Assets & Branding (Items 11-20)

These appear in the marketplace listing and improve discoverability.

### 11. App Icon (Primary)
- [ ] **Action:** Stripe Dashboard → App Listing → **Icon** (1200×1200px PNG)
- [ ] **Requirements:**
  - [ ] Square format with minimum safe area padding
  - [ ] Transparent background (PNG RGBA)
  - [ ] File size < 1 MB
  - [ ] Recognizable at 100×100px (scaled down in listings)
  - [ ] High contrast, no text inside icon
- [ ] **Reference:** See `PHASE9_MARKETING/app-icon-requirements.md`
- [ ] **Asset Location:** Prepare in `PHASE9_MARKETING/assets/app-icon.png`
- [ ] **Verification:** Icon renders clearly at multiple sizes

### 12. App Icon (Favicon)
- [ ] **Action:** Prepare favicon for website
- [ ] **Requirements:**
  - [ ] 32×32px PNG or ICO format
  - [ ] Same design as primary icon (simplified if needed)
- [ ] **Asset Location:** `PHASE9_MARKETING/assets/favicon.ico`
- [ ] **Verification:** Displays correctly in browser tab

### 13. Hero Image / Feature Graphic
- [ ] **Action:** Stripe Dashboard → App Listing → **Hero Image** (2048×900px or 1920×1080px)
- [ ] **Requirements:**
  - [ ] High-quality product screenshot or lifestyle image
  - [ ] Shows primary use case in action
  - [ ] Text overlay (optional): "Gate AI Operations in Stripe"
  - [ ] File size < 2 MB
- [ ] **Asset Location:** `PHASE9_MARKETING/assets/hero-image.png`
- [ ] **Reference:** See `PHASE9_MARKETING/marketing-asset-guide.md`
- [ ] **Verification:** Looks professional on desktop and mobile

### 14-16. Product Screenshots (3 minimum, up to 5)
- [ ] **Screenshot 1:** Dashboard overview (governance policy configuration)
  - [ ] Show policy editor with threshold settings
  - [ ] Include example policy (e.g., "Block charges > $5,000")
  - [ ] Add caption: "Real-time policy configuration"
  - [ ] Dimensions: 1280×720px or larger
  
- [ ] **Screenshot 2:** Operation gating in action
  - [ ] Show a Stripe charge request being evaluated
  - [ ] Display decision result (ALLOW / REVIEW / BLOCK)
  - [ ] Show reason/evidence
  - [ ] Add caption: "Gate every Stripe operation before execution"
  - [ ] Dimensions: 1280×720px or larger
  
- [ ] **Screenshot 3:** Audit trail / Evidence trail
  - [ ] Show execution history with immutable timestamps
  - [ ] Display decision reasoning and policy version
  - [ ] Highlight compliance-ready audit fields
  - [ ] Add caption: "Immutable audit trail for regulatory compliance"
  - [ ] Dimensions: 1280×720px or larger

- [ ] **Asset Locations:** 
  - [ ] `PHASE9_MARKETING/assets/screenshot-1-dashboard.png`
  - [ ] `PHASE9_MARKETING/assets/screenshot-2-gating.png`
  - [ ] `PHASE9_MARKETING/assets/screenshot-3-audit.png`

- [ ] **Optional Screenshots 4-5:**
  - [ ] Screenshot 4: Integration setup (API + webhook configuration)
  - [ ] Screenshot 5: Customer success case study (real/sanitized example)
  - [ ] Asset Locations: `PHASE9_MARKETING/assets/screenshot-4-*.png`, `screenshot-5-*.png`

### 17. Social Media Card
- [ ] **Action:** Prepare Open Graph / Twitter card image
- [ ] **Requirements:**
  - [ ] 1200×630px PNG
  - [ ] Includes app logo, name, and value prop
  - [ ] Uses consistent brand colors
- [ ] **Asset Location:** `PHASE9_MARKETING/assets/og-card.png`
- [ ] **Use Case:** When marketplace link is shared on Twitter, LinkedIn, etc.
- [ ] **Verification:** Renders correctly in social media preview

### 18. Brand Colors & Logo Usage Guide
- [ ] **Action:** Document brand guidelines for Stripe review
- [ ] **Contents:**
  - [ ] Primary, secondary colors (HEX codes)
  - [ ] Logo usage (lockup, min size, clear space)
  - [ ] Typography (fonts, sizes)
  - [ ] Tone & voice guidelines
- [ ] **Reference:** `PHASE9_MARKETING/brand-guidelines.md`
- [ ] **Verification:** All marketing materials follow guidelines

### 19. Video / Demo Asset (Optional but recommended)
- [ ] **Action:** Create 30-60 second product demo video
- [ ] **Requirements:**
  - [ ] MP4, WebM, or YouTube link
  - [ ] Shows: open dashboard → create policy → execute operation → view audit trail
  - [ ] Professional audio (background music + voiceover or captions)
  - [ ] Captions/subtitles (accessibility)
  - [ ] File size < 50 MB or hosted on YouTube/Vimeo
- [ ] **Asset Location:** `PHASE9_MARKETING/assets/product-demo.mp4` or YouTube link
- [ ] **Script Reference:** `PHASE9_MARKETING/demo-video-script.md` (90 second version, can be trimmed)
- [ ] **Verification:** Video plays without errors, captions are synchronized

### 20. Documentation Assets in Marketplace
- [ ] **Action:** Stripe Dashboard → App Listing → **Documentation** link
- [ ] **Input:** Public URL to your developer documentation
- [ ] **Requirements:**
  - [ ] Quick start guide (5 minutes)
  - [ ] API reference (all endpoints documented)
  - [ ] Integration examples (code snippets)
  - [ ] FAQ / Troubleshooting section
- [ ] **Reference:** See `PHASE9_MARKETING/developer-documentation-template.md`
- [ ] **Verification:** Documentation is complete and up-to-date

---

## SECTION C: Permissions & API Scope (Items 21-25)

Stripe requires explicit declaration of what your app accesses and why.

### 21. API Scopes Required
- [ ] **Action:** Stripe Dashboard → App Details → **Permissions** → **API Scopes**
- [ ] **Scopes Required (declare these explicitly):**
  - [ ] `read_write` on **Charges** (gate charges before execution)
  - [ ] `read_write` on **Payouts** (gate payouts before execution)
  - [ ] `read_write` on **Refunds** (gate refunds before execution)
  - [ ] `read` on **Customers** (optional, for customer context)
  - [ ] `read` on **API Keys** (optional, for audit)
  - [ ] `read_write` on **Webhooks** (required, for operation event handling)
  - [ ] `read` on **Events** (recommended, for audit trail)
  - [ ] `read` on **Accounts** (for account metadata)

- [ ] **Justification for each scope (required by Stripe review):**
  - [ ] **Charges:** "Gate payment processing before Stripe execution; apply real-time policies"
  - [ ] **Payouts:** "Gate merchant payouts; prevent unauthorized payout operations"
  - [ ] **Refunds:** "Gate refund operations; enforce refund policies"
  - [ ] **Webhooks:** "Listen for charge.created, charge.updated, charge.failed events"
  - [ ] **Events:** "Audit trail; immutable log of gating decisions"

- [ ] **Reference:** `PHASE9_MARKETING/api-scope-declaration.md`
- [ ] **Verification:** Only request scopes actually used in the app

### 22. Webhook Events Declared
- [ ] **Action:** Stripe Dashboard → App Details → **Webhook Subscriptions**
- [ ] **Events Required:**
  - [ ] `charge.created` (gate new charges)
  - [ ] `charge.updated` (gate charge modifications)
  - [ ] `charge.failed` (audit failed charges)
  - [ ] `charge.refunded` (audit refunds)
  - [ ] `payout.created` (gate new payouts)
  - [ ] `payout.updated` (gate payout modifications)
  - [ ] `refund.created` (gate refunds)
  - [ ] `account.updated` (audit account changes)

- [ ] **Webhook Endpoint URL:** `https://[YOUR_VERCEL_URL]/api/stripe-webhook`
- [ ] **Signing Secret:** Generate in Stripe Dashboard → **Webhooks** (store securely, never in docs)
- [ ] **Verification:** Webhook receiver is production-ready; follows security checklist (Section D)

### 23. Redirect URIs (OAuth)
- [ ] **Action:** Stripe Dashboard → App Details → **OAuth Settings** → **Redirect URIs**
- [ ] **Input:** Authorized redirect URIs:
  - [ ] `https://[YOUR_VERCEL_URL]/api/stripe-callback` (production)
  - [ ] `https://[YOUR_STAGING_URL]/api/stripe-callback` (staging, optional)
  - [ ] No `http://localhost` in production app config
- [ ] **Verification:** URIs are HTTPS, use verified domain

### 24. Sensitive Scopes (if applicable)
- [ ] **Check:** Does your app request restricted scopes?
  - [ ] `restricted_api_keys` scope (creating/revoking API keys)
  - [ ] `read` on **Billing Events** (if processing invoices)
  - [ ] Any other scopes marked "Restricted" in Stripe Dashboard

- [ ] **If YES:** Provide explicit business justification
  - [ ] Example: "Creating temporary, scoped API keys for agent execution verification"
  - [ ] Example: "Audit trail requires read access to billing events"
  - [ ] **Reference:** `PHASE9_MARKETING/restricted-scope-justification.md`

- [ ] **If NO:** Confirm app does not request restricted scopes in current submission

### 25. Security & Compliance Checklist (Pre-Submission)
- [ ] **Item:** API keys and secrets are never logged
  - [ ] Verification: `grep -r "STRIPE_SECRET\|STRIPE_API_KEY" --include="*.ts" --include="*.js" logs/ 2>/dev/null | wc -l` = 0
  - [ ] Reference: `CLAUDE.md` Section 9 (Secrets policy)

- [ ] **Item:** Webhook handler validates Stripe signature
  - [ ] Verification: Code in `app/api/stripe-webhook/route.ts` calls `stripe.webhooks.constructEvent()`
  - [ ] Reference: `packages/stripe-app/src/webhook-handler.ts`

- [ ] **Item:** Rate limiting is enforced on API routes
  - [ ] Verification: Routes use `@upstash/ratelimit` or similar
  - [ ] Reference: `lib/security/rate-limit.ts`

- [ ] **Item:** All API responses exclude sensitive data
  - [ ] Verification: Responses never include Stripe secret keys, customer PII (unless authorized), or API keys
  - [ ] Reference: `PHASE9_MARKETING/api-response-sanitization.md`

- [ ] **Item:** Logging contains no secrets
  - [ ] Verification: All logs are sanitized; sensitive fields are redacted
  - [ ] Reference: `lib/security/request-logging.ts`

---

## SECTION D: Security & Compliance Requirements (Items 26-35)

Stripe requires security best practices; these prevent rejection.

### 26. HTTPS Everywhere
- [ ] **Action:** Verify all endpoints use HTTPS (TLS 1.2+)
- [ ] **Verification:**
  ```bash
  curl -I https://[YOUR_VERCEL_URL]/api/health 2>&1 | grep -i "https\|HTTP/2"
  # Expected: HTTP/2 200 with TLS indicator
  ```
- [ ] **Production Domain:** Confirm SSL certificate is valid
  - [ ] Not self-signed
  - [ ] Not expired
  - [ ] Domain matches certificate CN or SAN
- [ ] **Reference:** Vercel auto-provisions SSL; no action needed if using Vercel domains

### 27. Security Headers
- [ ] **Action:** Verify security headers are present on all responses
- [ ] **Required Headers:**
  - [ ] `Content-Security-Policy` (prevents XSS)
  - [ ] `X-Content-Type-Options: nosniff` (MIME type safety)
  - [ ] `X-Frame-Options: DENY` (clickjacking prevention)
  - [ ] `Strict-Transport-Security` (HSTS, enforces HTTPS)
  - [ ] `Referrer-Policy: strict-origin-when-cross-origin` (privacy)

- [ ] **Verification:**
  ```bash
  curl -I https://[YOUR_VERCEL_URL]/api/health | grep -E "^(Content-Security|X-|Strict)"
  ```

- [ ] **Reference:** `next.config.js` includes security header middleware
- [ ] **Reference:** `lib/security/security-headers.ts` (if custom headers needed)

### 28. CORS Configuration
- [ ] **Action:** Verify CORS is properly scoped (not overly permissive)
- [ ] **Allowed Origins:**
  - [ ] Your company domain: `https://yourcompany.com`
  - [ ] Stripe Dashboard: `https://dashboard.stripe.com` (if applicable)
  - [ ] Never: `*` (wildcard origin)
  - [ ] Never: `http://` (non-HTTPS origins)

- [ ] **Verification:** Code review of CORS middleware
  - [ ] Reference: `lib/security/cors.ts`

- [ ] **Stripe Requirement:** CORS headers must not allow arbitrary origins

### 29. Rate Limiting & DDoS Protection
- [ ] **Action:** Verify rate limiting is enforced on all public API routes
- [ ] **Requirements:**
  - [ ] Webhook handler: rate limit by Stripe signature (prevents replay)
  - [ ] OAuth callback: rate limit by IP (prevents brute force)
  - [ ] API execute: rate limit by agent ID (prevents quota exhaustion)
  - [ ] Limits: recommend 100 req/min per IP, 1000 req/min per API key

- [ ] **Implementation:** Using `@upstash/ratelimit` or similar
- [ ] **Verification:** Test rate limit response
  ```bash
  for i in {1..101}; do curl -s https://[YOUR_VERCEL_URL]/api/stripe-callback; done | grep -c "429"
  # Expected: requests 101+ return 429 Too Many Requests
  ```

- [ ] **Reference:** `lib/security/rate-limit.ts`

### 30. Input Validation & Sanitization
- [ ] **Action:** Verify all user inputs are validated
- [ ] **Validation Checklist:**
  - [ ] Webhook payload signature verified (Stripe requirement)
  - [ ] JSON body size limits enforced (prevents memory exhaustion)
  - [ ] API parameters validated against schema
  - [ ] No command injection vectors
  - [ ] No SQL injection vectors (if using SQL)

- [ ] **Verification:** Code review of input handling
  - [ ] Reference: `lib/security/request-validation.ts`
  - [ ] Reference: `app/api/stripe-webhook/route.ts` (signature validation)

### 31. Audit Logging
- [ ] **Action:** Verify all security-relevant events are logged
- [ ] **Logged Events:**
  - [ ] App authorization (when merchant connects app)
  - [ ] Webhook delivery and processing
  - [ ] API errors (especially 4xx and 5xx)
  - [ ] Unusual patterns (rate limit hits, invalid signatures)
  - [ ] Admin actions (policy changes, etc.)

- [ ] **Audit Trail Requirements:**
  - [ ] Immutable logs (append-only)
  - [ ] Include timestamp, user/app ID, action, result
  - [ ] Retention: ≥12 months for compliance
  - [ ] Access control: restricted to authorized users

- [ ] **Verification:** Audit logs are stored in Supabase (not in application logs)
- [ ] **Reference:** `lib/runtime/audit-trail.ts`, `docs/RUNBOOK_DEPLOY.md`

### 32. Data Encryption
- [ ] **Action:** Verify sensitive data is encrypted in transit and at rest
- [ ] **In Transit:**
  - [ ] All HTTPS endpoints use TLS 1.2+
  - [ ] Webhook payloads signed by Stripe (verified by handler)

- [ ] **At Rest:**
  - [ ] Supabase database uses encryption (default in Supabase)
  - [ ] API keys stored in environment variables or Supabase secrets table (not plaintext logs)
  - [ ] Customer data (charges, payouts) encrypted if stored beyond normal log retention

- [ ] **Verification:** 
  - [ ] No unencrypted storage of sensitive data
  - [ ] Reference: `CLAUDE.md` Section 10 (Secrets policy)

### 33. Vulnerability Scanning & Dependency Management
- [ ] **Action:** Run vulnerability scan before submission
- [ ] **Scan Commands:**
  ```bash
  npm audit --audit-level=moderate
  npm audit fix --audit-level=moderate (if auto-fixable)
  ```

- [ ] **Result:** No known vulnerabilities at `moderate` or higher
  - [ ] If found: fix or document exception (add comment in package.json with reason)
  - [ ] Example: `"note": "express@4.x has CVE-123, patched by upstream version ~5.0, accepted risk until upgrade"`

- [ ] **Verification:** Audit report saved
  - [ ] Reference: `PHASE9_MARKETING/security-audit-report.txt` (template)

- [ ] **Dependency Updates:** Run `npm update` and test before submission
  - [ ] Run `npm run test` to ensure no breaking changes
  - [ ] Run `npm run build` to ensure Next.js build succeeds

### 34. Privacy & Data Handling
- [ ] **Action:** Document all data flows and retention policies
- [ ] **Data Collected:**
  - [ ] Stripe charge metadata (amount, currency, description)
  - [ ] Merchant account info (name, address, EIN)
  - [ ] Operation results (decision, policy version, timestamp)
  - [ ] Access logs (IP, user agent, timestamp)

- [ ] **Not Collected:**
  - [ ] Cardholder PAN (Primary Account Number) — Stripe handles this
  - [ ] CVV/CVC — Stripe handles this
  - [ ] Plaintext customer passwords

- [ ] **Retention Policy:**
  - [ ] Audit logs: ≥12 months
  - [ ] Access logs: ≥3 months (or per legal retention requirement)
  - [ ] Operational data: until merchant deletes or account closes

- [ ] **Reference:** `PHASE9_MARKETING/legal/privacy-policy-template.md`

### 35. GDPR / Data Subject Rights Compliance (if applicable)
- [ ] **Check:** Do you serve EU customers?
  - [ ] If YES, proceed with items below
  - [ ] If NO, document this decision

- [ ] **Data Subject Rights Implementation:**
  - [ ] Right to Access: API endpoint or manual process to retrieve user data
  - [ ] Right to Deletion (Right to be Forgotten): Process to delete stored data (except audit trail per GDPR Article 17(3))
  - [ ] Right to Rectification: Process to correct inaccurate data
  - [ ] Right to Restrict Processing: Mechanism to limit processing for certain operations
  - [ ] Data Portability: Export user data in standard format (CSV/JSON)

- [ ] **Designated Data Processing Agreement (DPA):**
  - [ ] Publish DPA at `https://yourcompany.com/dpa` or similar
  - [ ] Include Stripe's DPA (reference their standard agreement)
  - [ ] Include your Sub-processor list if applicable
  - [ ] Reference: `PHASE9_MARKETING/legal/dpa-template.md`

- [ ] **Privacy Notice for Stripe Merchants:**
  - [ ] Publish at product website
  - [ ] Explain what data you collect, why, how long retained
  - [ ] Include contact for data subject requests (privacy@yourcompany.com)
  - [ ] Reference: `PHASE9_MARKETING/legal/privacy-notice-template.md`

- [ ] **Data Processing Addendum Signature:**
  - [ ] Stripe may require your signature on their DPA amendment
  - [ ] Stripe will provide template; sign and return within SLA

---

## SECTION E: Functional Requirements & Testing (Items 36-45)

These prove your app actually works and is production-ready.

### 36. OAuth Integration Tested
- [ ] **Action:** Manually test full OAuth flow with a test Stripe account
- [ ] **Test Steps:**
  1. Click "Connect with Stripe" button on product page
  2. Redirected to Stripe OAuth consent page
  3. Click "Authorize" (or similar)
  4. Redirected back to your app with authorization code
  5. Your app exchanges code for access token (server-side)
  6. Webhook handler receives `account.updated` event from Stripe
  7. App stores merchant's Stripe account ID (for future API calls)
  8. User sees "Connected successfully" confirmation on dashboard

- [ ] **Verification:** Test app can read merchant's Stripe charges
  ```bash
  curl -H "Authorization: Bearer <your-test-token>" \
       https://[YOUR_VERCEL_URL]/api/execute \
       -d '{"action":"list_charges","limit":5}' \
       -H "Content-Type: application/json"
  # Expected: 200 OK with charge list
  ```

- [ ] **Reference:** `PHASE9_MARKETING/oauth-test-plan.md`

### 37. Webhook Handler Tested
- [ ] **Action:** Verify webhook handler processes Stripe events correctly
- [ ] **Test Steps:**
  1. Use Stripe CLI to forward webhook events to local/staging environment
  2. Trigger test event: `stripe trigger charge.created`
  3. Webhook handler receives event, validates signature
  4. Webhook handler processes event and stores in audit trail
  5. API returns 200 OK (webhook acknowledged)

- [ ] **Verification:**
  ```bash
  # Use Stripe CLI (requires `brew install stripe/stripe-cli/stripe`)
  stripe listen --forward-to https://[YOUR_VERCEL_URL]/api/stripe-webhook
  # In another terminal:
  stripe trigger charge.created
  # Expected: webhook handler processes event without errors
  ```

- [ ] **Events Tested:** All declared webhook events (Section C, Item 22)
- [ ] **Reference:** `PHASE9_MARKETING/webhook-test-plan.md`

### 38. Policy Gating Tested
- [ ] **Action:** Verify app gates Stripe operations before execution
- [ ] **Test Scenario 1 (Block):**
  - [ ] Create policy: "Block all charges > $5,000"
  - [ ] Attempt charge for $10,000
  - [ ] Expected result: decision = `BLOCK`, charge is not executed

- [ ] **Test Scenario 2 (Allow):**
  - [ ] Create policy: "Allow all charges < $1,000"
  - [ ] Attempt charge for $500
  - [ ] Expected result: decision = `ALLOW`, charge is executed

- [ ] **Test Scenario 3 (Review):**
  - [ ] Create policy: "Review charges $1,000-$5,000"
  - [ ] Attempt charge for $2,000
  - [ ] Expected result: decision = `REVIEW`, charge is queued pending approval

- [ ] **Reference:** `PHASE9_MARKETING/policy-gating-test-plan.md`

### 39. Audit Trail Verified
- [ ] **Action:** Verify all operations are logged immutably
- [ ] **Test Steps:**
  1. Execute an operation (charge, payout, refund)
  2. View execution in dashboard audit log
  3. Verify immutable fields are present:
     - [ ] Decision (ALLOW / REVIEW / BLOCK)
     - [ ] Policy version (hash)
     - [ ] Risk score (if applicable)
     - [ ] Evidence (metadata supporting decision)
     - [ ] Timestamp (ISO 8601)
     - [ ] User/Agent ID who executed operation

- [ ] **Immutability Verification:**
  - [ ] Audit logs cannot be modified after creation (database constraint)
  - [ ] Audit logs cannot be deleted except by database administrator
  - [ ] Audit trail includes who/when/why for each decision

- [ ] **Reference:** `PHASE9_MARKETING/audit-trail-test-plan.md`, `docs/RUNBOOK_DEPLOY.md`

### 40. Error Handling Tested
- [ ] **Action:** Verify app handles errors gracefully without exposing secrets
- [ ] **Test Error Scenarios:**
  - [ ] Invalid OAuth credentials → User sees friendly error message
  - [ ] Stripe API is down → App retries with exponential backoff
  - [ ] Invalid webhook signature → 401 Unauthorized (no details logged)
  - [ ] Rate limit exceeded → 429 Too Many Requests with Retry-After header
  - [ ] Database connection lost → 500 Service Unavailable (incident logged)

- [ ] **Verification:** Error responses never include:
  - [ ] Stripe secret keys
  - [ ] Database credentials
  - [ ] Stack traces (in production)
  - [ ] Internal IP addresses

- [ ] **Reference:** `PHASE9_MARKETING/error-handling-test-plan.md`, `lib/security/api-errors.ts`

### 41. Performance & Load Testing
- [ ] **Action:** Verify app can handle expected load
- [ ] **Load Targets:**
  - [ ] Webhook handler: ≥100 events/second
  - [ ] Policy evaluation: ≥1,000 ops/second
  - [ ] Dashboard: ≥50 concurrent users
  - [ ] Latency: <500ms p99 for API calls

- [ ] **Test Command (using Apache Bench or similar):**
  ```bash
  ab -n 1000 -c 10 https://[YOUR_VERCEL_URL]/api/health
  # Expected: average response time < 100ms
  ```

- [ ] **Reference:** `PHASE9_MARKETING/load-test-plan.md`, `scripts/benchmark-*.mjs`

### 42. Accessibility Compliance (WCAG 2.1 Level AA)
- [ ] **Action:** Verify dashboard is accessible to users with disabilities
- [ ] **Checklist:**
  - [ ] Keyboard navigation works (Tab through all controls)
  - [ ] Screen reader compatible (test with NVDA or JAWS)
  - [ ] Color contrast ≥4.5:1 for normal text (WCAG AA standard)
  - [ ] All images have alt text
  - [ ] Form labels associated with inputs (not just placeholders)
  - [ ] Error messages are linked to fields

- [ ] **Automated Check:**
  ```bash
  npm run test:a11y  # (if script exists, otherwise use axe DevTools)
  ```

- [ ] **Manual Check:** Test with keyboard only (no mouse)
  - [ ] Can access all controls
  - [ ] Focus indicator is visible
  - [ ] Tab order is logical

- [ ] **Reference:** `PHASE9_MARKETING/accessibility-test-plan.md`

### 43. Mobile Responsiveness
- [ ] **Action:** Verify dashboard works on mobile devices
- [ ] **Test Devices:**
  - [ ] iPhone SE (375×667)
  - [ ] iPhone 14 (390×844)
  - [ ] iPad (768×1024)
  - [ ] Android phone (375×667)
  - [ ] Android tablet (768×1024)

- [ ] **Verification:**
  - [ ] No horizontal scrolling
  - [ ] Touch targets ≥44×44px (iOS standard)
  - [ ] Text is readable at default zoom (not <12px)
  - [ ] Navigation works on touchscreen

- [ ] **Reference:** Test using Chrome DevTools mobile emulation
- [ ] **Reference:** `PHASE9_MARKETING/mobile-test-plan.md`

### 44. Browser Compatibility
- [ ] **Action:** Verify app works on major browsers
- [ ] **Browsers Tested:**
  - [ ] Chrome (latest 2 versions)
  - [ ] Firefox (latest 2 versions)
  - [ ] Safari (latest 2 versions)
  - [ ] Edge (latest 2 versions)

- [ ] **Verification:**
  - [ ] No JavaScript errors
  - [ ] Layout renders correctly
  - [ ] Forms submit successfully

- [ ] **Reference:** `PHASE9_MARKETING/browser-compatibility-test-plan.md`

### 45. Documentation & Help
- [ ] **Action:** Verify documentation is complete and helpful
- [ ] **Documentation Checklist:**
  - [ ] Getting Started guide (5-10 minutes to first policy)
  - [ ] API Reference (all endpoints documented with examples)
  - [ ] Integration examples (cURL, Python, JavaScript)
  - [ ] FAQ (common questions answered)
  - [ ] Troubleshooting (common issues and solutions)
  - [ ] Video tutorial (optional but recommended)
  - [ ] API status page or incident history

- [ ] **Quality Verification:**
  - [ ] All code examples are tested and correct
  - [ ] Documentation is updated with each code change
  - [ ] Help content matches current product features
  - [ ] No broken links or outdated references

- [ ] **Reference:** `PHASE9_MARKETING/developer-documentation-template.md`

---

## SECTION F: Business & Metrics (Items 46-50)

Final checks before submission.

### 46. Pricing Model Defined
- [ ] **Action:** Define and document your pricing
- [ ] **Pricing Options (choose one or combine):**
  - [ ] **Freemium:** Free tier (e.g., 100 operations/month), paid tier (e.g., $99/month)
  - [ ] **Per-Operation:** $0.01-$0.10 per gated operation
  - [ ] **Per-Agent:** $10-$50/month per connected agent
  - [ ] **Per-Organization:** $500-$5,000/month flat rate
  - [ ] **Revenue Share:** % of Stripe processing volume (15% typical)

- [ ] **Justification:** Document why this pricing is sustainable
  - [ ] Cost structure (infrastructure, support, payment processing)
  - [ ] Competitive landscape (pricing vs. Stripe competitors)
  - [ ] Customer willingness to pay (market research or pilot results)

- [ ] **Reference:** `PHASE9_MARKETING/pricing-model.md`, `PHASE9_PARTNERSHIP.md`

### 47. Target Customer Profiles Identified
- [ ] **Action:** Document 3-5 ideal customer profiles (ICP)
- [ ] **ICP Example 1 (High-Compliance E-commerce):**
  - [ ] Company: Online retailer processing $10M+/year
  - [ ] Problem: Fraud risk, regulatory requirements (PCI DSS, SOC 2)
  - [ ] Use case: Gate high-value charges, audit trail for compliance
  - [ ] Expected ROI: 0.5% fraud reduction = $50K/year savings

- [ ] **ICP Example 2 (Payment Processor):**
  - [ ] Company: Fintech platform with 10K+ merchants
  - [ ] Problem: Merchant fraud, chargebacks, operational risk
  - [ ] Use case: Gate all merchant payouts, monitor for unusual patterns
  - [ ] Expected ROI: 1% chargeback reduction = $100K/year savings

- [ ] **ICP Example 3 (Financial SaaS):**
  - [ ] Company: Accounting/bookkeeping SaaS with Stripe integration
  - [ ] Problem: Customer compliance, audit trail requirements
  - [ ] Use case: Gate refunds, provide compliance-ready audit trail
  - [ ] Expected ROI: Reduce refund fraud, support enterprise compliance

- [ ] **Reference:** `PHASE9_MARKETING/use-case-guides.md`, `PHASE9_CUSTOMER_ONBOARDING/success-metrics.md`

### 48. Go-to-Market Plan Documented
- [ ] **Action:** Define how you'll acquire first customers post-launch
- [ ] **GTM Strategy (choose 1-3):**
  - [ ] Direct outreach to target customers (email, cold call, partnerships)
  - [ ] Content marketing (blog posts on fraud prevention, compliance)
  - [ ] Marketplace visibility (SEO, featured listings, Stripe promotion)
  - [ ] Integration partnerships (Stripe partner network)
  - [ ] Event marketing (conferences, webinars)
  - [ ] Word-of-mouth (customer testimonials, case studies)

- [ ] **First 30 Days Plan:**
  - [ ] Week 1: Collect 10 beta customer signups
  - [ ] Week 2: Onboard 3-5 beta customers
  - [ ] Week 3: Gather feedback, iterate product
  - [ ] Week 4: Prepare case study, refine messaging

- [ ] **Reference:** `PHASE9_MARKETING/launch-plan.md`, `PHASE9_SUPPORT_PLAYBOOK.md`

### 49. Success Metrics Defined
- [ ] **Action:** Define metrics to track post-launch success
- [ ] **Key Metrics:**
  - [ ] **Adoption:** Installations/month, Active users/month
  - [ ] **Engagement:** Operations gated/month, Avg. policy complexity
  - [ ] **Retention:** 30-day, 90-day retention rate
  - [ ] **Revenue:** MRR (monthly recurring revenue), CAC (customer acquisition cost), LTV (lifetime value)
  - [ ] **Satisfaction:** NPS (net promoter score), support ticket volume/resolution

- [ ] **Targets:**
  - [ ] Month 1: 50 installations, 500 operations/month
  - [ ] Month 3: 150 installations, 5,000 operations/month
  - [ ] Month 6: 300 installations, 20,000 operations/month

- [ ] **Reference:** `PHASE9_SUCCESS_METRICS.md`, `PHASE9_CUSTOMER_ONBOARDING/success-metrics.md`

### 50. Pre-Submission Checklist Final Review
- [ ] **Verification:** All 50 items above are complete or documented
- [ ] **Sign-Off:** Product lead confirms app is ready for Stripe review
- [ ] **Quality Assurance:** Final QA test run (Section E items 36-45)
- [ ] **Security Review:** Security team confirms no vulnerabilities (Section D items 26-35)
- [ ] **Legal Review:** Legal team confirms privacy policy, ToS, DPA are compliant
- [ ] **Go/No-Go Decision:** GO to submit, or identify remaining items

---

## Submission Steps

Once all 50 items are complete:

### In Stripe Dashboard:

1. Log in to **Stripe Dashboard** → **Apps & Integrations** → **Develop an App**
2. Find your app in "My Apps" section
3. Click app → **App Details** → **Listing** tab
4. Fill in all required fields from Sections A-C above
5. Upload all images from Section B
6. Verify API scopes from Section C
7. Click **Submit for Review**

### Stripe will review:

- **Business verification** (2-3 business days)
- **Security review** (5-7 business days)
- **Functionality testing** (3-5 business days)
- **Compliance review** (3-5 business days)
- **Approval or feedback** (email to support contact)

### Expected Timeline:

- **Week 1:** Business verification
- **Week 2:** Security & functionality testing
- **Week 3:** Compliance review
- **Week 4:** Approval decision (or request for additional info)

---

## Post-Approval Next Steps

Once Stripe approves your app (2-4 weeks):

1. **Enable in Marketplace:** Stripe will notify you; click "Publish" in Dashboard
2. **Send Launch Email:** Notify early access customers (email template in `PHASE9_MARKETING/email-templates/`)
3. **Monitor Analytics:** Track installs, usage, support tickets
4. **Execute First 30 Days Plan:** (See `PHASE9_POST_APPROVAL_SETUP.md`)

---

## Troubleshooting & Common Rejections

### Why Stripe might reject your app:

| Issue | Cause | Fix |
|-------|-------|-----|
| **Incomplete business profile** | Missing company info | Review Section A items 1-2 |
| **Unclear permissions** | Requesting more API scope than used | Review Section C items 21-24 |
| **Insufficient documentation** | Missing API docs or integration guide | Review Section B item 20 |
| **Security concerns** | Exposed API keys, no HTTPS | Review Section D items 26-28 |
| **Poor UX** | Dashboard confusing, missing screenshots | Review Section B items 14-16 |
| **Data privacy unclear** | No privacy policy or DPA | Review Section A items 5-7, Section D item 35 |

### Stripe request for clarification:

- Stripe will email your support contact (Section A item 8)
- Respond within 5-7 days with evidence/documentation
- Most rejections are reversible; no need to resubmit from scratch

---

## Reference Documents

All supporting documents for this checklist:

```
docs/PHASE9_MARKETPLACE_SUBMISSION.md          (this file)
docs/PHASE9_MARKETING/
  ├── app-descriptions.md
  ├── app-positioning.txt
  ├── api-scope-declaration.md
  ├── restricted-scope-justification.md
  ├── brand-guidelines.md
  ├── marketing-asset-guide.md
  ├── app-icon-requirements.md
  ├── developer-documentation-template.md
  ├── api-response-sanitization.md
  ├── legal/
  │   ├── privacy-policy-template.md
  │   ├── terms-of-service-template.md
  │   ├── dpa-template.md
  │   ├── privacy-notice-template.md
  │   └── data-processing-addendum-template.md
  ├── test-plans/
  │   ├── oauth-test-plan.md
  │   ├── webhook-test-plan.md
  │   ├── policy-gating-test-plan.md
  │   ├── audit-trail-test-plan.md
  │   ├── error-handling-test-plan.md
  │   ├── load-test-plan.md
  │   ├── accessibility-test-plan.md
  │   ├── mobile-test-plan.md
  │   └── browser-compatibility-test-plan.md
  ├── security-audit-report.txt
  ├── pricing-model.md
  └── assets/
      ├── app-icon.png
      ├── favicon.ico
      ├── hero-image.png
      ├── screenshot-1-dashboard.png
      ├── screenshot-2-gating.png
      ├── screenshot-3-audit.png
      ├── og-card.png
      └── product-demo.mp4 (or YouTube link)

docs/PHASE9_POST_APPROVAL_SETUP.md
docs/PHASE9_CUSTOMER_ONBOARDING/
docs/PHASE9_SUCCESS_METRICS.md
docs/PHASE9_PARTNERSHIP.md
docs/PHASE9_SUPPORT_PLAYBOOK.md
docs/PHASE9_DEPLOYMENT_RUNBOOK.md
```

---

## Questions? Support

For questions during submission:
- **Stripe Support:** https://support.stripe.com/ → select "App Marketplace"
- **Your Support Team:** support@yourcompany.com (from Section A item 8)
- **Integration Documentation:** See `PHASE9_MARKETING/developer-documentation-template.md`

---

**Last Updated:** 2026-06-07
**Next Phase:** Post-Approval Setup (after Stripe approval, see `PHASE9_POST_APPROVAL_SETUP.md`)
