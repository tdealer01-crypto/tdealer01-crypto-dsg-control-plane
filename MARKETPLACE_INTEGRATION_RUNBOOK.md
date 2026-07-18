# GitHub Marketplace Integration: Complete Runbook

## 🎯 Goal
Launch DSG Control Plane on GitHub Marketplace and generate $50K–150K ARR in first 12 months.

**Timeline:** 5 days (30-minute setup + 5 days submission + approval)

---

## 📅 Day 1: Assets & Environment Setup ✅ COMPLETE

### Deliverables
- [x] Design philosophy created: `DSG_LOGO_PHILOSOPHY.md`
- [x] SVG logo created: `marketplace-assets/logo.svg`
- [x] Screenshots guide: `docs/MARKETPLACE_SCREENSHOTS_GUIDE.md`
- [x] GitHub App setup checklist: `docs/GITHUB_APP_SETUP_CHECKLIST.md`
- [x] Pricing tiers documented: `docs/MARKETPLACE_PRICING_TIERS.md`
- [x] Environment variables template: `.env.marketplace.example`
- [x] This runbook: `MARKETPLACE_INTEGRATION_RUNBOOK.md`

### Time Required
- **Setup docs:** 10 minutes
- **Asset creation:** 15 minutes
- **Total:** ~30 minutes

### What's Ready
✅ **Backend infrastructure** (already implemented):
- OAuth callback route: `/api/github-app/marketplace/callback`
- Webhook handler: `/api/webhooks/marketplace`
- Account linking: `linkGithubMarketplaceAccount()`
- Subscription sync: `syncMarketplaceSubscription()`
- Database tables: `marketplace_events`, `marketplace_account_links`, `trial_signups`

✅ **Documentation** (just created):
- Setup instructions for GitHub App creation
- Pricing tier configuration
- Environment variable reference
- Asset capture guide

⚠️ **Still needed** (Days 2–5):
- Create GitHub App in GitHub settings (manual, 5 min)
- Capture 5 marketplace screenshots (15–30 min)
- Submit to GitHub Marketplace (10 min)
- Test webhook flow (10 min)
- Await GitHub approval (2–5 days)

---

## 📅 Day 2: GitHub App Creation & Asset Capture

### Prerequisites
- [ ] Vercel project deployed and accessible: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- [ ] Admin access to GitHub organization/account

### Step 1: Create GitHub App (5 minutes)
**Follow:** `docs/GITHUB_APP_SETUP_CHECKLIST.md` → **Phase 1: Create GitHub App**

**Quick checklist:**
- [ ] Go to `https://github.com/settings/apps`
- [ ] Click "New GitHub App"
- [ ] Fill in metadata:
  - App name: `DSG Control Plane Marketplace`
  - Homepage: `https://tdealer01-crypto-dsg-control-plane.vercel.app`
  - Webhook URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/marketplace`
  - Callback URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/github-app/marketplace/callback`
- [ ] Enable OAuth: Check "Request user authorization (OAuth) during installation"
- [ ] Set permissions: `repo:read`, `actions:read`
- [ ] Install location: "Any account"
- [ ] Generate webhook secret
- [ ] Save app credentials

**Save these credentials:**
```
GITHUB_MARKETPLACE_OAUTH_CLIENT_ID=...
GITHUB_MARKETPLACE_OAUTH_CLIENT_SECRET=...
GITHUB_MARKETPLACE_WEBHOOK_SECRET=...
GITHUB_MARKETPLACE_APP_ID=...
```

### Step 2: Add Environment Variables to Vercel (2 minutes)
**Follow:** `docs/GITHUB_APP_SETUP_CHECKLIST.md` → **Phase 2: Add Env Vars to Vercel**

- [ ] Go to Vercel Project → Settings → Environment Variables
- [ ] Add all 4 vars above
- [ ] Select: Production + Preview + Development
- [ ] Click "Save"
- [ ] Trigger redeployment

