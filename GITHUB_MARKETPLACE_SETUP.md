# GitHub Marketplace Listing Setup Guide

Step-by-step guide to list DSG Control Plane on GitHub Marketplace.

---

## Overview

GitHub Marketplace allows you to share apps and actions with the GitHub community. Listing DSG Control Plane enables discovery by developers and teams looking for AI governance tooling.

**Expected timeline**: 2–5 business days for review and approval.

---

## Prerequisites

Before starting, have the following ready:

- [ ] GitHub App created (or OAuth App)
- [ ] App logo (minimum 200×200px, PNG or SVG)
- [ ] At least 3 screenshots (minimum 1280×640px)
- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Support contact email or URL
- [ ] Compelling description (160–280 characters for short, 1000–2000 characters for long)
- [ ] Pricing plan details

---

## Step 1: Create a GitHub App

1. Go to **GitHub → Settings → Developer Settings → GitHub Apps**
   - URL: `https://github.com/settings/apps`
2. Click **"New GitHub App"**
3. Fill in the required fields:
   - **App name**: `DSG Control Plane`
   - **Homepage URL**: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
   - **Webhook URL**: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/github`
   - **Callback URL** (for OAuth): `https://tdealer01-crypto-dsg-control-plane.vercel.app/auth/callback`
4. Set required **permissions**:
   - Repository: Read-only (contents, metadata)
   - Actions: Read (for CI integration)
5. Set **"Where can this GitHub App be installed?"** to `Any account`
6. Click **"Create GitHub App"**

> Note: Save the App ID and generate a private key — these are needed for webhook verification.

---

## Step 2: Add App to GitHub Marketplace

1. Go to your GitHub App settings:
   - `https://github.com/settings/apps/<your-app-name>`
2. In the left sidebar, click **"Marketplace listing"**
3. Click **"Create draft listing"**

---

## Step 3: Fill In the Marketplace Listing

### 3.1 Basic Information

| Field | Value |
|-------|-------|
| **Listing name** | DSG Control Plane |
| **Short description** | AI governance platform with real-time monitoring, compliance automation, and integrated revenue tracking |
| **Category** | Developer Tools |
| **Secondary category** | Continuous Integration / Delivery |
| **Support URL** | `https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/discussions` |
| **Support email** | (your support email) |
| **Privacy Policy URL** | `https://tdealer01-crypto-dsg-control-plane.vercel.app/privacy` |
| **Terms of Service URL** | `https://tdealer01-crypto-dsg-control-plane.vercel.app/terms` |

### 3.2 App Logo

1. Prepare a logo file:
   - Format: PNG or SVG
   - Size: minimum 200×200px (square)
   - Background: solid or transparent
   - Style: professional, legible at small sizes
2. In the listing editor, click **"Upload logo"**
3. Upload both light and dark variants if supported

### 3.3 Screenshots

Add at least 3 screenshots (maximum 10):

1. **Dashboard Overview** — `/dashboard` showing governance status widgets
2. **Revenue Metrics** — `/dashboard/revenue` showing KPI cards
3. **Trinity Agent System** — `/dashboard/trinity` showing the 5-agent orchestration
4. **Finance Governance** — `/finance-governance` showing payment controls
5. **Pricing Page** — `/pricing` showing tier cards with CTAs

Screenshot requirements:
- Minimum size: 1280×640px
- Format: PNG or JPEG
- Show real UI, not mockups

### 3.4 Short Description (160–280 characters)

```
AI governance platform with real-time monitoring, compliance automation, and integrated revenue tracking. ISO 42001, NIST AI RMF, EU AI Act ready.
```

### 3.5 Long Description (1000–2000 characters)

