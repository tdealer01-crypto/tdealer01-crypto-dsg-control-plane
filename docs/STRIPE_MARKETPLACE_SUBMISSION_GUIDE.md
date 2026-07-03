# Stripe App Marketplace Submission Guide
## DSG Governance Gate - Production Submission

**Date Created:** July 1, 2026  
**Status:** Ready for Submission  
**Product:** DSG Governance Gate  
**Target Environment:** Stripe Live Mode  

---

## 📋 Pre-Submission Checklist

### ✅ Phase 1: Manifest & Configuration
- [ ] **App ID:** `pics.dsg.governance` (verified in `stripe-app.json`)
- [ ] **App Name:** "DSG Governance Gate" (35 chars - ✅ 19 chars)
- [ ] **Distribution Type:** `public` (set in manifest)
- [ ] **Sandbox Compatible:** `true` (enabled for testing)
- [ ] **API Access:** OAuth 2.0 configured
- [ ] **Icon:** 300×300px PNG ✅ (verified at `packages/stripe-app/icon.png`)

### ✅ Phase 2: Permissions & Scopes
- [ ] **Required Permissions:**
  - `charge_read` - Read charge details
  - `account_information` - Account info access (read_only)
  - `charges_refunds` - Charges/Refunds (read_only)
  - `external_access` - DSG API communication
- [ ] **Webhook Events:**
  - `charge.created`, `charge.updated`, `charge.failed`, `charge.refunded`
  - `payout.created`, `payout.updated`
  - `refund.created`
  - `account.updated`
- [ ] **Redirect URIs (Production):**
  - `https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback`
  - `https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback`

### ✅ Phase 3: Listing Content
**Required Fields:**
- [ ] **Name** (max 35 chars)
  - Current: "DSG Governance Gate" ✅
- [ ] **Category:** Risk Management / Policy Automation
- [ ] **Subtitle** (max 80 chars)
  - "Real-time governance and compliance status on payment details"
- [ ] **Short Description** (max 140 chars)
  - "Gate Stripe operations. Real-time policy gating, immutable audit trails."
- [ ] **Long Description** (max 4,000 chars)
  - ✅ See `LISTING_CONTENT.md`
- [ ] **Privacy Policy URL:** `https://dsg.pics/privacy`
- [ ] **Terms of Service URL:** `https://dsg.pics/terms`
- [ ] **Support Email:** `support@dsg.pics`
- [ ] **Company Website:** `https://dsg.pics`
- [ ] **Based In:** United States
- [ ] **Supported Languages:** English

### ✅ Phase 4: Visual Assets
- [ ] **App Icon (Primary):** 1200×1200px PNG/JPG, <1MB ✅
- [ ] **Hero Image:** 2048×900px, <2MB
- [ ] **Key Feature Screenshots (3x):**
  1. Dashboard policy editor view
  2. Charge evaluation (ALLOW/REVIEW/BLOCK)
  3. Audit trail / compliance view
  - Each: 1280×720px+, <5MB
- [ ] **Logo:** Square 1:1 aspect ratio, matches brand

### ✅ Phase 5: Features & Use Cases
**Key Features** (up to 3):
1. **Real-Time Policy Evaluation**
   - "View ALLOW, BLOCK, or REVIEW decisions from DSG control plane on payment details"
   - Includes policy version and proof reference

2. **Governance Audit Trail**
   - "Every decision timestamped and versioned for compliance reviews"
   - Complete audit trail for regulatory reporting

3. **Safe Failure Mode**
   - "If governance service unreachable, shows REVIEW (never auto-allow)"
   - Maximum safety during service interruptions

### ✅ Phase 6: Security & Compliance
- [ ] **HTTPS Everywhere:** All endpoints TLS 1.2+
  - Production URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- [ ] **Security Headers:** CSP, X-Content-Type-Options, X-Frame-Options, HSTS
