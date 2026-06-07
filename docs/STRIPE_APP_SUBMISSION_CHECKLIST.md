# Stripe App Submission Checklist

**Last Updated:** 2026-06-07  
**Purpose:** Final verification before submitting DSG ONE to Stripe App Marketplace  
**Status:** Ready for use  

---

## Pre-Submission Sign-Off

Before submitting to Stripe, verify every item below. **All items must be ✅ complete.**

Use this checklist 2–3 days before planned submission to allow time for fixes.

---

## 1. App Metadata & Listing ✅

### Core Information
- [ ] **App name** finalized: "DSG ONE - Operation Governance Gate" (≤50 chars)
- [ ] **Short name** set: "DSG ONE" (≤15 chars)
- [ ] **Category** selected: "Compliance & Governance" (or closest match)
- [ ] **Description (500 chars)** drafted and reviewed
- [ ] **Full description (2000 chars)** drafted and reviewed
- [ ] **Website URL** is live and accessible (HTTPS)
- [ ] **Support email** monitored and staffed (test receipt: send yourself an email)
- [ ] **Support URL** is live (knowledge base or help page)
- [ ] **Documentation URL** is live and current

### Assets

#### Logo
- [ ] **Logo file size:** < 2 MB
- [ ] **Logo format:** PNG with transparency
- [ ] **Logo dimensions:** 300×300 pixels (square)
- [ ] **Logo readable at:** 100×100 px (scaled down test)
- [ ] **Logo tested on:** Light dashboard background
- [ ] **Logo tested on:** Dark dashboard background
- [ ] **Logo file:** `dsg-one-logo-300x300.png` named correctly

#### Screenshots (3–5 required, all ✅ verified)

For each screenshot (1–5):

**Screenshot #1: Dashboard Overview**
- [ ] **Dimensions:** 1200×800 pixels
- [ ] **Format:** PNG
- [ ] **File size:** < 5 MB
- [ ] **Content:** Policy configuration UI visible
- [ ] **Content:** Real or realistic data (no lorem ipsum)
- [ ] **Text:** English only, ≥18pt font
- [ ] **Quality:** Clear, no pixelation

**Screenshot #2: Policy Builder**
- [ ] **Dimensions:** 1200×800 pixels
- [ ] **Format:** PNG
- [ ] **Content:** Example policy with constraints visible
- [ ] **Content:** Shows policy form/builder UI
- [ ] **Text:** Clear labels and headings
- [ ] **Annotation:** Optional arrow or highlight

**Screenshot #3: Execution Audit**
- [ ] **Dimensions:** 1200×800 pixels
- [ ] **Content:** Audit log or decision evidence visible
- [ ] **Content:** Shows reasoning for decisions
- [ ] **Layout:** Data presented clearly (not cramped)

**Screenshot #4: Webhook/Real-Time Gating** _(Optional)_
- [ ] **Dimensions:** 1200×800 pixels
- [ ] **Content:** Real-time operation flow
- [ ] **Shows:** Webhook data or live event stream

**Screenshot #5: Setup/Onboarding** _(Optional)_
- [ ] **Dimensions:** 1200×800 pixels
- [ ] **Content:** First-time user experience
- [ ] **Shows:** OAuth success or policy setup

**Screenshot Quality Checklist (All):**
- [ ] No personal/customer data visible (PII redacted)
- [ ] No hardcoded secrets, API keys, or tokens visible
- [ ] Branding consistent across all screenshots
- [ ] No copyrighted third-party logos (unless permitted)
- [ ] Each screenshot has a distinct focus (not duplicates)

---

## 2. OAuth Configuration ✅

### Stripe Credentials
- [ ] **STRIPE_CLIENT_ID** obtained from Stripe Dashboard
- [ ] **STRIPE_CLIENT_SECRET** obtained from Stripe Dashboard (live or test)
- [ ] **STRIPE_WEBHOOK_SECRET** obtained from Stripe Dashboard
- [ ] **All secrets stored in Vercel environment variables** (not in code)
- [ ] **Environment variables not printed in logs** (verified via logs)

### OAuth Endpoints
- [ ] **GET /api/stripe/oauth/authorize** implemented and tested
- [ ] **POST /api/stripe/oauth/callback** implemented and tested
- [ ] **POST /api/stripe/oauth/revoke** implemented and tested
- [ ] **State token generation** working (10-minute TTL)
- [ ] **PKCE support** implemented (if using authorization code flow)
- [ ] **Error handling** returns clear messages

