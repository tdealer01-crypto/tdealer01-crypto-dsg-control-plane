# Stripe App Marketplace Registration & Submission Guide

**Last Updated:** 2026-06-07  
**Status:** Ready for Submission  
**Target Launch:** Q2 2026

---

## Overview

This guide walks through the complete Stripe App Marketplace registration and submission process for **DSG ONE — Operation Governance Gate**.

The Stripe App Marketplace allows Stripe customers to discover and install your app directly from the Stripe Dashboard, automating OAuth setup and reducing customer friction.

---

## 1. Pre-Submission Checklist

Before creating your Stripe app listing, verify:

- [x] Stripe account exists and is in good standing
- [x] OAuth infrastructure implemented and tested
- [x] Webhook handler deployed and verified
- [x] Security headers configured (CORS, CSP, etc.)
- [x] All API endpoints return proper error messages
- [x] Documentation is complete and up-to-date
- [x] Terms of Service and Privacy Policy are published
- [x] Support email is monitored and staffed

---

## 2. Stripe App Dashboard Access

### 2.1 Open Stripe App Dashboard

Navigate to the Stripe App Dashboard:

```
https://dashboard.stripe.com/apps
```

**Prerequisites:**
- Stripe account with sufficient permissions (Owner or relevant app management role)
- Two-factor authentication enabled (recommended)
- No active security alerts on your account

### 2.2 Create New App Listing

1. Click **Create an app**
2. Select **Marketplace app** (not "Custom integration")
3. Proceed to app metadata section

---

## 3. App Metadata & Configuration

### 3.1 Basic Information

| Field | Value | Notes |
|-------|-------|-------|
| **App Name** | `DSG ONE - Operation Governance Gate` | Exactly 50 chars or less in marketplace |
| **Short Name** | `DSG ONE` | Internal reference, 15 chars max |
| **Category** | `Compliance & Governance` | One required category; use most specific |
| **App Description** | See section 3.2 | 500 character summary |
| **Full Description** | See section 3.2 | 2000 character detailed overview |
| **Website URL** | `https://dsg.pics` | Your public-facing app website |
| **Support Email** | `support@dsg.example.com` | Monitored inbox required |
| **Support URL** | `https://dsg.example.com/support` | Help desk or knowledge base |
| **Documentation URL** | `https://docs.dsg.example.com` | See `MARKETPLACE_SETUP_GUIDE.md` |

### 3.2 Description Copy

#### Short Description (500 chars max)

```
Gate AI/agent actions and payment operations before execution. 
DSG ONE adds a deterministic governance layer that evaluates every 
Stripe operation (charges, payouts, refunds) against your policies, 
records immutable audit trails, and blocks non-compliant actions in 
real-time. No more manual approvals—just intelligent, evidence-backed 
governance at machine speed.
```

#### Full Description (2000 chars max)

```
DSG ONE brings deterministic governance to Stripe operations.

WHAT IT DOES
Gate charges, payouts, refunds, and payment intents before execution. 
Every operation is evaluated against your governance policies in 
milliseconds. Non-compliant actions are blocked automatically. All 
decisions are recorded with immutable evidence trails for audit and 
compliance.

WHY YOU NEED IT
- Real-time fraud detection and policy enforcement
- Regulatory compliance (SOX, PCI-DSS, HIPAA-ready audit trails)
- Prevent unauthorized transactions before they post
- Reduce manual review workload by 80%+
- Deterministic, auditable decision-making

HOW IT WORKS
1. Connect your Stripe account (one-click OAuth)
2. Define governance policies (UI + API)
3. Operations are gated automatically
4. Audit trails recorded for every decision
5. Dashboard shows live governance status

POWERED BY
Anthropic's deterministic proof framework. Every decision is backed by 
formal evidence, not guesses or weights.

For operators, finance teams, and compliance officers managing regulated 
payment operations at scale.
```

