# Phase 9: Interactive Marketplace Submission Checklist

**Status:** Fillable form for Stripe App Marketplace Submission  
**Product:** DSG Governance Gate  
**Total Items:** 50 items organized by 6 categories  
**Estimated Completion Time:** 2 weeks preparation + 2-4 weeks Stripe review  
**Target Date:** Week of [INSERT DATE]

---

## How to Use This Form

1. **Download & Print** or **use digitally** (mark checkboxes as you complete items)
2. **Follow the instructions** for each item in order
3. **Link to external resources** to complete work
4. **Verify completion** with the stated evidence
5. **Track timeline** with T-0 (submission) to T+35 days (approval)

---

## SECTION A: App Identity & Legal (10 items) — Est. 2-3 hours

| # | Item | Instructions | Verification | Evidence | Status |
|---|------|--------------|--------------|----------|--------|
| 1 | **App Name & Category** | Log into Stripe Dashboard → Apps & Integrations → Develop an App. Name: "DSG Governance Gate". Category: "Risk Management". Subcategory: "Fraud Detection" or "Policy Automation". | Confirmed in Stripe Dashboard | App slug: `________________` | ☐ |
| 2 | **Company/Partner Profile** | Stripe Dashboard → Settings → Business Profile. Verify: legal name, address, phone, email match. Live mode (not test). | Stripe confirms profile matches | Verified in: `________________` | ☐ |
| 3 | **App Description (Short)** | Stripe Dashboard → App Listing → Short Description (max 140 chars). Use: "Gate AI operations in Stripe. Real-time policy gating, immutable audit trails." | Character count ≤ 140 | Text: `________________________` | ☐ |
| 4 | **App Description (Long)** | Stripe Dashboard → App Listing → Long Description (max 4,000 chars). Use template from PHASE9_MARKETING/app-descriptions.md. | Renders correctly in Dashboard | File: `PHASE9_MARKETING/app-descriptions.md` | ☐ |
| 5 | **Privacy Policy** | Stripe Dashboard → App Listing → Privacy Policy URL. HTTPS URL with: data types, retention (12+ months), GDPR/CCPA, contact. | Publicly accessible via HTTPS | URL: `https://________________` | ☐ |
| 6 | **Terms of Service** | Stripe Dashboard → App Listing → Terms of Service URL. HTTPS URL with: acceptable use, liability, indemnification, termination, DPA reference. | Publicly accessible via HTTPS | URL: `https://________________` | ☐ |
| 7 | **Data Processing Agreement** | Prepare DPA using PHASE9_MARKETING/legal/dpa-template.md. GDPR Article 28, sub-processors, retention, audit clauses. | Legal review completed | Reviewed by: `________________` | ☐ |
| 8 | **Support Email & Contact** | Stripe Dashboard → App Listing → Support Contact. Email (support@...) + support page URL. Response time ≤24 hrs urgent. | Email monitored, responds within SLA | Email: `________________` | ☐ |
| 9 | **Company Website & Blog** | Stripe Dashboard → Company Profile → Website. Company info, team, vision, blog, 3-5 case studies. | SSL, mobile responsive, no 404s | URL: `https://________________` | ☐ |
| 10 | **Compliance & Certifications** | Document existing certifications (SOC 2, ISO 27001, PCI DSS, GDPR). Only claim with valid proof. | Only valid certifications listed | Certifications: `________________` | ☐ |

**Section A: ☐ Complete (___/10)**

---

## SECTION B: Visual Assets & Branding (10 items) — Est. 4-6 hours

| # | Item | Specifications | File Location | Status |
|---|------|-----------------|---------------|--------|
| 11 | **App Icon (Primary)** | 1200×1200px PNG, RGBA transparent, <1MB, recognizable at 100px | PHASE9_MARKETING/assets/app-icon.png | ☐ |
| 12 | **App Icon (Favicon)** | 32×32px PNG or ICO, matches primary design | PHASE9_MARKETING/assets/favicon.ico | ☐ |
| 13 | **Hero Image** | 2048×900px or 1920×1080px, product screenshot/lifestyle, <2MB | PHASE9_MARKETING/assets/hero-image.png | ☐ |
| 14 | **Screenshot 1: Dashboard** | 1280×720px+, policy editor, example policy, caption | PHASE9_MARKETING/assets/screenshot-1-dashboard.png | ☐ |
| 15 | **Screenshot 2: Gating** | 1280×720px+, charge evaluation, decision (ALLOW/REVIEW/BLOCK), reason | PHASE9_MARKETING/assets/screenshot-2-gating.png | ☐ |
| 16 | **Screenshot 3: Audit Trail** | 1280×720px+, execution history, timestamps, policy version, compliance fields | PHASE9_MARKETING/assets/screenshot-3-audit.png | ☐ |
| 17 | **Social Media Card** | 1200×630px PNG (OG/Twitter), app logo, name, value prop | PHASE9_MARKETING/assets/og-card.png | ☐ |
| 18 | **Brand Guidelines** | Colors (HEX), logo usage, typography, tone & voice | PHASE9_MARKETING/brand-guidelines.md | ☐ |
| 19 | **Demo Video** | 30-60 sec MP4 or YouTube, dashboard→policy→execute→audit trail, captions | PHASE9_MARKETING/assets/product-demo.mp4 | ☐ |
| 20 | **Developer Docs Link** | Public URL with: Quick Start (5 min), API reference, examples, FAQ, troubleshooting | https://________________ | ☐ |

