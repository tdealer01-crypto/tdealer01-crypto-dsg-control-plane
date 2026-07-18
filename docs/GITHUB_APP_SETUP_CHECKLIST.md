# GitHub Marketplace App Setup Checklist

## Creating the GitHub App (Prerequisite for Marketplace Listing)

### Phase 1: Create GitHub App in GitHub Settings

**⏱️ Time: 5 minutes**

**Location:** `https://github.com/settings/apps`

#### Step 1: Navigate to GitHub Apps
- [ ] Go to GitHub.com → **Settings** → **Developer settings** → **GitHub Apps**
- [ ] Click **"New GitHub App"**

#### Step 2: Fill in App Metadata
- [ ] **App name:** `DSG Control Plane Marketplace`
  - ⚠️ NOTE: This is different from the existing `agent-apps` GitHub App
  - Use a distinct name to avoid confusion
  
- [ ] **Homepage URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- [ ] **Webhook URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/marketplace`
- [ ] **Callback URL (for OAuth):** `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/github-app/marketplace/callback`
- [ ] **Webhook secret:** Generate and save as `GITHUB_MARKETPLACE_WEBHOOK_SECRET`

#### Step 3: Configure Permissions
Under **Permissions**:
- [ ] **Repository:**
  - `Contents`: Read-only
  - `Metadata`: Read-only
- [ ] **Organization:**
  - `Members`: Read-only (optional, for org member data)

#### Step 4: Configure Installation & User Authorization
- [ ] Check: **"Request user authorization (OAuth) during installation"**
  - This triggers the OAuth flow when users install the app
  - Our callback route (`/api/github-app/marketplace/callback`) handles this
  
- [ ] Under **"Where can this GitHub App be installed?"**
  - Select: **"Any account"** (allows both users and organizations)

#### Step 5: Save App Credentials
- [ ] **App ID:** Save as `GITHUB_MARKETPLACE_APP_ID` ✅
- [ ] **Client ID:** Save as `GITHUB_MARKETPLACE_OAUTH_CLIENT_ID` ✅
- [ ] **Client Secret:** Generate and save as `GITHUB_MARKETPLACE_OAUTH_CLIENT_SECRET` ✅
  - ⚠️ CRITICAL: Treat as secret, never commit to repo
- [ ] **Private Key:** Generate and save securely (not needed for this integration, but keep for reference)
- [ ] **Webhook Secret:** Verify saved as `GITHUB_MARKETPLACE_WEBHOOK_SECRET` ✅

#### Step 6: Complete App Details
- [ ] **Logo:** Upload the DSG marketplace logo (200×200px SVG or PNG)
  - Location: `marketplace-assets/logo-200x200.png`
  
- [ ] **Description (for GitHub):**
  ```
  AI governance and compliance platform with deterministic policy gates,
  audit trails, and integrated revenue tracking.
  ```

- [ ] **Setup URL (optional):**
  ```
  https://tdealer01-crypto-dsg-control-plane.vercel.app/marketplace/setup
  ```

#### Step 7: Webhook Configuration (Verify)
- [ ] **Webhook URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/marketplace`
- [ ] **Content Type:** `application/json`
- [ ] **SSL verification:** ✅ Enabled
- [ ] **Active:** ✅ Checked
- [ ] **Events:** Select:
  - [ ] `marketplace_purchase` (purchases, upgrades, downgrades, cancellations)

---

### Phase 2: Add Environment Variables to Vercel

**⏱️ Time: 2 minutes**

**Location:** Vercel Project Settings → Environment Variables

#### Add These Variables:
```env
GITHUB_MARKETPLACE_OAUTH_CLIENT_ID=<Client ID from GitHub App>
GITHUB_MARKETPLACE_OAUTH_CLIENT_SECRET=<Client Secret from GitHub App>
GITHUB_MARKETPLACE_WEBHOOK_SECRET=<Webhook Secret from GitHub App>
GITHUB_MARKETPLACE_APP_ID=<App ID from GitHub App>
```

- [ ] **Environments:** Apply to `Production`, `Preview`, and `Development`
- [ ] **Visibility:** All can be public except secrets (mark as restricted)
- [ ] **Redeploy:** Trigger redeployment after adding vars

---

### Phase 3: Test OAuth Flow Locally

**⏱️ Time: 5 minutes**

#### Test Setup:
- [ ] Set environment variables in `.env.local`:
  ```bash
  GITHUB_MARKETPLACE_OAUTH_CLIENT_ID=<from GitHub App>
  GITHUB_MARKETPLACE_OAUTH_CLIENT_SECRET=<from GitHub App>
  GITHUB_MARKETPLACE_WEBHOOK_SECRET=<from GitHub App>
  ```