### 3.3 Visual Assets

#### Logo Specifications

- **Dimensions:** 300×300 pixels (square)
- **Format:** PNG with transparency
- **File size:** < 2 MB
- **Color space:** sRGB
- **Content:** App icon, clearly recognizable at small sizes
- **Filename:** `dsg-one-logo-300x300.png`

**Design guidelines:**
- Avoid thin lines (< 2px) that lose detail when scaled
- Ensure legibility at 100×100px
- Use solid colors; gradients may degrade
- Include padding (10–15% border) for safe margin
- Test against both light and dark dashboard backgrounds

#### Screenshots (1200×800 PNG, 3–5 recommended)

Each screenshot should show a distinct feature or workflow. Use high-quality images with annotations.

| # | Screen | Subject |
|---|--------|---------|
| 1 | Dashboard overview | Policy configuration UI, live metrics |
| 2 | Policy builder | Example policy with constraints |
| 3 | Execution audit | Evidence trail, decision reasoning |
| 4 | Webhook handler | Real-time operation gating |
| 5 | Setup flow | One-click OAuth + first policy |

**Screenshot specifications:**
- **Dimensions:** 1200×800 pixels (3:2 aspect ratio)
- **Format:** PNG
- **File size:** < 5 MB per image
- **Language:** English only; no Thai or localized text
- **Text:** Clear, readable (18pt+ font recommended)
- **Background:** Plain or very soft colors (avoid pure black/white)

**Design checklist for each screenshot:**
- [ ] At least one clear heading or feature label
- [ ] UI elements clearly visible (buttons, forms, charts)
- [ ] Real or representative data (no placeholder text like "Lorem ipsum")
- [ ] Consistent branding and color scheme
- [ ] Annotation or arrow highlighting the key feature

---

## 4. OAuth Configuration (Verify & Complete)

### 4.1 OAuth Settings in Stripe Dashboard

After creating your app, Stripe generates:

```
CLIENT_ID: ca_...                    (20–30 alphanumeric chars)
CLIENT_SECRET: rk_test_... or rk_live_...
REDIRECT_URI: https://YOUR_DOMAIN/api/stripe/oauth/callback
SCOPES: [list of permissions]
```

### 4.2 Verify OAuth Endpoints

Ensure your deployment has these routes configured:

#### Authorization initiation
```
GET /api/stripe/oauth/authorize
  Query: ?stripe_account_id=acct_...&redirect_uri=https://...
  Response: Redirect to https://connect.stripe.com/oauth/authorize?...
```

#### OAuth callback
```
POST /api/stripe/oauth/callback
  Body: { "code": "ac_...", "state": "...", "code_verifier": "..." }
  Response: { "success": true, "next_step": "configure_policies" }
```

#### Token revocation
```
POST /api/stripe/oauth/revoke
  Body: { "stripe_account_id": "acct_...", "revoke_token": "..." }
  Response: { "success": true }
```

### 4.3 Configure Redirect URIs in Stripe Dashboard

In **App Settings > OAuth**:

1. Click **Add redirect URI**
2. Enter: `https://YOUR_VERCEL_DOMAIN/api/stripe/oauth/callback`
3. For testing: Also add `http://localhost:3000/api/stripe/oauth/callback`
4. Save changes

**Important:** URIs must match exactly (protocol, domain, path). Trailing slashes must match.

### 4.4 Environment Variables

Set in Vercel project settings:

```bash
STRIPE_CLIENT_ID=ca_...
STRIPE_CLIENT_SECRET=rk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_ACCOUNT_ID=acct_...  # Optional: test/live account
```

**Never commit these to your repository.** Always use environment variables.

---

## 5. Permissions & Scopes

### 5.1 Requested Permissions

DSG ONE requests the following Stripe OAuth scopes:

| Scope | Permission | Justification |
|-------|-----------|----------------|
| `read_write_charges` | Create, read, update charges | Gate charges before creation; read for compliance |
| `read_write_payment_intents` | Manage payment intents | Monitor and validate payment flow |
| `read_payouts` | Read payout data | Track and audit payout governance |
| `read_refunds` | Read refund records | Monitor refunds for policy violations |
| `read_write_authorizations` | Manage transaction authorizations | Real-time gate on authorization flow |
| `read_disputes` | Read chargeback/dispute data | Compliance evidence collection |
| `read_products` | Read product/pricing catalog | Policy evaluation context |
| `read_customers` | Read customer data | Governance decisions based on customer attributes |

### 5.2 Scope Justification Document

When submitting to Stripe, include this scope justification:

```markdown
# DSG ONE — Scope Justification

## Why each scope is necessary

### read_write_charges
- **Purpose:** Gate charge creation in real-time before posting to customer's account
- **Why needed:** Core governance use case—block charges violating policies
- **Mitigation:** App never creates charges without explicit policy approval

### read_write_payment_intents
- **Purpose:** Monitor payment intent lifecycle and validate amounts/customers
- **Why needed:** Early gating before payment method is charged
- **Mitigation:** Read-only for most cases; write restricted to policy-approved actions

### read_payouts
- **Purpose:** Track payout activities for governance and compliance
- **Why needed:** Auditing requirement—all payment operations must be logged
- **Mitigation:** Read-only; no modifications to payout schedule

### read_refunds
- **Purpose:** Enforce refund policy (amounts, timing, customer eligibility)
- **Why needed:** Prevent refund abuse; ensure consistent refund governance
- **Mitigation:** Read-only validation; no automatic refund creation

### read_write_authorizations
- **Purpose:** Real-time validation of card/bank authorizations
- **Why needed:** Earliest point to gate transactions
- **Mitigation:** Validation only; respects merchant's core authorization logic

### read_disputes
- **Purpose:** Feed dispute/chargeback data into governance audit trail
- **Why needed:** Compliance evidence collection
- **Mitigation:** Read-only; no dispute management

### read_products
- **Purpose:** Classify transactions by product/service for policy evaluation
- **Why needed:** Policies may differ by product category
- **Mitigation:** Read-only reference data

### read_customers
- **Purpose:** Customer attributes (verified status, account age) for policies
- **Why needed:** High-risk customer detection and dynamic policy rules
- **Mitigation:** Read-only; privacy-aware handling
```

---

## 6. Distribution & Availability Settings

### 6.1 Listing Type

- **Visibility:** `Public (Stripe App Marketplace)`
- **Availability:** `Global`
- **Restricted regions:** None (or specify if applicable)

### 6.2 Pricing Model

**Free tier:** 100 governed operations/month  
**Paid tier:** $99–$999/month (usage-based overage beyond tier limit)

```json
{
  "pricing_model": "freemium",
  "free_tier": {
    "operations_per_month": 100,
    "features": [
      "Basic policy creation",
      "Webhook gating",
      "Audit log (90 days)",
      "Email support"
    ]
  },
  "paid_tiers": [
    {
      "name": "Professional",
      "price_per_month_usd": 299,
      "operations_per_month": 10000,
      "features": [
        "Advanced policies",
        "Audit log (1 year)",
        "API access",
        "Slack integration",
        "Priority support"
      ]
    },
    {
      "name": "Enterprise",
      "price_per_month_usd": "custom",
      "operations_per_month": "unlimited",
      "features": [
        "All Professional features",
        "Custom policies",
        "Dedicated support",
        "SLA guarantee",
        "Custom integrations"
      ]
    }
  ]
}
```

### 6.3 Terms of Service & Privacy Policy

**Required documents:**

1. **Terms of Service** — published at:  
   `https://dsg.example.com/legal/terms-of-service`

2. **Privacy Policy** — published at:  
   `https://dsg.example.com/legal/privacy-policy`