**Section B: ☐ Complete (___/10)**

---

## SECTION C: Permissions & API Scope (5 items) — Est. 1-2 hours

| # | Item | Action | Verification | Status |
|---|------|--------|--------------|--------|
| 21 | **API Scopes** | Declare in Stripe: read_write Charges/Payouts/Refunds/Webhooks, read Customers/API Keys/Events/Accounts. Justify each in PHASE9_MARKETING/api-scope-declaration.md. | Only scopes actually used | ☐ |
| 22 | **Webhook Events** | Register: charge.created, charge.updated, charge.failed, charge.refunded, payout.created, payout.updated, refund.created, account.updated. Endpoint: https://[YOUR_URL]/api/stripe-webhook | Production-ready handler, signature validation | ☐ |
| 23 | **Redirect URIs** | OAuth: https://[PROD_URL]/api/stripe-callback, https://[STAGING_URL]/api/stripe-callback. No http://localhost. | HTTPS, verified domain, no typos | ☐ |
| 24 | **Sensitive Scopes** | If requesting restricted scopes (restricted_api_keys, Billing Events), provide justification in PHASE9_MARKETING/restricted-scope-justification.md. | Clear, evidence-based reasoning | ☐ |
| 25 | **Security Pre-Submission** | Verify: no secrets in logs, webhook signature validation, rate limiting enforced, sanitized responses, redacted logs. | All checks pass | ☐ |

**Section C: ☐ Complete (___/5)**

---

## SECTION D: Security & Compliance (10 items) — Est. 2-3 hours

| # | Item | Requirements | Verification | Status |
|---|------|--------------|--------------|--------|
| 26 | **HTTPS Everywhere** | All endpoints TLS 1.2+, valid SSL cert (not self-signed/expired), domain matches | curl -I https://[URL]/api/health shows HTTP/2 | ☐ |
| 27 | **Security Headers** | CSP, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, HSTS, Referrer-Policy | All headers present on /api/health | ☐ |
| 28 | **CORS** | Restricted to your domain (HTTPS), Stripe (if needed). Never wildcard (*). | Code review lib/security/cors.ts | ☐ |
| 29 | **Rate Limiting** | 100 req/min per IP, 1000 req/min per API key. Test: 101 requests → 429 responses. | Rate limit enforced, tested | ☐ |
| 30 | **Input Validation** | Webhook signature verified, JSON body limits, API params validated, no injection. | Code review lib/security/request-validation.ts | ☐ |
| 31 | **Audit Logging** | App auth, webhook delivery, API errors, patterns, admin actions. Immutable, append-only, ≥12 mo retention. | Logs in Supabase, access-controlled | ☐ |
| 32 | **Data Encryption** | HTTPS/TLS 1.2+, Stripe-signed webhooks, secrets in env vars (not logs). | No unencrypted secrets, API keys in env | ☐ |
| 33 | **Vulnerability Scan** | npm audit --audit-level=moderate. Fix or document exceptions. npm update, test, build. | No moderate+ vulnerabilities | ☐ |
| 34 | **Data Privacy** | Collected: charge metadata, account info, results, access logs. NOT: PAN, CVV, passwords. Retention: audit ≥12 mo, access ≥3 mo. | Policy documented | ☐ |
| 35 | **GDPR Compliance** | EU customers? Implement: Access, Deletion, Rectification, Restrict, Portability. Publish DPA, Privacy Notice. | DPA: https://________________ | ☐ |

**Section D: ☐ Complete (___/10)**

---

## SECTION E: Functional Testing (10 items) — Est. 4-6 hours

