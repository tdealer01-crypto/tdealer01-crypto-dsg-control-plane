# DSG Governance Gate — Marketplace Configuration Guide

## Quick Start: Pre-Submission Checklist

### 1. Manifest Configuration
```bash
# Verify stripe-app.json syntax
stripe apps validate stripe-app.json

# Check OAuth URIs (no localhost in production)
grep -E "localhost" stripe-app.json  # Should return no matches
```

**Files to verify:**
- ✅ `stripe-app.json` — Production manifest
- ✅ `stripe-app.prod.json` — Production-specific overrides
- ✅ `stripe-app.dev.json` — Development overrides

### 2. Required URLs (Must Be Live)
| URL | Purpose | Status |
|-----|---------|--------|
| https://dsg.pics | Website | ⏳ Verify live |
| https://dsg.pics/privacy | Privacy policy | ⏳ Verify live |
| https://dsg.pics/terms | Terms of service | ⏳ Verify live |
| https://dsg.pics/docs/stripe-app | Documentation | ⏳ Verify live |
| https://dsg.pics/pricing | Pricing details | ⏳ Verify live |
| https://tdealer01-crypto-dsg-control-plane.vercel.app/api/ | DSG API (primary) | ✅ Live |
| https://dsg-stripe-app.vercel.app/api/ | DSG API (fallback) | ✅ Live |

**Verification Command:**
```bash
# Test all URLs
for url in \
  "https://dsg.pics" \
  "https://dsg.pics/privacy" \
  "https://dsg.pics/terms" \
  "https://dsg.pics/docs/stripe-app" \
  "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health"; do
  echo "Testing $url..."
  curl -s -o /dev/null -w "HTTP %{http_code}\n" "$url"
done
```

### 3. Icon & Feature Images

**Icon Requirements:**
- Path: `packages/stripe-app/icon.png`
- Size: 300x300 pixels ✅
- Format: PNG with transparency ✅
- File size: < 10MB ✅

**Feature Images (CDN):**
Each feature requires a high-quality image (min 1600px wide, max 10MB PNG/JPG):

1. **Policy Enforcement** 
   - Current URL: https://cdn.dsg.pics/stripe-app/policy-enforcement.png
   - Screenshot shows: Policy decision badge in payment detail view
   - Status: ⏳ Verify live on CDN

2. **Governance Audit Trail**
   - Current URL: https://cdn.dsg.pics/stripe-app/audit-trail.png
   - Screenshot shows: Audit trail list with timestamps and policy versions
   - Status: ⏳ Verify live on CDN

3. **Safe Failure Mode**
   - Current URL: https://cdn.dsg.pics/stripe-app/fallback-mode.png
   - Screenshot shows: REVIEW decision during service interruption
   - Status: ⏳ Verify live on CDN

**CDN Verification Command:**
```bash
for img in \
  "https://cdn.dsg.pics/stripe-app/policy-enforcement.png" \
  "https://cdn.dsg.pics/stripe-app/audit-trail.png" \
  "https://cdn.dsg.pics/stripe-app/fallback-mode.png"; do
  echo "Checking $img..."
  curl -s -I "$img" | grep -E "Content-Type|Content-Length|HTTP"
done
```

### 4. OAuth Redirect URIs

**Production (for submission):**
```json
{
  "allowed_redirect_uris": [
    "https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback",
    "https://dsg-stripe-app.vercel.app/api/stripe-app/oauth/callback"
  ]
}
```

**Local Development (stripe-app.dev.json):**
```json
{
  "allowed_redirect_uris": [
    "http://localhost:3000/stripe/oauth/callback",
    "http://localhost:3001/stripe/oauth/callback"
  ]
}
```

### 5. Content Security Policy (CSP)

**Configured in manifest:**
```json
{
  "ui_extension": {
    "content_security_policy": {
      "connect-src": [
        "https://tdealer01-crypto-dsg-control-plane.vercel.app/api/",
        "https://dsg-stripe-app.vercel.app/api/",
        "https://api.dsg.pics/v1/"
      ],
      "purpose": "Connect to DSG governance API for policy evaluation and audit recording"
    }
  }
}
```

**Status:** ✅ Configured for policy evaluation and audit logging