3. **Data Protection Addendum** — for regulated customers  
   `https://dsg.example.com/legal/data-protection-addendum`

Both must be publicly accessible via HTTPS and clearly reference:
- Data retention and deletion policies
- Security measures
- Customer support and SLA
- Billing and refund policies
- Termination conditions

---

## 7. Webhooks Configuration

### 7.1 Stripe Webhooks to Monitor

| Event | Route | Purpose |
|-------|-------|---------|
| `charge.created` | `POST /api/webhooks/stripe/charge` | Gate before posting |
| `payment_intent.requires_action` | `POST /api/webhooks/stripe/payment_intent` | Gate before SCA/3DS |
| `payout.created` | `POST /api/webhooks/stripe/payout` | Audit payout |
| `charge.refunded` | `POST /api/webhooks/stripe/refund` | Audit refund |
| `account.external_account.created` | `POST /api/webhooks/stripe/account` | Monitor account changes |

### 7.2 Webhook Signature Verification

All webhook handlers must:

1. **Verify Stripe signature** using `STRIPE_WEBHOOK_SECRET`
2. **Check timestamp** (within 5 minutes of current time)
3. **Idempotent processing** (same event ID = same result)
4. **Return 200 OK quickly** (then process async)
5. **Log all rejections** with reason code

Example (Node.js):

```typescript
import { Stripe } from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  try {
    const event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    
    // Process event
    switch (event.type) {
      case 'charge.created':
        await gateCharge(event.data.object);
        break;
      // ... other event types
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
    });
  } catch (err) {
    console.error(`⚠️ Webhook error: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
}
```

---

## 8. Security & Compliance Requirements

### 8.1 API Security Checklist

- [x] All API routes use HTTPS (no HTTP)
- [x] Bearer token validation on protected routes
- [x] Rate limiting: 100 requests/minute per API key
- [x] Request body size limit: 10 KB for policy config, 50 KB for evidence
- [x] CORS headers: Only allow Stripe and your domain
- [x] CSRF protection: State tokens for OAuth
- [x] SQL injection prevention: Parameterized queries (Supabase)
- [x] XSS prevention: Content-Security-Policy headers
- [x] No secrets in logs or error messages
- [x] No hardcoded API keys or credentials

### 8.2 Data Security

- [x] All data encrypted in transit (TLS 1.3)
- [x] Sensitive fields encrypted at rest (Supabase encryption)
- [x] API keys and tokens rotatable
- [x] Audit trail immutable (append-only database)
- [x] Data retention policy published
- [x] GDPR / CCPA compliance (data export, deletion)

### 8.3 Operational Security

- [x] Monitoring and alerting (error rates, latency, security events)
- [x] Incident response plan documented
- [x] On-call rotation for critical alerts
- [x] Regular security updates to dependencies
- [x] Vulnerability disclosure policy published

---

## 9. Submission Process

### 9.1 Pre-Submission Verification

Before clicking "Submit," confirm:

**App Metadata:**
- [x] App name, description, category complete
- [x] Logo and screenshots uploaded and reviewed
- [x] Documentation URL is live and accessible
- [x] Support email monitored

**Configuration:**
- [x] OAuth redirect URIs match your deployment
- [x] Webhook endpoints configured in Stripe
- [x] All required permissions listed and justified
- [x] Pricing tiers defined

**Legal & Compliance:**
- [x] Terms of Service published
- [x] Privacy Policy published
- [x] Data Protection Addendum ready (if required)
- [x] No security vulnerabilities in dependencies

**Deployment:**
- [x] App deployed to production (Vercel or similar)
- [x] Health check returns 200 OK: `GET /api/health`
- [x] OAuth flow tested end-to-end
- [x] Webhook handler tested with real Stripe webhooks

### 9.2 Submit for Review

1. In Stripe App Dashboard, click **Submit for Review**
2. Stripe team will verify:
   - OAuth implementation
   - Webhook signature verification
   - API security and rate limiting
   - Data handling and privacy
   - Documentation quality
3. Expected review time: **2–4 weeks**
4. Stripe will contact you with feedback or approval

### 9.3 After Approval

Once approved:

1. **Listing goes live** in Stripe App Marketplace
2. Customers can install directly from Stripe Dashboard
3. OAuth redirect automatically set up (customer's account)
4. First policy configuration guided by your UI

---

## 10. Common Rejection Reasons & How to Avoid Them

### Issue: OAuth Flow Too Complex

**Symptom:** Stripe rejects for "poor user experience"

**Cause:** Too many steps before customer gains value

**Solution:**
- Minimize redirect hops (max 2 redirects)
- Show progress indicator
- Pre-fill as much as possible
- Auto-select sensible defaults

### Issue: Insufficient Error Messages

**Symptom:** "User doesn't understand why action failed"

**Cause:** Generic error ("Error 500") instead of actionable message

**Solution:**
```json
// ❌ Bad
{"error": "Internal error"}