- [ ] **CORS:** Restricted to authorized domains only (no wildcard)
- [ ] **Rate Limiting:** 100 req/min per IP, 1000 req/min per API key
- [ ] **Input Validation:** Webhook signature verification, JSON body limits
- [ ] **Audit Logging:** Immutable append-only logs, ≥12 months retention
- [ ] **Data Encryption:** HTTPS/TLS, signed webhooks, secrets in env vars
- [ ] **Dependencies:** `npm audit --audit-level=moderate` passed
- [ ] **GDPR Compliance:** Privacy Policy & DPA documented
- [ ] **Privacy:** Collects: charge metadata, account info, results, access logs
  - NOT collected: PAN, CVV, passwords, sensitive PII

### ✅ Phase 7: Functional Testing
- [ ] **OAuth Flow Test:** Install → Authorize → Callback → Token Exchange ✅
- [ ] **Webhook Handler Test:** Stripe CLI events processed correctly ✅
- [ ] **Policy Gating Test:** 
  - BLOCK scenario (charge > limit) ✅
  - ALLOW scenario (charge < limit) ✅
  - REVIEW scenario (charge in review range) ✅
- [ ] **Audit Trail Test:** Immutable, timestamped, policy version tracked ✅
- [ ] **Error Handling:** No secrets/PII/stack traces in responses ✅
- [ ] **Performance:** 
  - Webhook: ≥100 ops/sec
  - Policy eval: ≥1K ops/sec
  - Latency: <500ms p99
- [ ] **Accessibility:** WCAG AA compliance verified
- [ ] **Mobile Responsiveness:** Tested on iPhone, iPad, Android
- [ ] **Browser Compatibility:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] **Documentation:** Complete, tested, no broken links

### ✅ Phase 8: Business Metrics
- [ ] **Pricing Model:** Freemium
  - Free: 100 gated operations/month
  - Pro: $99/month unlimited + analytics
- [ ] **ICPs** (3-5 target customer profiles):
  1. FinTech: Gate fund movements, $50M+ annual volume
  2. SaaS Billing: Require refund approvals
  3. Marketplaces: Prevent accidental mass payouts
  4. Enterprise Finance: Audit trail for compliance
- [ ] **Go-to-Market Strategy:**
  - Direct outreach to FinTech/SaaS
  - Content marketing (blog, case studies)
  - Stripe partnership program
  - Customer success program
- [ ] **Success Metrics:**
  - M1: 50 installs, 500 ops/month
  - M3: 150 installs, 5K ops/month
  - M6: 300 installs, 20K ops/month
- [ ] **Sign-offs:** Product ✅ | QA ✅ | Security ✅ | Legal ✅

---

## 🚀 Step-by-Step Submission Process

### STEP 1: Verify Production Environment

```bash
# Check that app is deployed and production-ready
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness

# Verify OAuth callback URLs are accessible
curl -i https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback
```

**Expected Results:**
- ✅ Health endpoint returns 200 OK
- ✅ Readiness endpoint returns 200 OK
- ✅ OAuth callback returns 200 or expected redirect

---

### STEP 2: Prepare Stripe Live Account

**Prerequisites:**
- [ ] Stripe Live account (not test mode)
- [ ] Account verified with Stripe (bank details, identity)
- [ ] Access to Stripe Dashboard → Developers → Apps

**Actions:**
1. Log into Stripe Live Dashboard
2. Navigate to: **Developers** → **Apps & Integrations**
3. Click **"Develop an App"**
4. Select **"Create"** or use existing app `pics.dsg.governance`

---

### STEP 3: Upload/Verify App Manifest

**File:** `packages/stripe-app/stripe-app.json`

**Verification:**
```bash
# Validate JSON structure
jq . packages/stripe-app/stripe-app.json

# Check distribution type is "public"
jq '.distribution_type' packages/stripe-app/stripe-app.json
# Expected: "public"

# Check allowed_redirect_uris are HTTPS (no localhost)
jq '.allowed_redirect_uris[]' packages/stripe-app/stripe-app.json
# Expected: All HTTPS URLs, no localhost
```

