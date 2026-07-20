# Stripe Marketplace Resubmission — DSG ONE

## Overview

Updated app manifest and branding for Stripe Marketplace. This document covers the resubmission process, pricing configuration, and required assets.

---

## Changes from Previous Submission

### Manifest Updates (`packages/stripe-app/stripe-app.json`)
- ✅ **App Name:** "DSG ONE - Control Plane for AI Operations"
- ✅ **Description:** Simplified, results-focused (Monitor/Verify/Audit/Optimize)
- ✅ **Short Description:** "Monitor. Verify. Audit. Optimize. One platform for AI accountability."
- ✅ **Features:** Remapped to 4 Pillars with business-focused descriptions
- ✅ **UI Extension Title:** "DSG ONE - Policy Verification"

### Version
- Current: `2.6.1` (maintain existing)

---

## Pricing Configuration for Stripe Dashboard

**Note:** Stripe app pricing is configured in the **Stripe Dashboard** (not in manifest). Follow these steps after app approval:

### Tier 1: DSG ONE Free
- **Monthly Price:** $0
- **Billing Period:** Monthly
- **Description:** "Try DSG ONE risk-free. 5 audit logs/month, limited replay capability."
- **Features Included:**
  - 5 audit logs per month
  - Limited replay capability
  - Stripe integration only
  - Email support

### Tier 2: DSG ONE
- **Monthly Price:** $99 USD
- **Billing Period:** Monthly
- **Description:** "Everything included. Unlimited policies, audits, replays, integrations, approvals, dashboards."
- **Features Included:**
  - Unlimited policies
  - Unlimited audit logs (queryable, exportable)
  - Unlimited replay (rerun any decision for testing)
  - Unlimited integrations (Stripe, OpenAI, GitHub, MCP, etc.)
  - Unlimited approvals (human sign-off workflows)
  - Unlimited dashboards & alerts
  - Unlimited evidence export (JSON, CSV, PDF)
  - Priority email support (24hr response)

### Pricing Setup Steps
1. Log into Stripe Dashboard → Apps
2. Select "DSG ONE - Control Plane for AI Operations"
3. Navigate to **App Billing**
4. Click **Add Pricing Tier**
5. Create **Free Tier:** $0/month (5 audits/mo, limited replay)
6. Create **Pro Tier:** $99/month (unlimited)
7. Set both as "Available to Install"
8. Save and Test

---

## Asset Checklist

### Screenshots (Required for Marketplace Listing)

| Screenshot | Purpose | File | Status |
|-----------|---------|------|--------|
| **Listing 1** | Monitor Pillar | `/public/stripe-listing-1-allow.png` | ✅ Exists |
| **Listing 2** | Verify Pillar | `/public/stripe-listing-2-review.png` | ✅ Exists |
| **Listing 3** | Audit Pillar | `/public/stripe-listing-3-block.png` | ✅ Exists |
| **Listing 4** | Optimize Pillar | `/public/stripe-listing-4-optimize.png` | ❓ Check if exists |

**Action:** Verify screenshot 4 exists. If not, create/upload.

### Icon
- **File:** `packages/stripe-app/icon.png`
- **Required:** ✅ Already in place
- **Size:** Should be 256×256px or 512×512px
- **Format:** PNG with transparency

### Branding Materials
- Logo: ✅ Ready
- Color scheme: ✅ Updated in docs
- Tagline: "Don't trust AI. Verify every decision." ✅

---

## Resubmission Checklist

### Pre-Submission
- [ ] Verify manifest is valid JSON: `npm run verify:stripe-manifest` (if available)
- [ ] Check all image URLs are live: curl each stripe-listing-*.png URL
- [ ] Confirm support email is active: support@dsg.pics
- [ ] Test OAuth redirect URIs in Stripe Dashboard
- [ ] Verify app works in sandbox mode

### Submission Form Fields

**App Name:**
```
DSG ONE - Control Plane for AI Operations
```

**Short Description:**
```
Monitor. Verify. Audit. Optimize. One platform for AI accountability.
```

**Full Description:**
```
Don't trust AI. Verify every decision.

DSG ONE is the control plane for AI operations across your entire 
organization. Monitor every action. Verify before execution. Audit 
and replay proof. Optimize costs.

👀 Monitor — See every AI operation in your live dashboard. Real-time 
events, usage tracking, and alerts for high-risk decisions.

✅ Verify — Prevent mistakes before AI acts. Policy enforcement gates 
every decision. Human approval for critical operations.

📜 Audit — Prove every decision. Tamper-proof audit trail with 
SHA-256 hashing. Replay any decision years later.

📈 Optimize — Control costs and reduce risk. Track AI spending by 
provider. Get insights to prevent budget surprises.

Works with: Stripe, OpenAI, Anthropic, GitHub, Slack, MCP, OpenRouter, 
and more.

Pricing: Free tier ($0) with limited features. DSG ONE ($99/month) 
includes everything.

Every AI decision has an owner. DSG ONE proves it.
```

