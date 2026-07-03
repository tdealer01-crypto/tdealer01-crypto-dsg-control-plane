# Stripe Marketplace App Submission Automation

Automated browser-based submission tool for DSG Governance Gate to Stripe Marketplace.

## 📋 Overview

This automation suite eliminates manual form filling by:
- ✅ Automating Stripe Dashboard login
- ✅ Creating new app with all metadata
- ✅ Uploading icon and screenshots
- ✅ Configuring OAuth, webhooks, and permissions
- ✅ Submitting app for review
- ✅ Capturing complete audit trail (13 screenshots + detailed log)

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt
playwright install chromium

# 2. Verify everything is ready
python3 verify_submission_ready.py

# 3. Run submission (interactive)
./submit_stripe_app.sh
```

## 📁 Files

| File | Purpose |
|------|---------|
| `stripe_app_submission_agent.py` | Main browser automation engine using Playwright |
| `verify_submission_ready.py` | Pre-flight checklist validator |
| `submit_stripe_app.sh` | Orchestration script (environment setup → verify → submit) |
| `requirements.txt` | Python dependencies |

## 📖 Documentation

For detailed setup and troubleshooting, see:
- **[Complete User Guide](../../../STRIPE_SUBMISSION_README.md)** — Full instructions with examples
- **[Architecture & Design](../../../AUTOMATION_SUMMARY.md)** — Technical details and limitations

## ⚙️ How It Works

### Layer 1: Environment Setup
- Checks Python 3 installation
- Creates virtual environment if needed
- Installs Playwright and Chromium browser

### Layer 2: Pre-Submission Validation
- Verifies all required fields in SUBMISSION_DATA.json
- Checks file paths (icon, screenshots)
- Validates URLs (OAuth URIs, webhook, legal URLs)
- Confirms text length constraints
- Reports 34 validation checks

### Layer 3: Browser Automation
- Opens Stripe Dashboard
- Authenticates with provided credentials
- Navigates to Apps section
- Creates new app and fills all form fields
- Uploads assets (icon + screenshots)
- Configures OAuth, webhooks, permissions
- Submits app for review
- Captures screenshots at each step

## 🔐 Security

- ❌ **No credential storage** — passwords only in memory
- ❌ **No credential logging** — not written to files
- ✅ **Interactive prompts** — credentials entered at runtime
- ✅ **2FA support** — pauses for manual code entry if needed

## 📊 Output

Submission creates a timestamped directory with:
```
submission_screenshots_YYYYMMDD_HHMMSS/
├── 01_login_page.png                    # Login page
├── 02_dashboard_home.png                # Authenticated dashboard
├── ...
├── 13_submission_confirmation.png       # Final confirmation
└── submission_log.txt                   # Timestamped action log
```

## ⚠️ Requirements

- Python 3.8+
- Stripe Dashboard account (with app creation permission)
- All asset files (icon.png, screenshots)
- All URLs configured and publicly accessible

### Asset Specifications
- **Icon**: 1200x1200 PNG
- **Screenshots**: 1200x800 PNG (minimum 3, recommended 5)

## 🧪 Testing

```bash
# Dry run - validate without actually submitting
python3 verify_submission_ready.py

# Run in headless mode (no visible browser)
./submit_stripe_app.sh --headless

# Skip pre-submission checks
./submit_stripe_app.sh --skip-check
```

## 🔄 Re-Submission

If Stripe requests changes:

```bash
# 1. Update SUBMISSION_DATA.json with feedback
# 2. Re-run validation
python3 verify_submission_ready.py

# 3. Run automation again
./submit_stripe_app.sh
```

## 🆘 Troubleshooting

### "playwright command not found"
```bash
pip install -r requirements.txt
playwright install chromium
```

### "Timeout waiting for element"
- Check internet connection
- Verify Stripe account has app creation permission
- Try again in a few minutes (Stripe may be slow)

### "OAuth URIs rejected"
- Ensure URLs use HTTPS (not HTTP)
- Verify exact match with app's callback routes
- Test URLs are publicly accessible

### "2FA code required"
- Script opens browser window and waits
- Enter SMS or authenticator code manually
- Script continues automatically after auth

For more troubleshooting, see the [complete user guide](../../../STRIPE_SUBMISSION_README.md#troubleshooting).

## 📝 Configuration

### Setup

1. Copy the example configuration:
```bash
cp SUBMISSION_DATA.example.json SUBMISSION_DATA.json
```

2. Edit `SUBMISSION_DATA.json` with your app details:
   - App name, description, category
   - OAuth redirect URIs (must match your app exactly)
   - Webhook endpoint URL (must be publicly accessible)
   - Contact email, support URLs, legal URLs
   - Asset paths (icon, screenshots)

3. Set environment variable (optional):
```bash
export SUBMISSION_DATA_JSON="/path/to/your/SUBMISSION_DATA.json"
```

If not set, script looks for `SUBMISSION_DATA.json` in current directory.

### Credential Setup

Credentials can be provided via:

**Option 1: Environment variables**
```bash
export STRIPE_EMAIL="your-email@example.com"
export STRIPE_PASSWORD="your-password"
./submit_stripe_app.sh
```

**Option 2: Interactive prompt**
```bash
./submit_stripe_app.sh
# Script will prompt for email and password
```

### Data Structure

Submission data is sourced from `SUBMISSION_DATA.json` which contains:
- App metadata (name, version, category)
- Descriptions (short < 140 chars, long < 4000 chars)
- Contact info (support email, timezone)
- OAuth configuration (redirect URIs)
- Webhook configuration (endpoint, events, signature verification)
- Permissions (charge:read)
- Asset paths (icon, screenshots)
- Legal URLs (privacy policy, terms of service)

## ✅ Success Criteria

Submission is successful when:

1. ✅ Script completes without errors
2. ✅ All 13 screenshots captured
3. ✅ submission_log.txt shows ✓ marks for all steps
4. ✅ Final screenshot shows Stripe confirmation
5. ✅ Email from Stripe received confirming submission
6. ✅ App appears in dashboard.stripe.com/apps

## 📧 Next Steps

After submission:

1. **Immediate** (within 1 hour)
   - Check email for Stripe confirmation
   - Verify app appears in dashboard.stripe.com/apps

2. **Short term** (1-7 days)
   - Monitor email for review updates
   - Stripe tests OAuth and webhook verification

3. **Medium term** (7-43 days)
   - Stripe approves or requests changes
   - App goes live or needs revision

## 📞 Support

For issues:
1. Check this README
2. Review [complete user guide](../../../STRIPE_SUBMISSION_README.md)
3. Check submission_screenshots_*/ directory for evidence
4. Review submission_log.txt for error details

---

**Status**: ✅ Production Ready
**Last Updated**: June 25, 2026
**App**: DSG Governance Gate v1.1.5