### Step 3: Test OAuth Locally (5 minutes)
**Follow:** `docs/GITHUB_APP_SETUP_CHECKLIST.md` → **Phase 3: Test OAuth Locally**

- [ ] Copy `.env.marketplace.example` to `.env.local`
- [ ] Fill in credentials from GitHub App
- [ ] Run: `npm run dev`
- [ ] Test: `curl http://localhost:3000/api/github-app/marketplace/callback?code=test`
- [ ] Expected: Error page (good — proves route exists)

### Step 4: Capture Screenshots (20–30 minutes)
**Follow:** `docs/MARKETPLACE_SCREENSHOTS_GUIDE.md`

**Screenshots needed (1280×720px each):**
1. [ ] Dashboard Overview — `/dashboard`
2. [ ] Trinity Multi-Agent System — `/dashboard/trinity`
3. [ ] Finance Governance — `/dashboard/finance-governance`
4. [ ] Compliance Evidence — `/dashboard/compliance`
5. [ ] Revenue Dashboard — `/dashboard/revenue`

**Capture workflow:**
- [ ] Deploy to production (or use live Vercel deployment)
- [ ] Open browser → DevTools (F12)
- [ ] Set viewport to 1280×720
- [ ] Navigate to each URL
- [ ] Screenshot (Cmd+Shift+5 on Mac, Shift+Win+S on Windows)
- [ ] Save to: `marketplace-assets/screenshot-N-<name>.png`
- [ ] Verify: `identify -verbose screenshot.png | grep Geometry`

**If screenshots can't be captured:**
- Use Figma mockups of the UI
- Create composite mockups from current dashboard
- Document as "representative design" in submission

### Step 5: Verify Webhook Connectivity (3 minutes)
**Follow:** `docs/GITHUB_APP_SETUP_CHECKLIST.md` → **Phase 4: Test Webhook**

- [ ] In GitHub App settings → "Advanced" → "Webhooks"
- [ ] Look for "ping" event in "Recent Deliveries"
- [ ] Verify response status: **200**
- [ ] If no ping event, click "Send test"

### Step 6: Database Verification (2 minutes)
**Follow:** `docs/GITHUB_APP_SETUP_CHECKLIST.md` → **Phase 5: Database Verification**

- [ ] Verify tables exist in Supabase:
  - `marketplace_events`
  - `marketplace_account_links`
  - `trial_signups`

**Query:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name IN (
  'marketplace_events', 'marketplace_account_links', 'trial_signups'
);
```

### ✅ Day 2 Complete When
- [x] GitHub App created + credentials saved
- [x] Environment variables added to Vercel
- [x] OAuth flow tested locally
- [x] Webhook connectivity verified
- [x] Database tables confirmed
- [x] 5 screenshots captured (1280×720px)

**Total time:** ~30 minutes

---

## 📅 Day 3: Marketplace Listing Submission

### Prerequisites
- [x] GitHub App created + credentials saved
- [x] 5 screenshots ready (1280×720px PNG/JPEG)
- [x] Logo ready (`marketplace-assets/logo-200x200.png`)

### Step 1: Submit to GitHub Marketplace (10 minutes)
**Location:** `https://github.com/marketplace/new`

- [ ] Click "New listing"
- [ ] Select GitHub App: `DSG Control Plane Marketplace`
- [ ] Fill in listing form:

#### Basic Info:
- [ ] **Listing name:** `DSG Control Plane`
- [ ] **Category:** Developer Tools
- [ ] **Secondary category:** Continuous Integration / Delivery
- [ ] **Short description (160–280 chars):**
  ```
  AI governance platform with real-time monitoring, compliance automation, 
  and integrated revenue tracking. ISO 42001, NIST AI RMF, and EU AI Act 
  ready — deterministic policy gates with cryptographic proof.
  ```
- [ ] **Long description (1000–2000 chars):**
  (See: `MARKETPLACE_SUBMISSION_GITHUB.md` for full text)