**Website URL:**
```
https://dsg.pics
```

**Documentation URL:**
```
https://dsg.pics/docs/stripe-app
```

**Support Email:**
```
support@dsg.pics
```

**Category:**
```
Finance & Compliance / Risk Management / Governance
```

**Key Features:**
1. Real-time monitoring of all AI operations
2. Policy enforcement + human approval workflows
3. Tamper-proof audit trail with replay capability
4. Secret & credential protection
5. Cost tracking & spending control
6. Evidence-based compliance export
7. Pre-integrated with major AI platforms
8. Extensible REST API for custom integrations

---

## Testing Checklist

### Functionality Tests
- [ ] App installs successfully (sandbox & prod)
- [ ] OAuth flow completes without errors
- [ ] Policy evaluation displays on payment detail page
- [ ] Decisions (ALLOW/REVIEW/BLOCK) render correctly
- [ ] Audit trail records decisions
- [ ] Export functionality works (JSON/CSV)

### Stripe Integration Tests
- [ ] App reads charge/refund events
- [ ] Policy gates decisions before Stripe executes
- [ ] Webhook handler processes all event types
- [ ] Rate limiting doesn't block valid requests
- [ ] Error handling shows user-friendly messages

### Security Tests
- [ ] No secrets exposed in logs
- [ ] OAuth tokens handled securely
- [ ] CSP headers enforced
- [ ] CORS properly configured
- [ ] Input validation prevents injection attacks

---

## Approval Timeline

| Phase | Timeline | Owner |
|-------|----------|-------|
| Submit to Stripe | Now | DSG Team |
| Stripe Review | 3-7 days | Stripe |
| Security Audit | 1-2 days | Stripe Security |
| Approval | TBD | Stripe |
| Live on Marketplace | Upon approval | Automatic |

---

## Post-Approval Tasks

### Day 1: Launch Announcement
- [ ] Email existing users: "DSG ONE now on Stripe Marketplace"
- [ ] Update website homepage with Marketplace badge
- [ ] Post on company blog: "DSG ONE Launch"
- [ ] Social media announcement (if applicable)

### Week 1: Monitor Metrics
- [ ] Track installs (dashboard in Stripe)
- [ ] Monitor conversion rate (free → paid)
- [ ] Check support emails for issues
- [ ] Gather customer feedback

### Week 2-4: Iterate
- [ ] A/B test messaging if install rate < 100/month
- [ ] Address any support issues
- [ ] Plan roadmap updates (Unified AI Inventory, etc.)

---

## Troubleshooting Common Issues

### Issue: Screenshots not displaying in Stripe preview
**Solution:** Verify image URLs are public and HTTPS. Test with curl:
```bash
curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe-listing-1-allow.png
```
Should return 200 OK.

### Issue: OAuth redirect fails
**Solution:** Ensure redirect URIs in manifest match Stripe Dashboard settings:
- `https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback`
- `https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback`

### Issue: CSP errors in browser console
**Solution:** Verify `content_security_policy` in manifest includes all required domains:
```json
"connect-src": [
  "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/",
  "https://dsg-stripe-app.vercel.app/api/",
  "https://api.dsg.pics/v1/"
]
```

### Issue: Pricing tiers not showing
**Solution:** Tiers are configured in **Stripe Dashboard**, not manifest. After app is approved, configure in Dashboard → Apps → DSG ONE → App Billing.

---

## Success Metrics

| Metric | Target (Month 1) | Target (Month 3) |
|--------|---|---|
| Marketplace installs | 50+ | 100+ |
| Free → paid conversion | 15-20% | 20-25% |
| MRR from app | $400+ | $1,500+ |
| Support tickets | <5 | <10 |
| Customer satisfaction | 4.5+ stars | 4.7+ stars |

---

## Next Steps

1. **Pre-Submission Check** (Today)
   - [ ] Verify manifest JSON validity
   - [ ] Test all URLs (screenshots, support, docs)
   - [ ] Confirm OAuth endpoints work

2. **Submit to Stripe** (This week)
   - [ ] Log into Stripe Dashboard
   - [ ] Select "DSG ONE" app
   - [ ] Click "Resubmit to Marketplace"
   - [ ] Fill in form fields (see checklist above)
   - [ ] Upload screenshots if needed
   - [ ] Submit for review

3. **Await Approval** (3-7 days)
   - [ ] Monitor email for Stripe feedback
   - [ ] Prepare announcement materials
   - [ ] Test in sandbox during review period

4. **Launch & Monitor** (Post-approval)
   - [ ] Announce to users
   - [ ] Track install/conversion metrics
   - [ ] Support early customers
   - [ ] Plan roadmap features

---

## Contact & Support

- **Marketplace Manager:** (Assign point person)
- **Tech Support:** support@dsg.pics
- **Sales Inquiries:** sales@dsg.pics
- **Security Issues:** security@dsg.pics

---

**Last Updated:** July 20, 2026  
**Status:** Ready for Stripe Resubmission