| # | Item | Test Scenarios | Pass/Fail | Status |
|---|------|----------------|-----------|--------|
| 36 | **OAuth Integration** | Full flow: click Connect → authorize → callback → token exchange → webhook received → charges readable | ☐ Pass ☐ Fail | ☐ |
| 37 | **Webhook Handler** | Stripe CLI: listen, trigger events (charge.created, updated, failed, refunded, payout.created/updated, refund.created, account.updated). All process correctly. | ☐ Pass ☐ Fail | ☐ |
| 38 | **Policy Gating** | (1) Block: $10K charge, policy "$5K max" → BLOCK. (2) Allow: $500 charge, policy "$1K max" → ALLOW. (3) Review: $2K charge, policy "$1K-$5K review" → REVIEW. | ☐ Pass ☐ Fail | ☐ |
| 39 | **Audit Trail** | Execute operation. Verify immutable fields: decision, policy version (hash), evidence, timestamp (ISO 8601), user/agent ID. Logs cannot be modified/deleted. | ☐ Pass ☐ Fail | ☐ |
| 40 | **Error Handling** | Invalid OAuth → friendly error. Stripe down → retry/backoff. Bad signature → 401. Rate limited → 429. DB lost → 500. NO secrets/PII/stack traces. | ☐ Pass ☐ Fail | ☐ |
| 41 | **Performance** | Webhook ≥100 ops/sec, policy eval ≥1K ops/sec, dashboard ≥50 users, latency <500ms p99. Test: ab -n 1000 -c 10 on /api/health. | ☐ Pass ☐ Fail | ☐ |
| 42 | **Accessibility (WCAG AA)** | Keyboard nav, screen reader, color contrast ≥4.5:1, alt text, form labels, error linking. | ☐ Pass ☐ Fail | ☐ |
| 43 | **Mobile Responsiveness** | iPhone SE/14, iPad, Android phone/tablet. No horizontal scroll, touch ≥44×44px, text ≥12px, touchscreen navigation works. | ☐ Pass ☐ Fail | ☐ |
| 44 | **Browser Compatibility** | Chrome (2 latest), Firefox (2 latest), Safari (2 latest), Edge (2 latest). No JS errors, layout correct, forms work. | ☐ Pass ☐ Fail | ☐ |
| 45 | **Documentation** | Getting Started (5-10 min), API Reference (all endpoints), Examples (cURL/Python/JS), FAQ, Troubleshooting. Tested code, no broken links, current. | ☐ Pass ☐ Fail | ☐ |

**Section E: ☐ Complete (___/10)**

---

## SECTION F: Business & Metrics (5 items) — Est. 2-3 hours

| # | Item | Options / Examples | Selected | Status |
|---|------|-------------------|----------|--------|
| 46 | **Pricing Model** | Freemium / Per-Op ($0.01-0.10) / Per-Agent ($10-50/mo) / Per-Org ($500-5K/mo) / Revenue Share (%). Document in PHASE9_MARKETING/pricing-model.md. | `________________` | ☐ |
| 47 | **Customer Profiles** | 3-5 ICPs: type, problem, use case, ROI. Examples: E-commerce ($10M+/yr), Payment Processor (10K+ merchants), Fin SaaS. PHASE9_MARKETING/use-case-guides.md. | ICP 1: `________________` | ☐ |
| 48 | **Go-to-Market** | 1-3 strategies: direct outreach, content, marketplace, partnerships, events, word-of-mouth. First 30 days: week 1 (10 beta), week 2 (3-5 onboarded), week 3 (feedback), week 4 (case study). | GTM: `________________` | ☐ |
| 49 | **Success Metrics** | Adoption (installs/mo), Engagement (ops/mo), Retention (30/90-day), Revenue (MRR/CAC/LTV), NPS. Targets: M1 (50 installs, 500 ops), M3 (150, 5K), M6 (300, 20K). | M1: _____ installs | ☐ |
| 50 | **Final Review** | Sign-off: Product lead GO, QA complete, Security green, Legal approved. | ☐ GO ☐ NO-GO | ☐ |

**Section F: ☐ Complete (___/5)**

---

## FINAL SUBMISSION CHECKLIST

**All Sections Complete?**
- [ ] Section A: 10/10 ✓
- [ ] Section B: 10/10 ✓
- [ ] Section C: 5/5 ✓
- [ ] Section D: 10/10 ✓
- [ ] Section E: 10/10 ✓
- [ ] Section F: 5/5 ✓

**TOTAL: ___/50 Items**

**Sign-Offs:**
- [ ] Product Lead: _________________ Date: _________
- [ ] Security Lead: _________________ Date: _________
- [ ] Legal: _________________ Date: _________
- [ ] QA: _________________ Date: _________

**Submission:**
1. Stripe Dashboard → Apps & Integrations → Develop an App
2. Click your app → App Details → Listing tab
3. Fill all fields (Sections A-C)
4. Upload images (Section B)
5. Verify scopes (Section C)
6. Click "Submit for Review"

**Submission Date:** ___________
**Stripe Confirmation Received:** ☐ Yes (Date: _________)

---

**Timeline:**
- T-14 days: Start Section A
- T-10 days: Complete A, B
- T-7 days: Complete C, D
- T-3 days: Complete E, F
- T-0: Submit
- T+1-2 weeks: Stripe verification
- T+2-4 weeks: Stripe review
- T+5-6 weeks: Approval decision

**Support:** https://support.stripe.com/ (App Marketplace)

**Last Updated:** 2026-06-07
