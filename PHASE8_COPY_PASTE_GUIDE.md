# Phase 8: Complete Copy-Paste Setup Guide
## Copy → Paste → Done ✅

**Time:** 45 minutes total  
**Format:** All commands ready to copy-paste  

---

## 📋 PREPARATION (5 min)

### Step 0: Gather Your Credentials

**Go collect these 11 values:**

#### From Stripe Dashboard (https://dashboard.stripe.com)

1. **API Keys** section:
   ```
   Live Secret Key: sk_live_XXXXXXXXXXXXXXXX
   Live Publishable Key: pk_live_XXXXXXXXXXXXXXXX
   ```

2. **Apps → OAuth** section:
   ```
   Client ID: ca_XXXXXXXXXXXXXXXX
   Client Secret: [will generate]
   ```

3. **Webhooks** section:
   ```
   Webhook Secret: whsec_live_XXXXXXXXXXXXXXXX (after creating endpoint)
   ```

#### From Supabase Dashboard (https://app.supabase.com)

4. **Settings → API** section:
   ```
   Project URL: https://XXXXXXXXXX.supabase.co
   Anon Key: eyJXXXXXXXXXXXXX...
   Service Role Key: eyJXXXXXXXXXXXXX...
   ```

#### From Upstash Console (https://console.upstash.com) - Optional

5. **Redis Database**:
   ```
   UPSTASH_REDIS_URL: redis://default:XXXXXXXXXX@XXXXXXXXXX:XXXXX
   ```

#### From DSG Control Plane

6. **DSG API Key**:
   ```
   DSG_API_KEY: dsg_XXXXXXXXXXXXXXXX
   ```

---

## ⚙️ SETUP (10 min)

### Step 1: Create .env.local Locally

**在本地创建环境文件 (Create on your local machine):**

```bash
cat > .env.local << 'EOF'
STRIPE_API_KEY=sk_live_PASTE_YOUR_STRIPE_SECRET_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_PASTE_YOUR_STRIPE_PUBLISHABLE_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_live_PASTE_YOUR_WEBHOOK_SECRET_HERE
STRIPE_OAUTH_CLIENT_ID=ca_PASTE_YOUR_OAUTH_CLIENT_ID_HERE
STRIPE_OAUTH_CLIENT_SECRET=PASTE_YOUR_OAUTH_CLIENT_SECRET_HERE
SUPABASE_URL=https://PASTE_YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=PASTE_YOUR_SUPABASE_ANON_KEY_HERE
SUPABASE_SERVICE_ROLE_KEY=PASTE_YOUR_SERVICE_ROLE_KEY_HERE
UPSTASH_REDIS_URL=redis://default:PASTE_YOUR_REDIS_URL_HERE
DSG_API_KEY=dsg_PASTE_YOUR_DSG_API_KEY_HERE
NODE_ENV=production
EOF
```

**Verify created:**
```bash
cat .env.local
```

### Step 2: Validate Environment

**Run this to check everything:**
```bash
./scripts/validate-stripe-config.sh
```

**Expected output:** ✅ All checks pass

### Step 3: Prepare for Vercel

**Show env vars ready for Vercel Dashboard:**
```bash
./scripts/env-to-vercel.sh
```

**Output will show:**
```
STRIPE_API_KEY=sk_live_XXX
STRIPE_PUBLISHABLE_KEY=pk_live_XXX
... (all 11 variables)
```

---

## 🚀 VERCEL SETUP (15 min - Browser)

### Step 4: Create Vercel Project

**在浏览器中做 (Do in browser):**

1. Go to: https://vercel.com/dashboard
2. Click **"Add New"** → **"Project"**
3. Search for: **`tdealer01-crypto-dsg-control-plane`**
4. Click Import
5. Configure:
   - Framework: **Next.js**
   - Root Directory: **.**
   - Build Command: **npm run build**
   - Output Directory: **.next**
   - Install Command: **npm ci**
6. Click **"Deploy"**
7. ⏳ Wait 2-3 minutes for build to complete
8. Copy the URL shown: `https://[app-name].vercel.app`

**Save it:**
```bash
export VERCEL_URL="https://YOUR_APP_NAME.vercel.app"
echo $VERCEL_URL
```

### Step 5: Add Environment Variables to Vercel

**在浏览器中做 (Do in browser):**

1. Go to Vercel Dashboard
2. Click your project
3. Click **"Settings"**
4. Click **"Environment Variables"**
5. For each variable below:
   - Paste Name (left side)
   - Paste Value (right side)
   - Select **"Production"**
   - Click **"Save"**

**Copy-paste these 11 pairs:**

```
Name: STRIPE_API_KEY
Value: sk_live_YOUR_ACTUAL_KEY_HERE

Name: STRIPE_PUBLISHABLE_KEY
Value: pk_live_YOUR_ACTUAL_KEY_HERE

Name: STRIPE_WEBHOOK_SECRET
Value: whsec_live_YOUR_ACTUAL_SECRET_HERE

Name: STRIPE_OAUTH_CLIENT_ID
Value: ca_YOUR_ACTUAL_ID_HERE

Name: STRIPE_OAUTH_CLIENT_SECRET
Value: YOUR_ACTUAL_SECRET_HERE

Name: SUPABASE_URL
Value: https://YOUR_PROJECT.supabase.co

Name: SUPABASE_ANON_KEY
Value: YOUR_ACTUAL_ANON_KEY_HERE

Name: SUPABASE_SERVICE_ROLE_KEY
Value: YOUR_ACTUAL_SERVICE_ROLE_KEY_HERE

Name: UPSTASH_REDIS_URL
Value: redis://default:YOUR_ACTUAL_URL_HERE

Name: DSG_API_KEY
Value: dsg_YOUR_ACTUAL_KEY_HERE

Name: NODE_ENV
Value: production
```