#### Legal/Support:
- [ ] **Privacy Policy URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/privacy`
- [ ] **Terms of Service URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/terms`
- [ ] **Support URL:** `https://github.com/tdealer01-crypto/tdealer01-crypto-dsg-control-plane/discussions`
- [ ] **Support email:** `support@tdealer01-crypto-dsg-control-plane.vercel.app`

#### Branding:
- [ ] **Upload logo:** `marketplace-assets/logo-200x200.png`
- [ ] Upload **5 screenshots** (1280×720px each):
  - screenshot-1-dashboard.png
  - screenshot-2-trinity.png
  - screenshot-3-finance.png
  - screenshot-4-compliance.png
  - screenshot-5-revenue.png

#### Pricing:
- [ ] Add pricing plans (see: `MARKETPLACE_PRICING_TIERS.md`):
  - Plan 1: Pro ($49/mo, 14-day trial)
  - Plan 2: Business ($199/mo, 14-day trial)
  - Plan 3: Enterprise (Contact sales)

#### Submission:
- [ ] Review GitHub Marketplace Developer Agreement
- [ ] Check all required fields completed
- [ ] Click **"Submit for review"**

### Step 2: Await GitHub Review (2–5 business days)
- [ ] GitHub sends review status email
- [ ] Expected decision: 2–5 days
- [ ] If rejected: Fix issues and resubmit
- [ ] If approved: Listing goes live

### Step 3: Monitor Submission Status
- [ ] Check email for GitHub Marketplace team communication
- [ ] If rejection: Check for specific feedback
- [ ] Common rejection reasons:
  - Screenshots too small (use 1280×720px min)
  - Privacy/Terms URL unreachable (test with curl)
  - Description too vague (add specific features/benefits)
  - Logo not professional (use your SVG logo)

### ✅ Day 3 Complete When
- [x] Marketplace listing submitted
- [x] GitHub review acknowledged (email received)
- [x] Awaiting approval (2–5 days)

**Total time:** ~10 minutes submission + 2–5 days waiting

---

## 📅 Day 4: Webhook Testing & Documentation

**Parallel to Day 3 GitHub review waiting...**

### Step 1: Complete Webhook Testing (10 minutes)
**Verify marketplace_purchase events are processed correctly:**

- [ ] Install the app from GitHub Marketplace (test install)
- [ ] Monitor webhook deliveries: GitHub App → Advanced → Webhooks → Recent Deliveries
- [ ] Verify events logged in Supabase:
  ```sql
  SELECT * FROM marketplace_events ORDER BY processed_at DESC LIMIT 5;
  ```
- [ ] Expected: `action` = 'purchased', `plan_name` = tier name
- [ ] Verify account linking in Supabase:
  ```sql
  SELECT * FROM marketplace_account_links WHERE org_id = '<test-org>';
  ```

### Step 2: Create Launch Documentation (15 minutes)

Create: `docs/MARKETPLACE_LAUNCH_GUIDE.md`
- [ ] User onboarding guide: "First 5 minutes with DSG"
- [ ] Feature walkthrough per tier
- [ ] Troubleshooting FAQ
- [ ] Support escalation flowchart

Create: `docs/MARKETPLACE_MONITORING.md`
- [ ] Metrics to track (installs, active subscriptions, churn)
- [ ] Alert thresholds
- [ ] Daily/weekly monitoring checklist
- [ ] Escalation procedures

### Step 3: Create Support Playbook (10 minutes)

Create: `docs/MARKETPLACE_SUPPORT_PLAYBOOK.md`
- [ ] Common issues and solutions
- [ ] Cancellation workflow
- [ ] Downgrade/upgrade process
- [ ] Trial extension request flow
- [ ] Feedback/review request templates

### ✅ Day 4 Complete When
- [x] Webhook events tested end-to-end
- [x] Account linking verified in Supabase
- [x] Launch guide written
- [x] Monitoring metrics defined
- [x] Support playbook created