- [ ] Start dev server: `npm run dev`
- [ ] Navigate to: `http://localhost:3000/api/github-app/marketplace/callback?code=test`
  - Expect: Error page (correct — we're testing without a real code)
  - The route should be reachable and not crash

#### Verify Route Exists:
- [ ] Check: `app/api/github-app/marketplace/callback/route.ts` ✅

---

### Phase 4: Test Webhook Handler

**⏱️ Time: 3 minutes**

#### Verify Webhook Route:
- [ ] Check: `app/api/webhooks/marketplace/route.ts` ✅
- [ ] Verify signature verification function works with GITHUB_MARKETPLACE_WEBHOOK_SECRET

#### Test with GitHub:
- [ ] In GitHub App settings, go to **"Advanced"** → **"Webhooks"**
- [ ] Click **"Recent Deliveries"**
- [ ] Look for the `ping` event (automatic test from GitHub)
  - Expect: HTTP 200 response from `/api/webhooks/marketplace`
- [ ] If no ping event, click **"Send test"** to trigger one

---

### Phase 5: Database Verification

**⏱️ Time: 2 minutes**

Verify required tables exist in Supabase:

#### Required Tables:
- [ ] `marketplace_events` — Logs all marketplace events
  - Columns: `action`, `github_login`, `github_account_id`, `plan_name`, `billing_cycle`, `event_data`, `processed_at`

- [ ] `marketplace_account_links` — Links GitHub accounts to DSG orgs
  - Columns: `github_account_id`, `github_login`, `org_id`, `installation_id`, `updated_at`

- [ ] `trial_signups` — Tracks marketplace trial signups
  - Columns: `email`, `workspace_name`, `status`, `github_account_id`, `installation_id`

#### Check Tables:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' AND table_name IN (
  'marketplace_events', 'marketplace_account_links', 'trial_signups'
);
```

If tables missing, run migrations:
```bash
npm run db:migrate -- --env production
```

---

### Phase 6: Marketplace Listing Submission

**⏱️ Time: 10 minutes**

After GitHub App is created, submit to GitHub Marketplace:

- [ ] Go to: `https://github.com/marketplace/new`
- [ ] Select the GitHub App you just created: `DSG Control Plane Marketplace`
- [ ] Fill out listing form (see: `MARKETPLACE_SUBMISSION_GITHUB.md`)
- [ ] Upload logo + 5 screenshots
- [ ] Set pricing tiers (see: `PRICING_TIERS.md`)
- [ ] Accept Marketplace Developer Agreement
- [ ] Click **"Submit for review"**

---

## Environment Variables Reference

### Required (for marketplace OAuth + webhooks)
```env
GITHUB_MARKETPLACE_OAUTH_CLIENT_ID=Iv1.xxxxx
GITHUB_MARKETPLACE_OAUTH_CLIENT_SECRET=xxxxxxxxxxx
GITHUB_MARKETPLACE_WEBHOOK_SECRET=xxxxx
GITHUB_MARKETPLACE_APP_ID=xxxxxx
```

### Optional (for reference/debugging)
```env
GITHUB_MARKETPLACE_INSTALL_URL=https://github.com/apps/dsg-control-plane-marketplace/installations/new
```

---

## Troubleshooting

### "Invalid signature" error on webhook
- ✅ Verify `GITHUB_MARKETPLACE_WEBHOOK_SECRET` is exact match
- ✅ Check webhook payload is raw body (not parsed)
- ✅ Verify signature header: `x-hub-signature-256`

### "OAuth callback failed"
- ✅ Verify `GITHUB_MARKETPLACE_OAUTH_CLIENT_ID/SECRET` are correct
- ✅ Check callback URL in GitHub App settings: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/github-app/marketplace/callback`
- ✅ Verify route exists: `app/api/github-app/marketplace/callback/route.ts`

### "Marketplace listing not appearing"
- ✅ GitHub review can take 2–5 days
- ✅ Check for rejection email from GitHub Marketplace team
- ✅ Verify all required fields completed (logo, screenshots, terms, privacy)

---

## Estimated Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| 1. Create GitHub App | 5 min | ⏳ TODO |
| 2. Add Env Vars | 2 min | ⏳ TODO |
| 3. Test OAuth locally | 5 min | ⏳ TODO |
| 4. Test Webhook | 3 min | ⏳ TODO |
| 5. Verify DB tables | 2 min | ⏳ TODO |
| 6. Submit marketplace | 10 min | ⏳ TODO |
| **Total** | **~30 min** | **Ready in 30 minutes** |

---

## Checklist Summary

- [ ] GitHub App created with correct credentials
- [ ] Environment variables added to Vercel
- [ ] OAuth flow tested locally
- [ ] Webhook handler verified
- [ ] Database tables exist
- [ ] Marketplace listing submitted for review
- [ ] Awaiting GitHub approval (2–5 days)