### Redirect URI Configuration
- [ ] **Redirect URI registered** in Stripe: `https://YOUR_DOMAIN/api/stripe/oauth/callback`
- [ ] **Test URI registered** (optional): `http://localhost:3000/api/stripe/oauth/callback`
- [ ] **URIs match exactly** (case-sensitive, trailing slash)
- [ ] **HTTPS enforced** (no HTTP in production URIs)

### OAuth Flow Testing
- [ ] **Full OAuth flow tested** end-to-end (authorize → callback → token)
- [ ] **Error cases tested:** Denied consent, invalid state, expired code
- [ ] **Token exchange verified:** Access token received and validated
- [ ] **Token revocation tested:** POST /revoke works
- [ ] **User returned to correct URL** after authorization
- [ ] **Stripe account linked** in database

---

## 3. API Security ✅

### Endpoint Security
- [ ] **All endpoints use HTTPS** (no HTTP)
- [ ] **Bearer token validation** on protected routes
- [ ] **API key validation** for programmatic access
- [ ] **CORS headers set correctly:** Only allow Stripe and your domain
- [ ] **CORS preflight (OPTIONS)** responds with 200 OK
- [ ] **Webhook signature verification** implemented (Stripe signature check)

### Request Validation
- [ ] **Request body size limited:** 10 KB for policies, 50 KB for evidence
- [ ] **Content-Type validation:** Accept only `application/json` where appropriate
- [ ] **Schema validation:** Input parameters validated before processing
- [ ] **Rate limiting:** 100 req/min per API key implemented
- [ ] **Rate limit headers** returned: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### CSRF & State Management
- [ ] **CSRF tokens** used for state-changing operations
- [ ] **State tokens** have TTL (e.g., 10 minutes for OAuth)
- [ ] **Same-site cookie policy** set (`Strict` or `Lax`)
- [ ] **No token leakage** in URLs or logs