### 6. Permissions Justification

| Permission | Justification | Status |
|------------|---------------|--------|
| account_information | Read org/account context for billing and scope | ✅ Documented |
| charges_refunds | Read charge/refund details to evaluate policy | ✅ Documented |
| external_access | Send policy decisions and audit logs to DSG | ✅ Documented |

### 7. UI Extension Configuration

**Registered Views:**
```json
{
  "ui_extension": {
    "views": [
      {
        "name": "payment.detail",
        "title": "DSG Governance Gate",
        "description": "Policy evaluation and compliance status for payment events"
      }
    ]
  }
}
```

**View will display:**
- Policy decision badge (ALLOW, BLOCK, REVIEW)
- Policy version
- Proof reference
- Evaluation timestamp
- Audit trail link

## Environment-Specific Configs

### Development (Local)
```bash
npm run dev
# Starts on localhost:3001
# Uses stripe-app.dev.json (merged with stripe-app.json)
```

### Staging
```bash
# Uses stripe-app.prod.json for staging testing
# Point to staging API endpoints
```

### Production
```bash
# Uses stripe-app.prod.json for marketplace
# Points to production DSG API
# All URLs use HTTPS
```

## Verification Steps Before Submission

### Step 1: Validate Manifest
```bash
cd packages/stripe-app
stripe apps validate stripe-app.json
stripe apps validate stripe-app.prod.json
```

### Step 2: Check for Common Issues
```bash
# No localhost URLs
grep -r "localhost" stripe-app.json stripe-app.prod.json && echo "ERROR: Found localhost" || echo "✓ No localhost"

# No hardcoded secrets
grep -rE "sk_|pk_|secret" stripe-app.json stripe-app.prod.json && echo "⚠️ Found potential secrets" || echo "✓ No hardcoded secrets"

# Verify icon exists and is correct size
file packages/stripe-app/icon.png | grep -q "300 x 300" && echo "✓ Icon size OK" || echo "ERROR: Wrong icon size"
```

### Step 3: Test OAuth Flow
```bash
# 1. Start local dev server
npm run dev

# 2. In another terminal, test OAuth flow
curl -X POST http://localhost:3001/oauth/authorize \
  -H "Content-Type: application/json" \
  -d '{"client_id":"pics.dsg.governance","redirect_uri":"http://localhost:3001/callback"}'

# 3. Verify redirect completes
```

### Step 4: Verify Production APIs
```bash
# Primary API
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Fallback API
curl -s https://dsg-stripe-app.vercel.app/api/health | jq .

# Gateway
curl -s https://api.dsg.pics/v1/health | jq .
```

### Step 5: Build & Type Check
```bash
npm run build
npm run type-check
npm run test
```

## File Checklist for Submission Package

```
packages/stripe-app/
├── stripe-app.json                 ✅ Main manifest
├── stripe-app.prod.json            ✅ Production overrides
├── icon.png                        ✅ App icon (300x300)
├── MARKETPLACE_LISTING.md          ✅ Listing content
├── MARKETPLACE_SUBMISSION.md       ✅ Testing guide + checklist
├── MARKETPLACE_CONFIG.md           ✅ This file
├── package.json                    ✅ Dependencies
├── tsconfig.json                   ✅ TypeScript config
├── src/                            ✅ Source code
├── tests/                          ✅ Test suite
└── docs/
    ├── SETUP.md                    ✅ Installation guide
    ├── API.md                      ✅ API documentation
    ├── ARCHITECTURE.md             ✅ Architecture overview
    └── DEPLOYMENT.md               ✅ Deployment guide
```

## Next Steps for Submission

1. **Verify all URLs are live** → Run verification commands above
2. **Test CDN images** → Ensure feature images load correctly
3. **Validate manifest** → Run `stripe apps validate`
4. **Test OAuth locally** → Confirm redirect flow works
5. **Submit to Stripe Dashboard** → Upload files and listing content
6. **Wait 4 business days** for review
7. **Address any feedback** → Resubmit if requested
8. **Publish when approved** → Click "Publish" in Stripe Dashboard

---

**Last Updated**: 2026-07-04
**Configuration Status**: 🟡 PENDING CDN IMAGE VERIFICATION