**Manifest Checklist:**
- [ ] `distribution_type: "public"`
- [ ] `sandbox_install_compatible: true`
- [ ] `icon: "./icon.png"` (300×300 PNG verified ✅)
- [ ] `allowed_redirect_uris` - all HTTPS, no localhost/dummy URLs
- [ ] `ui_extension.views` - empty or populated (ours: empty)
- [ ] `permissions` - all listed with clear purpose
- [ ] `post_install_action.url` - HTTPS production URL

**Upload via Stripe CLI:**
```bash
# Login to Stripe CLI
stripe login

# Upload manifest
stripe apps create --manifest packages/stripe-app/stripe-app.json

# Alternative: Manual upload in Dashboard
# Developers → Apps → Your App → Settings → Upload Manifest
```

---

### STEP 4: Write Marketplace Listing

**Location:** Stripe Dashboard → Apps → Your App → **Listing Tab**

**Fill in all required fields:**

#### A. App Identity
| Field | Value | Length |
|-------|-------|--------|
| **Name** | DSG Governance Gate | 19/35 ✅ |
| **Category** | Risk Management | - |
| **Subtitle** | Real-time governance and compliance status on payment details | 61/80 ✅ |

#### B. Descriptions
- **Short Description (max 140 chars):**
  ```
  Gate Stripe operations. Real-time policy gating, immutable audit trails.
  ```

- **Long Description (max 4,000 chars):**
  ```
  [See LISTING_CONTENT.md for full text]
  
  DSG Governance Gate evaluates policy decisions for every Stripe 
  operation before execution. Install from Marketplace, define policies, 
  and operations are automatically gated with audit trails.
  
  Use cases:
  - FinTech: Gate fund movements between customers
  - SaaS: Require approval for refunds >$1k
  - Marketplaces: Prevent accidental mass payouts
  - Enterprise: Prove every transaction to auditors
  ```

#### C. Company & Support
| Field | Value |
|-------|-------|
| **Built By** | DSG Platform | 
| **Company Website** | https://dsg.pics |
| **Support Email** | support@dsg.pics |
| **Based In** | United States |
| **Privacy Policy** | https://dsg.pics/privacy |
| **Terms of Service** | https://dsg.pics/terms |

#### D. Visual Assets
Upload these files:
- [ ] **App Icon:** `packages/stripe-app/icon.png` (300×300 PNG)
- [ ] **Hero Image:** (2048×900px or 1920×1080px)
- [ ] **Feature Screenshots (3):**
  1. Dashboard view
  2. Gating decision view
  3. Audit trail view

#### E. Key Features (up to 3)
1. **Real-Time Policy Evaluation**
   - Title: "View policy decisions in Stripe Dashboard"
   - Description: "See ALLOW, BLOCK, or REVIEW decisions directly on payment details with policy version and proof reference"
   - Image: Screenshot of dashboard

2. **Governance Audit Trail**
   - Title: "Immutable audit trail for compliance"
   - Description: "Every decision timestamped and versioned for regulatory reporting"
   - Image: Screenshot of audit view

3. **Safe Failure Mode**
   - Title: "Never auto-allow on service outage"
   - Description: "If governance service is unreachable, shows REVIEW status to ensure maximum safety"
   - Image: Screenshot of review state

#### F. Permissions (auto-populated)
- [ ] Verify permissions display clearly
- [ ] Account and user information (read-only)
- [ ] Charges and Refunds (read-only)
- [ ] External access (DSG API communication)

#### G. Pricing
- [ ] **Free tier:** 100 gated operations/month
- [ ] **Pro:** $99/month for unlimited + analytics
- [ ] **Pricing Page URL:** https://dsg.pics/pricing

#### H. Testing Guidance
Provide step-by-step instructions for Stripe review team:

```markdown
## Installation
1. Install app from Stripe App Marketplace
2. Authorize OAuth: Click "Connect" and grant permissions
3. Configure at: https://dsg.pics/dashboard

## Testing Scenarios
1. **Policy Enforcement:**
   - Create charge <$1K → should see ALLOW
   - Create charge >$5K → should see BLOCK
   - Create charge $1K-$5K → should see REVIEW

2. **Audit Trail:**
   - View execution history with timestamps
   - Verify policy version hash
   - Export audit for compliance

3. **Error Handling:**
   - Simulate service unavailable
   - Verify shows REVIEW (not ALLOW)

## Test Credentials
Username: testuser@dsg.pics
Password: [PROVIDED SEPARATELY]
Test Account: DSG Test Org

Note: 2FA disabled for review. Contact support@dsg.pics if issues.
```

#### I. Developer Documentation
Link to public documentation:
```
https://dsg.pics/docs/stripe-app
```

Must include:
- Quick Start (5-10 min)
- API reference
- Examples (cURL, Python, JS)
- FAQ
- Troubleshooting

---

### STEP 5: Security Verification

Run final security checks:

```bash
# Check for hardcoded API keys
grep -r "sk_live\|sk_test\|pk_live\|pk_test" packages/stripe-app/src/ --include="*.ts" --include="*.js" 2>/dev/null
# Expected: No results

# Check dependencies for vulnerabilities
npm audit --audit-level=moderate
# Expected: No vulnerabilities at moderate+ level

# Verify HTTPS
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | grep -E "HTTP|ssl|TLS"
# Expected: HTTP/2, TLS version info

# Test rate limiting
for i in {1..101}; do curl -s -o /dev/null -w "%{http_code}\n" https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health; done | tail -20
# Expected: Last few requests return 429 (Too Many Requests)
```

**Security Checklist:**
- [ ] No hardcoded API keys in code
- [ ] No vulnerabilities at moderate+ level
- [ ] HTTPS/TLS 1.2+ enabled
- [ ] Security headers present (CSP, X-Content-Type-Options, etc.)
- [ ] CORS restricted (no wildcard)
- [ ] Rate limiting functional
- [ ] Input validation in place
- [ ] Webhook signature verification enabled
- [ ] Secrets stored in environment variables only
- [ ] Audit logging enabled

---

### STEP 6: Testing & Verification

#### OAuth Flow Test
```bash
# 1. Start local development
npm run dev -w packages/stripe-app

# 2. Click "Connect to Stripe" button
# 3. Authorize permissions
# 4. Verify redirect to post_install_action URL
# 5. Confirm account is linked

# Expected: App shows "Connected ✓"
```

#### Webhook Test
```bash
# Using Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks

# In another terminal, trigger event
stripe trigger charge.created

# Verify webhook received and processed
# Check logs for: "Webhook received: charge.created"
```

#### Policy Gating Test
```bash
# Test via API
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/gates/evaluate \
  -H "Content-Type: application/json" \
  -H "x-dsg-nonce: test-$(date +%s)" \
  -d '{
    "planId": "test-charge-1000",
    "riskLevel": "medium",
    "context": {
      "amount": 1000,
      "currency": "usd",
      "requirement_clear": true,
      "tool_available": true
    }
  }'

# Expected: { "decision": "ALLOW", "reason": "Within policy limits" }
```

---

### STEP 7: Submit for Review

**In Stripe Dashboard:**

1. Navigate to: **Developers** → **Apps** → **Your App** → **Listing**
2. Review all sections completed (checklist at top should be 100%)
3. Click **"Review and Publish"**
4. Review submission summary
5. Click **"Submit for Review"**
6. **Confirm:** You'll see "Submitted for Review"

**Timeline:**
- ⏱️ Stripe review takes **4 business days** typically
- 📧 You'll receive email at support@dsg.pics with:
  - ✅ Approval → Proceed to Step 8
  - ❌ Feedback → Address issues, resubmit

