# Setup Guide — Stripe App Submission Automation

Complete setup instructions for using the Browser Agent automation tool.

## 📋 Prerequisites

- Python 3.8+
- Stripe Dashboard account (with app creation permission)
- Asset files (icon.png, 3+ screenshots)
- All URLs configured and publicly accessible

## 🚀 Quick Setup (5 minutes)

### 1. Copy Configuration Template

```bash
cp SUBMISSION_DATA.example.json SUBMISSION_DATA.json
```

### 2. Edit Configuration

Edit `SUBMISSION_DATA.json` and update:

```json
{
  "app_metadata": {
    "app_name": "Your App Name",  // ← Change this
    "app_id": "your.app.id"        // ← Change this
  },
  "contact_info": {
    "support_email": "support@yourcompany.com"  // ← Change this
  },
  "oauth_configuration": {
    "redirect_uris": [
      "https://your-app.example.com/stripe/oauth/callback"  // ← Change this
    ]
  },
  "webhook_configuration": {
    "webhook_endpoint": "https://your-app.example.com/api/webhook"  // ← Change this
  },
  "assets": {
    "icon": {
      "file": "path/to/your/icon.png"  // ← Change this
    },
    "screenshots": [
      {
        "file": "path/to/screenshot-1.png"  // ← Change these
      }
    ]
  }
}
```

**Key Points:**
- ✅ **DO** Update all `*.com` URLs with your actual domain
- ✅ **DO** Update asset file paths to point to your files
- ✅ **DO** Keep this file in `.gitignore` (already configured)
- ❌ **DON'T** Commit this file to git
- ❌ **DON'T** Share this file (contains sensitive URLs)

### 3. Verify Asset Files

```bash
# Check icon exists (1200x1200 PNG)
ls -lh path/to/icon-1200x1200.png

# Check screenshots exist (1200x800 PNG)
ls -lh path/to/screenshot-*.png
```

### 4. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browser
playwright install chromium
```

### 5. Verify Everything

```bash
python3 verify_submission_ready.py
```

Expected output:
```
🔍 Your App - Pre-Submission Verification
======================================================================

✅ READY | 34/34 checks passed (100%)

✅ All checks passed! Ready for automated submission.
```

### 6. Run Submission

```bash
./submit_stripe_app.sh
```

The script will:
1. Prompt for Stripe email
2. Prompt for Stripe password
3. Open browser and automate submission
4. Save screenshots and log

---

## 🔧 Detailed Configuration

### app_metadata

```json
"app_metadata": {
  "app_id": "your.company.app",        // Unique identifier for your app
  "app_name": "Your App Name",          // Display name (max 80 chars)
  "version": "1.0.0",                   // Semantic version
  "distribution_type": "public",        // "public" or "private"
  "sandbox_install_compatible": true    // Can install in Stripe test mode
}
```

### app_descriptions

```json
"app_descriptions": {
  "short_description": "...",  // Max 140 characters
  "long_description": "...",   // Max 4000 characters
  "category": "Risk Management"  // Category for Stripe marketplace
}
```

**Description Tips:**
- **Short**: One-liner explaining what app does
- **Long**: Include use cases, benefits, who it's for
- Keep descriptions concise and benefit-focused
- Avoid marketing jargon

### oauth_configuration

```json
"oauth_configuration": {
  "redirect_uris": [
    "https://your-app.example.com/stripe/oauth/callback",
    "https://another-domain.example.com/api/stripe-callback"
  ]
}
```

⚠️ **IMPORTANT:**
- Must use HTTPS (not HTTP)
- Must exactly match your app's callback route
- Must be publicly accessible
- Stripe will test this route during review

### webhook_configuration

```json
"webhook_configuration": {
  "webhook_endpoint": "https://your-app.example.com/api/stripe/webhook",
  "signature_verification": true,
  "events": ["charge.created", "charge.updated"]
}
```

⚠️ **IMPORTANT:**
- Must be publicly accessible HTTPS URL
- Must validate Stripe webhook signatures
- Test route before submitting
- Stripe will verify during review

### permissions

```json
"permissions": [
  {
    "permission": "charge:read",
    "purpose": "Read charge details for governance decisions",
    "required": true
  }
]
```

Request only permissions your app actually uses.

### assets

```json
"assets": {
  "icon": {
    "file": "docs/assets/icon.png"  // 1200x1200 PNG
  },
  "screenshots": [
    {
      "file": "docs/assets/screenshot-1.png",  // 1200x800 PNG
      "title": "Dashboard Integration",
      "description": "App integrated in Stripe Dashboard"
    }
  ]
}
```

**Asset Requirements:**
- **Icon**: Exactly 1200x1200 PNG, transparent background or solid color
- **Screenshots**: Minimum 3, ideally 5; 1200x800 PNG; must show app in action
- File paths can be relative (relative to script directory) or absolute

### contact_info & legal_urls

```json
"contact_info": {
  "support_email": "support@yourcompany.com",  // Must be monitored
  "support_url": "https://yourcompany.com/support",
  "contact_timezone": "US/Eastern"
}

