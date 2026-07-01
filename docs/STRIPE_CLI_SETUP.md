# Stripe CLI Setup Guide for App Marketplace Submission

**Purpose:** Use Stripe CLI to efficiently upload and manage your DSG Governance Gate app manifest

**Time Required:** 10-15 minutes

---

## 📥 Installation

### macOS (Recommended)

**Using Homebrew:**
```bash
brew install stripe/stripe-cli/stripe
```

**Verify installation:**
```bash
stripe --version
# Expected output: stripe version X.X.X
```

### Linux (Ubuntu/Debian)

**Add Stripe repository:**
```bash
curl -s https://packages.stripe.dev/api/v1/repos/stripe-cli-deb/gpg.key | sudo apt-key add -
echo "deb https://packages.stripe.dev/stripe-cli-deb focal main" | sudo tee -a /etc/apt/sources.list.d/stripe.list
```

**Install:**
```bash
sudo apt-get update && sudo apt-get install stripe
```

**Verify:**
```bash
stripe --version
```

### Windows

**Using Scoop:**
```bash
scoop install stripe
```

**Or using Chocolatey:**
```bash
choco install stripe
```

**Verify:**
```bash
stripe --version
```

### Docker (Alternative)

```bash
docker pull stripe/stripe-cli:latest
docker run stripe/stripe-cli:latest stripe --version
```

---

## 🔐 Authentication

### Step 1: Login

```bash
stripe login
```

This opens your browser to:
```
https://dashboard.stripe.com/apikeys/confirm_access
```

### Step 2: Confirm Access

- Click "Confirm" to grant CLI access
- You'll see: "Successfully authenticated as [your-account]"
- Return to terminal

### Step 3: Verify Authentication

```bash
stripe accounts list
```

**Expected output:**
```
tdealer01-crypto  acct_1234567890ABC  READY
```

### Step 4: Verify App Access

```bash
stripe apps list
```

**If app exists:**
```
pics.dsg.governance  DSG Governance Gate  1.0.0
```

---

## 📤 Upload Manifest with CLI

### Dry Run (Recommended First)

**Test manifest upload without committing:**
```bash
stripe apps create \
  --manifest packages/stripe-app/stripe-app.json \
  --dry-run
```

**Expected output:**
```
✓ Manifest is valid
✓ All permissions present
✓ Icon file found
✓ Ready to upload
```

**If errors:** Fix `stripe-app.json` and retry

### Actual Upload

**Upload manifest to Stripe:**
```bash
stripe apps create --manifest packages/stripe-app/stripe-app.json
```

**Expected output:**
```
✓ App created successfully
App ID: pics.dsg.governance
Status: Draft
Next: Go to Dashboard to complete listing

Visit: https://dashboard.stripe.com/apps/manage/pics.dsg.governance
```

### Update Existing App

**If app already exists, update manifest:**
```bash
stripe apps update pics.dsg.governance \
  --manifest packages/stripe-app/stripe-app.json
```

---

## 🧪 Testing with CLI

### Listen to Webhooks

**Start webhook listener:**
```bash
stripe listen --forward-to localhost:3000/api/webhooks
```

**Output:**
```
Ready to handle webhook events...
Webhook signing secret: whsec_1234567890abcdef
```

**Copy the signing secret** to `.env.local`:
```bash
STRIPE_WEBHOOK_SECRET=whsec_1234567890abcdef
```

### Trigger Test Events

**In another terminal:**

```bash
# Charge created
stripe trigger charge.created

# Payout created
stripe trigger payout.created

# Refund created
stripe trigger refund.created

# Account updated
stripe trigger account.updated
```

**Verify in first terminal:**
```
Webhook received: charge.created (evt_1234567890)
Webhook received: payout.created (evt_1234567890)
...
```

---

## 📋 Common Commands

### App Management

```bash
# List all apps
stripe apps list

# Get app details
stripe apps get pics.dsg.governance

# Get app resources
stripe apps resources pics.dsg.governance

# Update app manifest
stripe apps update pics.dsg.governance \
  --manifest packages/stripe-app/stripe-app.json
```

### Event Testing

```bash
# List available events
stripe events test --help

# Trigger event
stripe trigger charge.created

# Trigger with custom data
stripe trigger charge.created --body "{\"amount\": 1000}"
```

### API Calls