**Total time:** ~35 minutes (parallel to GitHub review)

---

## 📅 Day 5: Approval & Go-Live

### Prerequisites
- [x] GitHub Marketplace approval received ✅

### Step 1: Publish Listing (2 minutes)
**After GitHub approval email:**

- [ ] Return to: `https://github.com/marketplace/<your-app>`
- [ ] Verify listing shows "Ready to publish"
- [ ] Click **"Publish listing"**
- [ ] Verify listing appears in GitHub Marketplace directory

### Step 2: Verify Marketplace Appearance (5 minutes)
- [ ] Search on GitHub Marketplace: "DSG Control Plane"
- [ ] Verify listing appears in results
- [ ] Click your listing and verify all content displays correctly:
  - [ ] Logo visible
  - [ ] Screenshots render
  - [ ] Pricing tiers showing
  - [ ] Install button functional
  - [ ] Support links accessible

### Step 3: Test Installation Flow (10 minutes)
**End-to-end test from GitHub Marketplace:**

1. [ ] Click "Install" on marketplace listing
2. [ ] Select test account/org
3. [ ] Grant permissions
4. [ ] Redirected to `/api/github-app/marketplace/callback`
5. [ ] Should initiate OAuth → trial signup flow
6. [ ] Verify in Supabase:
   ```sql
   SELECT * FROM trial_signups WHERE status = 'pending' 
   ORDER BY created_at DESC LIMIT 1;
   ```

### Step 4: Launch Announcement (30 minutes)
**Announce to market across channels:**

#### Twitter/X
```
🎉 DSG Control Plane is now on GitHub Marketplace!

Gate AI agents BEFORE they act.
✅ Deterministic governance + cryptographic proof
✅ EU AI Act + ISO 42001 ready
✅ $49–$199/month per tier

Free trial. No credit card. Try now:
https://github.com/marketplace/dsg-control-plane
```

#### ProductHunt
- [ ] Post: https://www.producthunt.com/posts/new
- [ ] Title: "DSG Control Plane — AI Agent Governance on GitHub"
- [ ] Tagline: "Gate AI agents before they act"
- [ ] Description: 3–5 paragraphs on features/benefits
- [ ] Thumbnail: Use logo

#### Hacker News
- [ ] Post to: https://news.ycombinator.com/newest (2pm EST for best visibility)
- [ ] Title: "Show HN: DSG Control Plane – Deterministic governance gates for AI agents"
- [ ] (Link to GitHub Marketplace or your landing page)

#### Dev.to Blog
- [ ] Write: "Introducing DSG Control Plane on GitHub Marketplace"
- [ ] Include feature overview, screenshots, pricing info
- [ ] CTA: "Install now on GitHub Marketplace"

#### Email/Slack Communities
- [ ] AI governance Slack communities
- [ ] Dev tool enthusiast communities
- [ ] Compliance/security focused groups
- [ ] Message: Short intro + link to marketplace

### Step 5: Monitor Initial Metrics (10 minutes)
**First 24 hours:**

- [ ] GitHub Marketplace Insights → Check install count
- [ ] Supabase queries:
  ```sql
  SELECT COUNT(*) as total_installs FROM marketplace_events 
  WHERE action = 'purchased' AND created_at > NOW() - INTERVAL '24 hours';
  
  SELECT COUNT(*) as total_signups FROM trial_signups 
  WHERE created_at > NOW() - INTERVAL '24 hours';
  ```
- [ ] Monitor webhook delivery status
- [ ] Check for support requests
- [ ] Respond to ProductHunt/HN comments

### Step 6: Setup Ongoing Monitoring (5 minutes)
- [ ] Set daily digest email from GitHub Marketplace Insights
- [ ] Create Slack channel: #marketplace-metrics
- [ ] Setup Supabase monitoring alerts
- [ ] Schedule weekly review meeting

### ✅ Day 5 Complete When
- [x] Marketplace listing published
- [x] Installation flow tested end-to-end
- [x] Launch announcements published (all channels)
- [x] Initial metrics monitored
- [x] Support team alerted + playbooks distributed