### SQL Injection & XSS Prevention
- [ ] **Parameterized queries** used (Supabase client does this)
- [ ] **No raw SQL with string concatenation**
- [ ] **Content-Security-Policy header** set
- [ ] **CSP forbids inline scripts** (`script-src 'none'` or trusted sources only)
- [ ] **XSS protections tested** (e.g., user input doesn't execute as script)

### Secret Management
- [ ] **No secrets in code** (grep for hardcoded keys)
  ```bash
  grep -r "sk_test\|sk_live\|rk_test\|rk_live\|whsec" . --include="*.ts" --include="*.js" --include="*.env"
  ```
- [ ] **No secrets in git history** (or use git-secret to redact)
- [ ] **No secrets in logs** (verify: tail production logs, no PII/keys visible)
- [ ] **Secrets rotatable** (can change env vars without code redeploy)
- [ ] **No `.env` file in repository** (`.env` in `.gitignore`)

---

## 4. Data Security & Privacy ✅

### Encryption & Storage
- [ ] **HTTPS/TLS 1.3+** for all traffic
- [ ] **Supabase encryption at rest** enabled (default: ✅)
- [ ] **Sensitive fields encrypted:** API tokens, secrets stored encrypted
- [ ] **Audit trail immutable:** Append-only database (no DELETEs)
- [ ] **Database backups** automated and encrypted

### Data Retention & Deletion
- [ ] **Data retention policy documented** (published in privacy policy)
- [ ] **Customer data exportable** (GDPR compliance)
- [ ] **Data deletion working** (delete operation tested)
- [ ] **Deleted data verified** (query confirms deletion)
- [ ] **Audit trail retention:** How long kept (recommended: 7 years for compliance)

### Privacy Compliance
- [ ] **Privacy Policy published** at `https://dsg.example.com/legal/privacy-policy`
- [ ] **Privacy Policy covers:** Data collection, usage, sharing, retention, deletion, user rights
- [ ] **Terms of Service published** at `https://dsg.example.com/legal/terms-of-service`
- [ ] **Terms cover:** Billing, support, liability, termination
- [ ] **Data Processing Agreement** (if handling EU personal data)
- [ ] **DPA includes:** Standard contractual clauses (SCCs), sub-processor list

### PII & Customer Data Handling
- [ ] **PII never logged** (verify: logs don't contain names, emails, card details)
- [ ] **PII never in error messages** (error responses don't leak customer info)
- [ ] **PII never in URLs** (no customer IDs in query strings if avoidable)
- [ ] **Customer data access logged** (audit trail shows who accessed what)

---

## 5. Webhooks & Event Handling ✅

### Webhook Configuration
- [ ] **Webhook endpoint registered** in Stripe: `/api/webhooks/stripe`
- [ ] **Webhook secret obtained** from Stripe (`STRIPE_WEBHOOK_SECRET`)
- [ ] **Events subscribed:** charge.created, payment_intent.*, payout.created, charge.refunded, etc.
- [ ] **Endpoint URL is HTTPS** (no HTTP)
- [ ] **Endpoint publicly reachable** (not behind auth, test with curl)

### Signature Verification
- [ ] **Stripe signature validated** on every webhook
- [ ] **Timestamp checked** (within 5 minutes of current time)
- [ ] **Invalid signatures rejected** (return 400 or 401)
- [ ] **Signature verification library** used (stripe-node, for example)

### Event Processing
- [ ] **Events processed idempotently** (same event ID = same result)
- [ ] **Event ID stored** in database (to detect duplicates)
- [ ] **Responses sent immediately** (async processing, return 200 quickly)
- [ ] **No timeouts** (keep webhook handler < 30 seconds)
- [ ] **Failed events retried** (implement queue + backoff)

### Webhook Monitoring
- [ ] **Webhook success rate logged** (target: > 99.5%)
- [ ] **Failed webhooks alerted** (e.g., Sentry, PagerDuty)
- [ ] **Webhook latency tracked** (p99 < 1 second)
- [ ] **Webhook test endpoint** available: `POST /api/webhooks/stripe/test`

---

## 6. Error Handling & User Experience ✅

### Error Messages (User-Friendly)
- [ ] **Generic "500 error" never shown** to users
- [ ] **All errors have codes** (e.g., `POLICY_VIOLATION`, `RATE_LIMIT_EXCEEDED`)
- [ ] **Error message explains what went wrong** (not just "failed")
- [ ] **Error message suggests next action** ("Review policy" or "Contact support")
- [ ] **Error includes support email** if user action needed

### Error Logging (Detailed)
- [ ] **All errors logged** with full stack trace
- [ ] **Errors include context:** User ID, request ID, timestamp, endpoint
- [ ] **Sensitive data redacted** from logs (no API keys, customer data)
- [ ] **Error monitoring tool** in place (Sentry, Datadog, etc.)

### Example Error Response ✅
```json
{
  "error": "POLICY_VIOLATION",
  "message": "Charge amount ($1,500) exceeds daily limit ($1,000)",
  "details": {
    "limit_type": "daily_amount",
    "limit_value": 1000,
    "requested_value": 1500,
    "policy_version": "v2",
    "policy_id": "pol_abc123"
  },
  "next_action": "Adjust policy limit or review approval workflow",
  "support_email": "support@dsg.example.com",
  "docs_url": "https://docs.dsg.example.com/policies/limits",
  "request_id": "req_xyz789"
}
```

---

## 7. Performance & Reliability ✅

### Latency Benchmarks
- [ ] **OAuth callback:** < 2 seconds (p99)
- [ ] **Policy evaluation:** < 500 ms (p99)
- [ ] **Webhook processing:** < 1 second (p99)
- [ ] **Audit query:** < 2 seconds (p99)
- [ ] **Full page load:** < 3 seconds (p99)

### Uptime & Availability
- [ ] **Health check endpoint:** `GET /api/health` returns 200 + status JSON
- [ ] **Uptime target:** 99.5% (< 3.6 hours downtime/month)
- [ ] **Status page available** (statuspage.io or similar)
- [ ] **Incident communication plan** documented
- [ ] **On-call rotation** in place for critical alerts

### Load Testing
- [ ] **Load test performed:** Simulated 1000 concurrent users
- [ ] **Latency holds** under load (p99 stays < 2 sec)
- [ ] **No crashes** or 500 errors under load
- [ ] **Database connection pooling** configured
- [ ] **Cache strategy** implemented (if needed)

### Monitoring & Alerts
- [ ] **Error rate monitored:** Alert if > 1% requests fail
- [ ] **Latency monitored:** Alert if p99 > 5 seconds
- [ ] **Webhook failures monitored:** Alert if > 0.5% fail
- [ ] **Database monitored:** Connection pool, query times
- [ ] **Alerts routed to on-call engineer**

---

## 8. Documentation ✅

### README & Setup Guides
- [ ] **README exists** (repo root or in package)
- [ ] **README includes:** What it does, how to install, how to use, examples
- [ ] **Setup guide complete:** Step-by-step for first-time users
- [ ] **Environment variables documented:** All required vars with descriptions
- [ ] **No secrets in docs** (API keys always marked as [PLACEHOLDER])

### API Documentation
- [ ] **API endpoints documented:** All routes, methods, parameters, responses
- [ ] **OpenAPI/Swagger spec** available (optional but recommended)
- [ ] **Example requests & responses** for each endpoint
- [ ] **Error codes documented:** What each error code means
- [ ] **Rate limits documented:** Requests per minute, per hour, daily
- [ ] **Authentication documented:** How to obtain and use API keys

### Webhook Documentation
- [ ] **Event types documented:** What events are sent, when, and with what data
- [ ] **Webhook signature verification** explained with examples
- [ ] **Webhook delivery guarantees** explained (at-least-once, ordering, retries)
- [ ] **Test webhook endpoint** documented
- [ ] **Webhook request format** with real examples

### Developer Experience
- [ ] **Quick start guide** (< 5 minutes to "hello world")
- [ ] **Troubleshooting section** with FAQs
- [ ] **Code examples** in Node.js, Python, and cURL
- [ ] **Links to official Stripe docs** where relevant
- [ ] **Support contact info** clearly visible

---

## 9. Dependency & Vulnerability Management ✅

### Dependency Audit
- [ ] **npm audit run** and all high/critical issues resolved
  ```bash
  npm audit --audit-level=high  # Must report "0 vulnerabilities"
  ```
- [ ] **npm ci used** instead of npm install (lock versions)
- [ ] **Dependencies pinned** to specific versions (package-lock.json committed)
- [ ] **Transitive dependencies audited** (Snyk or npm audit)

### Security Updates
- [ ] **Stripe SDK** updated to latest stable version
- [ ] **Next.js** updated to latest stable LTS version
- [ ] **Supabase client** updated to latest stable version
- [ ] **Node.js** running LTS version (≥18.x recommended)
- [ ] **No deprecated packages** (warn on npm install)

### Monitoring for Vulnerabilities
- [ ] **GitHub Dependabot enabled** (automated PRs for updates)
- [ ] **Renovate or similar** configured (optional)
- [ ] **Security scanning** enabled in CI (if available)
- [ ] **Dependency updates reviewed** before merging

---

## 10. Code Quality & Testing ✅

### Test Coverage
- [ ] **Unit tests:** > 80% code coverage
  ```bash
  npm run test:coverage
  ```
- [ ] **Integration tests:** All API routes tested
- [ ] **OAuth flow tests:** Happy path + error cases
- [ ] **Webhook tests:** Signature verification + idempotency
- [ ] **E2E tests:** User workflows (if using Playwright/Cypress)

### Code Quality
- [ ] **TypeScript strict mode** enabled (`tsconfig.json`)
- [ ] **Typecheck passes:** `npm run typecheck` with 0 errors
- [ ] **Linting passes:** `npm run lint` with 0 errors (or `eslint .`)
- [ ] **No console.log() in production** (use logger)
- [ ] **Consistent code style** (Prettier or similar)

### Build & Deployment
- [ ] **Next.js build succeeds:** `npm run build` with no errors
- [ ] **No warnings during build** (or warnings documented)
- [ ] **Production build smaller than dev** (tree-shaking working)
- [ ] **Deployment process automated** (CI/CD pipeline)

---

## 11. Deployment & Vercel Configuration ✅

### Vercel Setup
- [ ] **Vercel project created** and linked to GitHub repo
- [ ] **GitHub Actions** (or Vercel deploy) configured
- [ ] **Production domain** configured (custom or vercel.app)
- [ ] **Environment variables** set in Vercel project settings (never in code)
- [ ] **Builds automatic** on push to main/master

### Environment Variables (Vercel)
- [ ] **STRIPE_CLIENT_ID** set (test or live)
- [ ] **STRIPE_CLIENT_SECRET** set (test or live, suffixed with _PRIVATE)
- [ ] **STRIPE_WEBHOOK_SECRET** set
- [ ] **STRIPE_ACCOUNT_ID** set (if needed)
- [ ] **SUPABASE_URL** set
- [ ] **SUPABASE_ANON_KEY** set
- [ ] **DATABASE_URL** set (if using Postgres)
- [ ] **All secrets marked as "encrypted"** (Vercel UI shows masked values)

### Deployment Verification
- [ ] **Production URL accessible** via HTTPS
- [ ] **Health check returns 200:** `curl https://YOUR_URL/api/health`
- [ ] **API key endpoint works** (returns a valid API key)
- [ ] **Webhook endpoint accessible** (curl test: 401 if no signature, else 200)
- [ ] **Database connected** (health check includes `"database": "connected"`)

---

## 12. Legal & Compliance Documents ✅

### Terms of Service
- [ ] **Terms published** at `https://dsg.example.com/legal/terms-of-service`
- [ ] **Covers:** Service availability, billing, termination, liability
- [ ] **Liability clause:** Limits liability per law
- [ ] **Indemnification:** Protects DSG from customer misuse
- [ ] **Latest version** and "last updated" date visible

### Privacy Policy
- [ ] **Policy published** at `https://dsg.example.com/legal/privacy-policy`
- [ ] **Covers:** Data collection, usage, sharing, retention, deletion
- [ ] **EU users:** GDPR compliance explained
- [ ] **US users:** CCPA compliance explained (if applicable)
- [ ] **Third parties:** List of sub-processors (Stripe, Supabase, Vercel, etc.)
- [ ] **User rights:** Data export, deletion, portability
- [ ] **Cookie policy:** If using cookies, explained

### Data Processing Agreement (DPA)
- [ ] **If handling EU personal data:** DPA published
- [ ] **DPA includes:** Standard Contractual Clauses (SCCs)
- [ ] **Sub-processor list:** All data processors listed and consents obtained

### Acceptable Use Policy (Optional)
- [ ] **If needed:** Prohibits illegal usage, fraud, abuse
- [ ] **Published:** Same as above

---

## 13. Support & SLA ✅

### Support Channels
- [ ] **Email support** monitored (support@dsg.example.com)
- [ ] **Response time SLA:** e.g., 4 hours for paid customers
- [ ] **Issue tracking:** System to log and track support requests
- [ ] **Knowledge base:** FAQ or help articles available

### Support Documentation
- [ ] **FAQ published:** Common questions and answers
- [ ] **Troubleshooting guide:** How to debug common issues
- [ ] **Contact form:** On website for quick inquiries
- [ ] **Escalation process:** How critical issues are handled

---

## 14. Pricing & Billing (If Applicable) ✅

### Pricing Model Defined
- [ ] **Free tier:** 100 operations/month (or set limit)
- [ ] **Paid tiers:** Pricing per tier clearly defined
- [ ] **Pricing page:** Published and accessible
- [ ] **Usage calculator:** Tool to estimate monthly cost
- [ ] **Billing cycle:** Monthly, annual, or usage-based specified

### Billing Implementation
- [ ] **Stripe billing integrated** (or external billing system)
- [ ] **Cost estimates sent** to customer before billing
- [ ] **Invoices generated** and sent to customer
- [ ] **Refund policy:** Defined and published
- [ ] **Trial period:** If offered, duration and conditions specified

---

## 15. Final Sign-Off Checklist ✅

### Day Before Submission

- [ ] **All items above checked** (✅ next to each)
- [ ] **No blockers or open issues** that prevent submission
- [ ] **Team review completed** (at least 2 people sign off)
- [ ] **Marketing copy reviewed** for tone and accuracy
- [ ] **Screenshots reviewed** for clarity and professionalism

### Morning of Submission

- [ ] **Production health check passed:** `GET /api/health` returns 200 OK
- [ ] **OAuth flow tested** (authorize → callback → success)
- [ ] **Webhook tested** (send test event, verify processed)
- [ ] **API tested** (sample policy creation + evaluation)
- [ ] **Docs links all work** (no 404s)

### Submission Form

- [ ] **All form fields filled correctly**
- [ ] **No typos or grammar errors** in descriptions
- [ ] **Marketing copy final** and reviewed
- [ ] **Legal documents finalized**
- [ ] **Support contact verified** (test email sent)

---

## Sign-Off

**Prepared by:** ________________  
**Date:** ________________  

**Reviewed by:** ________________  
**Date:** ________________  

**Approved for submission:** ☐ YES ☐ NO

**If NO, blockers:**
```
1. _________________________
2. _________________________
3. _________________________
```

---

## Post-Submission Tracking

After submitting to Stripe:

| Task | Due | Status | Notes |
|------|-----|--------|-------|
| Monitor email for Stripe feedback | 1 week | ⏳ | |
| Address Stripe questions | As needed | ⏳ | |
| Resubmit if requested | Within 1 week | ⏳ | |
| Launch marketing campaign | Upon approval | ⏳ | |
| Monitor app metrics | Ongoing | ⏳ | |

---

## Version History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-07 | 1.0 | Claude | Initial comprehensive checklist |

---

**Next:** Proceed with submission using [`DEPLOYMENT_STRIPE_MARKETPLACE_REGISTRATION.md`](./DEPLOYMENT_STRIPE_MARKETPLACE_REGISTRATION.md).