// ✅ Good
{
  "error": "Policy violation",
  "reason": "Charge amount exceeds daily limit ($5,000)",
  "next_action": "Review or adjust policy",
  "policy_version": "v2",
  "docs_url": "https://docs.dsg.example.com/policies"
}
```

### Issue: Webhooks Unreliable

**Symptom:** "App misses events or processes them out of order"

**Cause:** No signature verification, no idempotency, crashes on error

**Solution:**
1. Always verify webhook signature
2. Store processed event IDs to prevent duplicates
3. Return 200 OK immediately, process async
4. Implement exponential backoff for retries
5. Log all webhook activity

### Issue: Security Vulnerabilities in Dependencies

**Symptom:** "Dependencies have known vulnerabilities"

**Cause:** Outdated npm packages, `npm audit` fails

**Solution:**
```bash
npm audit --audit-level=high  # Must pass
npm audit fix                  # Auto-fix available vulnerabilities
npm ci                         # Lock dependency versions
```

### Issue: Documentation Missing or Out of Date

**Symptom:** "Docs don't match actual API behavior"

**Cause:** Docs weren't updated when API changed

**Solution:**
- Keep `docs/` folder in git, reviewed in every PR
- API test suite doubles as documentation
- Use OpenAPI/Swagger for endpoint specs
- Include example requests and responses
- Document error codes and recovery steps

### Issue: Pricing Model Unclear

**Symptom:** "Users confused about cost"

**Cause:** No clear pricing page or confusing tiers

**Solution:**
- Publish pricing page with all tiers visible
- Show usage examples (e.g., "100 ops = $0")
- Provide calculator or usage estimator
- Allow per-operation pricing or flat-rate trial
- Send cost estimates before billing

---

## 11. Post-Launch Monitoring

### 11.1 Metrics to Track

After listing goes live:

| Metric | Target | Tool |
|--------|--------|------|
| OAuth success rate | > 98% | Supabase logs |
| Webhook delivery | > 99.5% | Stripe webhook logs |
| API latency (p99) | < 2 seconds | Vercel analytics |
| Error rate | < 0.1% | Sentry or similar |
| Customer satisfaction | > 4.0/5.0 | In-app survey |
| Support response time | < 4 hours | Email ticketing |

### 11.2 Monitoring Setup

Deploy monitoring for:

```bash
# Application health
GET /api/health                    # Every 60 seconds

# OAuth flow
POST /api/stripe/oauth/callback    # Track success/failure