**Total time:** ~60 minutes actions + async announcements

---

## 🎯 Success Metrics (Month 1)

| Metric | Target | Action if missed |
|--------|--------|------------------|
| **Marketplace installs** | 10–20 | Increase marketing outreach |
| **Trial conversions** | 3–5 paying customers | Improve onboarding docs |
| **MRR generated** | $200–500 | Optimize pricing or feature messaging |
| **Support requests** | <10 tickets | Improve self-service docs |
| **Churn rate** | <5% | Customer calls for feedback |

---

## 💰 Revenue Projections

### Month 1–3 (Launch phase)
- Installs: 10–50
- Paying customers: 3–10
- MRR: $200–$2,000
- Focus: Stabilize + gather feedback

### Month 4–6 (Growth phase)
- Installs: 100–200
- Paying customers: 20–50
- MRR: $2K–$5K
- Focus: Optimize conversion + expand awareness

### Month 7–12 (Scaling)
- Installs: 500–1000
- Paying customers: 80–150
- MRR: $5K–$12K
- Focus: Enterprise sales + partnerships

### Year 1 Total ARR: $50K–150K (conservative)

---

## 🚨 Troubleshooting

### "Marketplace listing not appearing after approval"
- [ ] Verify "Publish" button clicked (not just "Submit")
- [ ] Wait 1–2 hours for indexing
- [ ] Clear GitHub cache (Incognito window)
- [ ] Contact GitHub Marketplace team

### "Webhook events not arriving"
- [ ] Verify webhook URL in GitHub App settings is exactly: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/marketplace`
- [ ] Check webhook secret matches GITHUB_MARKETPLACE_WEBHOOK_SECRET
- [ ] Review GitHub App logs for delivery status
- [ ] Verify Supabase is accessible (check network)

### "OAuth callback fails"
- [ ] Verify CLIENT_ID/SECRET in Vercel env vars
- [ ] Test in Incognito (bypass auth cookies)
- [ ] Check redirect URL in GitHub App: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/github-app/marketplace/callback`
- [ ] Review server logs: `npm run logs -- --tail 50`

### "Pricing not displaying in marketplace"
- [ ] Verify all pricing plans added in listing form
- [ ] Refresh marketplace listing page
- [ ] GitHub typically displays prices within 1 hour

---

## 📚 Related Documents

- `docs/GITHUB_APP_SETUP_CHECKLIST.md` — Step-by-step GitHub App setup
- `docs/MARKETPLACE_SCREENSHOTS_GUIDE.md` — How to capture marketplace screenshots
- `docs/MARKETPLACE_PRICING_TIERS.md` — Pricing tier configuration
- `MARKETPLACE_SUBMISSION_GITHUB.md` — Listing copy templates
- `.env.marketplace.example` — Environment variables reference

---

## 🎯 Final Checklist

**Day 1: Setup** ✅
- [x] Documentation created
- [x] Logo designed
- [x] Environment template provided

**Day 2: GitHub App & Assets**
- [ ] GitHub App created + credentials saved
- [ ] Environment variables added to Vercel
- [ ] Screenshots captured (1280×720px)
- [ ] Webhook tested locally
- [ ] Database verified

**Day 3: Submission**
- [ ] Marketplace listing submitted to GitHub
- [ ] Awaiting approval (2–5 days)

**Day 4: Documentation**
- [ ] Webhook testing complete
- [ ] Launch guide created
- [ ] Support playbook ready
- [ ] Monitoring configured

**Day 5: Go-Live**
- [ ] GitHub approval received
- [ ] Listing published on marketplace
- [ ] Install flow tested end-to-end
- [ ] Launch announcements published
- [ ] Initial metrics monitored

---

**🚀 Expected Go-Live: 5 calendar days from Day 1**

**📊 Expected Revenue Impact: $50K–150K ARR in first 12 months**