"legal_urls": {
  "privacy_policy": "https://yourcompany.com/privacy",
  "terms_of_service": "https://yourcompany.com/terms",
  "company_homepage": "https://yourcompany.com"
}
```

⚠️ **IMPORTANT:**
- All URLs must be publicly accessible
- Stripe will visit these during review
- Support email must be active and monitored
- Legal docs must be clear and complete

---

## 🔐 Credentials Management

### Option 1: Environment Variables (Recommended for CI/CD)

```bash
export STRIPE_EMAIL="your-email@example.com"
export STRIPE_PASSWORD="your-secure-password"
export SUBMISSION_DATA_JSON="/path/to/SUBMISSION_DATA.json"

./submit_stripe_app.sh
```

### Option 2: Interactive Prompts (Recommended for Local)

```bash
./submit_stripe_app.sh
# Script will prompt for:
# - Stripe email
# - Stripe password
```

### Option 3: .env File (Development Only)

Create `.env` file (git-ignored):
```
STRIPE_EMAIL=your-email@example.com
STRIPE_PASSWORD=your-password
SUBMISSION_DATA_JSON=/path/to/SUBMISSION_DATA.json
```

Then:
```bash
source .env
./submit_stripe_app.sh
```

⚠️ **Security:**
- Never commit `.env` or `SUBMISSION_DATA.json`
- Never share credentials
- Always use environment variables in CI/CD
- Credentials stored only in memory during execution

---

## ✅ Pre-Submission Checklist

Before running automation:

- [ ] `SUBMISSION_DATA.json` created and populated
- [ ] All OAuth redirect URIs configured
- [ ] Webhook endpoint publicly accessible
- [ ] All URLs use HTTPS
- [ ] Support email active and monitored
- [ ] Icon file exists (1200x1200 PNG)
- [ ] 3+ screenshots exist (1200x800 PNG)
- [ ] Privacy policy URL works
- [ ] Terms of service URL works
- [ ] Stripe account has app creation permission
- [ ] `python3 verify_submission_ready.py` passes

---

## 🧪 Test Before Production

### Dry Run (Validation Only)

```bash
# Verify configuration without submission
python3 verify_submission_ready.py
```

### Manual Test (Optional)

1. Manually visit Stripe Dashboard
2. Try creating an app (manual)
3. Note where form fields are located
4. If layout changed, may need script updates

### Headless Mode (Optional)

```bash
# Run without opening browser window
./submit_stripe_app.sh --headless
```

---

## 🆘 Common Issues

### ❌ "SUBMISSION_DATA.json not found"

```bash
# Verify file exists
ls -la SUBMISSION_DATA.json

# Or set environment variable
export SUBMISSION_DATA_JSON="/full/path/to/SUBMISSION_DATA.json"
./submit_stripe_app.sh
```

### ❌ "playwright: command not found"

```bash
pip install -r requirements.txt
playwright install chromium
```

### ❌ "OAuth URIs rejected"

- Ensure HTTPS (not HTTP)
- Verify exact match with app's callback route
- Test URL in browser manually

### ❌ "Stripe account permission denied"

- Contact Stripe to enable app creation
- Try different account
- Check account is in good standing

### ❌ "2FA code required"

- Script pauses for you to enter code
- Enter SMS/authenticator code manually
- Script continues automatically after auth

---

## 📞 Getting Help

1. Check `README.md` for quick reference
2. Review `verify_submission_ready.py` output for validation errors
3. Check `submission_screenshots_*/submission_log.txt` for step-by-step log
4. Review the main documentation in project root

---

## 🔄 Re-Submission Process

If Stripe requests changes:

```bash
# 1. Update configuration
vi SUBMISSION_DATA.json

# 2. Verify changes
python3 verify_submission_ready.py

# 3. Re-run submission
./submit_stripe_app.sh
```

---

## ✨ Tips & Best Practices

### URLs
- Use custom domain (not localhost or ngrok)
- Ensure endpoints have valid SSL certificates
- Test all URLs manually before submitting

### Descriptions
- Be specific about what your app does
- Include use cases relevant to Stripe users
- Keep language professional and clear

### Screenshots
- Show actual app functionality (not mockups)
- Include labels/annotations if helpful
- Make sure text is legible
- Show different features across screenshots

### Support
- Monitor support email during review period
- Respond to Stripe requests within 24 hours
- Have test account ready for Stripe to test with

---

**Status**: ✅ Ready for Setup
**Last Updated**: June 25, 2026