```
DSG Control Plane is a production-grade AI governance and execution platform 
for regulated industries.

CORE FEATURES:
• Trinity AI Multi-Agent System — 5-agent orchestration with deterministic 
  policy gating and cryptographic proof per execution
• Finance Governance — AI-enforced payment approval gates with multi-step 
  workflows and real-time fraud prevention
• AI Compliance — ISO 42001, NIST AI RMF, and EU AI Act controls with 
  automated evidence collection
• Delivery Proof — AI code proof reports with shareable links and 
  production readiness scoring
• Stripe Integration — Subscription management, quota billing, and 
  real-time revenue KPI dashboard
• Audit Trails — Complete execution lineage with cryptographic hashes 
  (SHA-256 planHash, proofHash, auditHash)

DESIGNED FOR:
Regulated industries, enterprise AI teams, and developers who need 
deterministic governance — not just logging.

SETUP IN 5 MINUTES:
Deploy to Vercel → Connect Supabase → Set Stripe keys → Done. 
No migration required. Works with any existing repository.

PRICING:
Free → Pro ($49/mo) → Business ($199/mo) → Enterprise (custom)
14-day free trial on all paid tiers.
```

---

## Step 4: Configure Pricing Plans

1. In the listing editor, go to **"Pricing and setup"**
2. Click **"Add a plan"** for each tier:

### Free Plan
- **Name**: Free
- **Monthly price**: $0
- **Description**: Trial tier with 1 Delivery Proof scan/month
- **Features**: Basic governance, audit trail (30 days)

### Pro Plan
- **Name**: Pro
- **Monthly price**: $49
- **Unit**: per month
- **Description**: Unlimited Delivery Proof scans + priority support
- **Free trial**: 14 days

### Business Plan
- **Name**: Business
- **Monthly price**: $199
- **Unit**: per month
- **Description**: Unlimited scans + full governance features + compliance exports
- **Free trial**: 14 days

### Enterprise Plan
- **Name**: Enterprise
- **Monthly price**: Contact us
- **Description**: Unlimited everything + SLA + dedicated support

---

## Step 5: Set Up Support

1. Add a **Support URL** pointing to GitHub Discussions:
   ```
   https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/discussions
   ```
2. Optionally add a support email address
3. Ensure the Discussions tab is enabled on the repository

---

## Step 6: Submit for Review

1. Complete all required fields in the listing editor
2. Review the **GitHub Marketplace Developer Agreement**
3. Click **"Submit for review"**
4. GitHub will review within 2–5 business days

### What GitHub Reviews

- [ ] App metadata is complete and accurate
- [ ] Screenshots show real functionality
- [ ] Privacy Policy and Terms of Service are accessible
- [ ] App can be installed successfully
- [ ] Description is clear and not misleading
- [ ] Pricing plans are clearly defined

---

## Step 7: Activate Listing

After approval:

1. GitHub sends an approval email
2. Return to the listing editor
3. Click **"Publish listing"** to make it live
4. Your app appears in the GitHub Marketplace directory

---

## Post-Launch Checklist

- [ ] Verify listing appears at `https://github.com/marketplace/<app-name>`
- [ ] Test install flow end-to-end
- [ ] Confirm webhook delivery from GitHub App events
- [ ] Monitor `Insights` tab in GitHub App settings for installs
- [ ] Respond to any marketplace feedback within 24 hours

---

## Common Rejection Reasons

| Reason | Fix |
|--------|-----|
| Screenshots too small | Use minimum 1280×640px images |
| Privacy Policy unreachable | Ensure the URL returns 200 OK |
| Description too vague | Be specific about features and benefits |
| Pricing unclear | Add clear tier names and prices |
| App not installable | Test installation flow before submitting |

---

## Resources

- [GitHub Marketplace documentation](https://docs.github.com/en/apps/publishing-apps-to-github-marketplace)
- [GitHub App setup guide](https://docs.github.com/en/apps/creating-github-apps)
- [Marketplace pricing guide](https://docs.github.com/en/apps/publishing-apps-to-github-marketplace/setting-pricing-plans-for-your-listing)