### Step 6: Redeploy

**在浏览器中做 (Do in browser):**

1. Go to Vercel Dashboard → **"Deployments"**
2. Click the latest deployment
3. Click **"Redeploy"**
4. ⏳ Wait 1-2 minutes for build to complete
5. Status should show: **"Ready"** ✅

---

## 🔌 STRIPE WEBHOOKS (5 min - Browser)

### Step 7: Create Webhook Endpoint

**在浏览器中做 (Do in browser):**

1. Go to: https://dashboard.stripe.com/webhooks
2. Click **"Add Endpoint"**
3. Paste this URL:
   ```
   https://YOUR_VERCEL_URL/api/stripe/webhook/events
   ```
   (Replace `YOUR_VERCEL_URL` with your actual URL from Step 4)

4. Select these 5 events:
   - ✓ charge.created
   - ✓ charge.updated
   - ✓ payout.created
   - ✓ payout.updated
   - ✓ refund.created

5. Click **"Add Endpoint"**
6. On the next screen, Stripe shows: **"Signing secret"**
7. Click **"Reveal"**
8. Copy the secret (starts with `whsec_live_`)
9. Update .env.local:
   ```bash
   sed -i "s/whsec_live_.*/whsec_live_YOUR_NEW_SECRET_HERE/" .env.local
   ```

---

## 🔐 STRIPE OAUTH (5 min - Browser)

### Step 8: Configure OAuth Redirect URIs

**在浏览器中做 (Do in browser):**

1. Go to: https://dashboard.stripe.com/settings/oauth
2. Find **"Redirect URIs"** section
3. Add these 2 URLs:
   ```
   https://YOUR_VERCEL_URL/api/stripe/oauth/callback
   https://YOUR_VERCEL_URL/stripe/oauth/callback
   ```
   (Replace `YOUR_VERCEL_URL` with your actual URL)

4. Click **"Save"**

---

## ✅ VERIFICATION (10 min - Local)

### Step 9: Quick Health Check

**Run locally:**
```bash
./scripts/quick-health-check.sh https://YOUR_VERCEL_URL
```

**Expected output:**
```
✓ Health endpoint: OK
✓ Status: ok
✓ Environment: production
✓ Database: connected
✓ Redis: connected
```

### Step 10: Full Deployment Check

**Run locally:**
```bash
./scripts/full-deployment-check.sh https://YOUR_VERCEL_URL
```

**Expected output:**
```
✓ Vercel deployment is Ready
✓ All environment variables present
✓ Health endpoint responding
✓ Stripe API key valid
✓ Database connected
... (15 checks total)

GO DECISION: ✅ GREEN - Ready for launch
```

### Step 11: Test Webhook Delivery

**Run locally:**
```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://YOUR_VERCEL_URL/api/stripe/webhook/events \
  --secret whsec_live_YOUR_WEBHOOK_SECRET
```

**Expected output:**
```
✓ Sending webhook...
✓ HTTP 200 response received
✓ Webhook successfully delivered
```

### Step 12: Verify in Audit Trail

**Run locally:**
```bash
./scripts/verify-webhook-received.sh --wait --timeout 30
```

**Expected output:**
```
✓ Webhook event found in audit trail
✓ Decision recorded: ALLOW
✓ Verification complete
```

---

## 🎉 DONE!

**When ALL checks pass ✅:**

1. `quick-health-check.sh` → Shows all **green**
2. `full-deployment-check.sh` → Shows **GO**
3. Webhook test → Shows **delivered**
4. Audit trail → Shows **event recorded**

**Then:** Phase 8 is **COMPLETE** ✅

---

## 📞 TROUBLESHOOTING

### If health check fails:
```bash
# Check Vercel logs
curl -s https://YOUR_VERCEL_URL/api/agent/status | jq .

# Check environment variables
curl -s https://YOUR_VERCEL_URL/api/readiness | jq .
```

### If webhook test fails:
```bash
# Verify webhook secret is correct
grep STRIPE_WEBHOOK_SECRET .env.local

# Check Vercel logs for signature errors
# Dashboard → Deployments → Latest → Runtime logs
```

### If any script fails:
```bash
# Check .env.local is correct
cat .env.local

# Verify Vercel URL is correct (no typos)
echo "URL is: $VERCEL_URL"
```

---

## ✨ SUMMARY

| Step | Action | Time | Status |
|------|--------|------|--------|
| 0 | Gather 11 credentials | 5 min | 📋 |
| 1-3 | Create & validate .env.local | 10 min | ✅ |
| 4-6 | Vercel setup & redeploy | 15 min | 🚀 |
| 7-8 | Stripe config (webhooks + OAuth) | 10 min | 🔌 |
| 9-12 | Verify everything works | 10 min | ✅ |
| **TOTAL** | **Ready for production** | **50 min** | **GO** |

---

**Start with Step 0: Gather your 11 credentials 👆**

Then follow Steps 1-12 in order.

Reference: https://claude.ai/code/session_01TSwfdBaYLgXoNfRy2W1Uhq