# Webhook handler
POST /api/webhooks/stripe/*        # Monitor latency and errors

# Policy evaluation
POST /api/stripe/gate              # Measure decision time

# Audit trail
GET /api/audit/events              # Ensure audit data flows
```

### 11.3 Incident Response

If issues occur:

1. **Alert threshold exceeded** → Page on-call engineer
2. **Investigate root cause** → Check logs, Stripe status
3. **Communicate status** → Email customers within 30 min
4. **Implement fix** → Deploy to staging, test, roll out
5. **Post-mortem** → Document and improve monitoring

---

## 12. Timeline & Checklist

### Phase 1: Preparation (Week 1)
- [ ] Review this guide with team
- [ ] Create final logos and screenshots
- [ ] Draft Terms of Service and Privacy Policy
- [ ] Test OAuth flow end-to-end
- [ ] Deploy to production

### Phase 2: Submission (Week 2)
- [ ] Fill out Stripe App Dashboard form
- [ ] Upload assets (logo, screenshots, docs)
- [ ] Submit for review
- [ ] Add to PR #700 or subsequent feature PR

### Phase 3: Review & Feedback (Weeks 2–4)
- [ ] Monitor email for Stripe feedback
- [ ] Address any questions or requests
- [ ] Make adjustments if needed
- [ ] Resubmit if required

### Phase 4: Launch (Week 4–5)
- [ ] Stripe approves listing
- [ ] App goes live in marketplace
- [ ] Announce to customer list
- [ ] Monitor metrics and support tickets

### Phase 5: Post-Launch (Week 5+)
- [ ] Gather customer feedback
- [ ] Optimize onboarding based on usage
- [ ] Plan Phase 2 features (advanced policies, integrations)
- [ ] Consider case studies or testimonials

---

## 13. Resources & Support

### Official Stripe Resources

- [Stripe App Marketplace Help](https://support.stripe.com/questions/stripe-app-marketplace)
- [OAuth Implementation Guide](https://stripe.com/docs/connect/oauth-reference)
- [Webhook Documentation](https://stripe.com/docs/webhooks)
- [API Reference](https://stripe.com/docs/api)

### DSG ONE Documentation

- [`MARKETPLACE_SETUP_GUIDE.md`](./MARKETPLACE_SETUP_GUIDE.md) — Screenshots and copy templates
- [`STRIPE_APP_SUBMISSION_CHECKLIST.md`](./STRIPE_APP_SUBMISSION_CHECKLIST.md) — Pre-submit verification
- [`packages/stripe-app/docs/ARCHITECTURE.md`](../packages/stripe-app/docs/ARCHITECTURE.md) — System design
- [`packages/stripe-app/docs/API.md`](../packages/stripe-app/docs/API.md) — API endpoints

### Support

For questions during submission:

- **Stripe support:** https://support.stripe.com
- **DSG team:** support@dsg.example.com
- **Developer docs:** https://docs.dsg.example.com

---

## 14. Frequently Asked Questions

**Q: Can we submit multiple apps to the marketplace?**  
A: Yes, but one app per use case. Each app should have a distinct purpose.

**Q: How long is the review process?**  
A: Typically 2–4 weeks from submission. Stripe prioritizes apps with good documentation and clear security practices.

**Q: Can we charge customers directly, or through Stripe's billing?**  
A: You can use Stripe's billing system (metered usage, subscriptions) or handle billing outside. Stripe recommends using their system for simplicity.

**Q: What happens if Stripe rejects our app?**  
A: Stripe will provide detailed feedback. Common issues are security, documentation, or user experience. You can resubmit after addressing feedback.

**Q: Do we need separate test and production apps?**  
A: No. One app handles both test and live Stripe keys. Stripe provides different OAuth credentials for test and live modes.

**Q: Can customers uninstall the app?**  
A: Yes. When they uninstall, Stripe revokes OAuth access automatically. You should clean up any persisted data.

---

## Version History

| Date | Version | Author | Change |
|------|---------|--------|--------|
| 2026-06-07 | 1.0 | Claude | Initial comprehensive guide |

---

**Next:** See [`STRIPE_APP_SUBMISSION_CHECKLIST.md`](./STRIPE_APP_SUBMISSION_CHECKLIST.md) for the pre-submit verification checklist.