```bash
# Call API directly
stripe charges create \
  --amount 2000 \
  --currency usd \
  --source tok_visa

# Get resource
stripe customers retrieve cus_1234567890

# List resources
stripe charges list --limit 10
```

### Documentation

```bash
# Browse docs in terminal
stripe docs stripe-app-marketplace

# Search docs
stripe docs search "webhook signature"

# Get help
stripe --help
stripe apps --help
```

---

## 🔑 Manage API Keys

### View Keys

```bash
stripe api_keys list
```

### Create Restricted Key

```bash
stripe api_keys create \
  --description "DSG App - Charges Read" \
  --restrictions '{"permissions": ["read:charges"]}'
```

### Revoke Key

```bash
stripe api_keys revoke rk_test_1234567890
```

---

## 📝 CLI Configuration

### Set Account

If you have multiple accounts:

```bash
# List accounts
stripe accounts list

# Set active account
stripe config set account acct_YOUR_ACCOUNT_ID
```

### Enable Autocompletion

**Bash:**
```bash
stripe completion install bash
source ~/.bashrc
```

**Zsh:**
```bash
stripe completion install zsh
source ~/.zshrc
```

**Fish:**
```bash
stripe completion install fish
```

---

## 🐛 Troubleshooting

### Issue: "Not authenticated"

**Solution:**
```bash
stripe login  # Authenticate again
stripe accounts list  # Verify
```

### Issue: "Manifest invalid"

**Check manifest:**
```bash
jq . packages/stripe-app/stripe-app.json
```

**Validate with dry-run:**
```bash
stripe apps create \
  --manifest packages/stripe-app/stripe-app.json \
  --dry-run
```

### Issue: "Permission denied"

**Solution:**
```bash
stripe login --force  # Force re-authenticate
```

### Issue: "Webhook not receiving events"

**Check listener is running:**
```bash
# Terminal 1: Start listener
stripe listen --forward-to localhost:3000/api/webhooks

# Terminal 2: Trigger event
stripe trigger charge.created

# Should see in Terminal 1:
# Webhook received: charge.created
```

### Issue: "Icon file not found"

**Solution:**
```bash
# Verify icon exists
ls -lh packages/stripe-app/icon.png

# Verify path in manifest
jq '.icon' packages/stripe-app/stripe-app.json
# Should show: "./icon.png"
```

---

## 📊 Useful CLI Workflows

### Complete Submission Workflow

```bash
# 1. Verify authentication
stripe accounts list

# 2. Dry-run manifest
stripe apps create \
  --manifest packages/stripe-app/stripe-app.json \
  --dry-run

# 3. If successful, upload manifest
stripe apps create \
  --manifest packages/stripe-app/stripe-app.json

# 4. Visit Dashboard to complete listing
echo "Visit: https://dashboard.stripe.com/apps/manage/pics.dsg.governance"
```

### Testing Workflow

```bash
# Terminal 1: Listen to webhooks
stripe listen --forward-to localhost:3000/api/webhooks

# Terminal 2: Run dev server
npm run dev

# Terminal 3: Trigger events
stripe trigger charge.created
stripe trigger charge.updated
stripe trigger refund.created
```

### Monitoring Workflow

```bash
# Watch for real webhook events
stripe trigger charge.created --skip-prompt
stripe trigger charge.failed --skip-prompt
stripe trigger payout.created --skip-prompt

# Monitor logs
stripe logs list
stripe logs read evt_1234567890
```

---

## 📚 Additional Resources

- **Stripe CLI Documentation:** https://docs.stripe.com/cli.md
- **Install Guide:** https://docs.stripe.com/stripe-cli/install.md
- **Usage Guide:** https://docs.stripe.com/stripe-cli/use-cli.md
- **Keys & Permissions:** https://docs.stripe.com/stripe-cli/keys.md
- **Upgrade Guide:** https://docs.stripe.com/stripe-cli/upgrade.md

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Stripe CLI installed (`stripe --version`)
- [ ] Authenticated (`stripe accounts list`)
- [ ] Can list apps (`stripe apps list`)
- [ ] Manifest validates (`stripe apps create --manifest ... --dry-run`)
- [ ] Webhooks can be triggered (`stripe trigger charge.created`)
- [ ] API keys accessible (`stripe api_keys list`)

---

**Ready to submit!** 🚀

Continue with: `docs/STRIPE_SUBMISSION_CHECKLIST.md` → STEP 2