**What happens next:**
- Stripe team reviews:
  - App functionality ✅
  - Security & compliance ✅
  - Listing content quality ✅
  - Testing guidance accuracy ✅

---

### STEP 8: Publish (Upon Approval)

Once approved, in Stripe Dashboard:

1. Go to: **Developers** → **Apps** → **Your App**
2. Click **"Publish"**
3. Confirm final publish (point of no return)

**After Publishing:**
- ✅ App appears on Stripe App Marketplace
- ✅ Any Stripe user can discover and install
- ✅ App Analytics available within 24 hours
- ✅ Real installations and revenue begin flowing

---

## 📊 Post-Submission Checklist

### Before Submission Email
- [ ] All fields filled in Stripe Dashboard
- [ ] All assets uploaded (icon, screenshots, hero)
- [ ] Manifest validated (distribution_type=public)
- [ ] Security checks passed
- [ ] Testing guidance complete and clear
- [ ] Documentation links accessible
- [ ] Support email monitored (support@dsg.pics)

### After Submission
- [ ] Email received: "Your app has been submitted for review"
- [ ] Set reminder: Review due in 4 business days
- [ ] Monitor email for Stripe feedback
- [ ] Document any requested changes
- [ ] Prepare for quick resubmission if needed

### After Approval
- [ ] Email received: "Your app has been approved"
- [ ] Publish app via Dashboard
- [ ] Verify app appears in Stripe Marketplace
- [ ] Update internal channels (Slack, etc.)
- [ ] Prepare launch announcement
- [ ] Monitor early adoption metrics

### Post-Launch (First 30 Days)
- [ ] Track daily installs
- [ ] Monitor support emails (target: <24h response)
- [ ] Collect early feedback
- [ ] Document lessons learned
- [ ] Prepare first case study

---

## ❓ FAQ & Troubleshooting

### Q: What if Stripe rejects the submission?
**A:** 
1. Receive detailed feedback email
2. Address each issue
3. Update app/listing in Dashboard
4. Click "Resubmit for Review"
5. Wait another 4 business days

### Q: Can I change the listing after publishing?
**A:** Yes, but changes require re-review:
1. Edit listing fields
2. Update assets
3. Click "Update for Review"
4. Wait 4 business days
5. Changes published automatically upon approval

### Q: What if OAuth callback URL fails?
**A:** 
1. Verify HTTPS certificate is valid
2. Check URL is accessible: `curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback`
3. Verify no 404 errors
4. Check Vercel deployment is active
5. Update manifest if URL changed, resubmit

### Q: How do we handle support requests?
**A:** 
1. Monitor support@dsg.pics email
2. Target response time: <24 hours
3. Create FAQ from common questions
4. Update documentation
5. Track support volume for product improvements

### Q: What are the app analytics?
**A:** Available 24h after publishing via Dashboard:
- Daily installs
- Active accounts
- Gated operations count
- Popular policies
- Error rates
- User feedback/ratings

---

## 📞 Support & Escalation

**During Submission:**
- Stripe Support: support.stripe.com
- Email: support@dsg.pics
- Slack: #stripe-marketplace (internal)

**Issues to Escalate:**
- Manifest rejected by Stripe
- OAuth flow broken in production
- Security findings during review
- Stripe API changes

---

## ✅ Final Sign-Off

| Role | Verified | Signed-Off | Date |
|------|----------|-----------|------|
| **Product Lead** | ✅ All features complete | | July 1, 2026 |
| **Security Lead** | ✅ Security audit passed | | July 1, 2026 |
| **QA Lead** | ✅ All tests passed | | July 1, 2026 |
| **Legal/Compliance** | ✅ Terms & Privacy ready | | July 1, 2026 |

**Status: 🟢 READY FOR SUBMISSION**

---

**Next Steps:**
1. Follow STEP-BY-STEP SUBMISSION PROCESS above
2. Target submission date: July 2-3, 2026
3. Expected approval: July 8-10, 2026
4. Expected publish: July 10-12, 2026
