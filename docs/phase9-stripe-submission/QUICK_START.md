# Quick Start: Stripe Marketplace Submission (10 minutes)

**Goal:** Get ready to submit DSG Governance Gate to Stripe in 10 minutes  
**Result:** Know exactly what to do next

---

## Step 1: Prepare Assets (IF NOT DONE)

If you haven't created assets yet, do this first:

```
Read: ASSET_PREPARATION_GUIDE.md

Prepare these files in docs/phase9-stripe-submission/assets/:
✓ icon-1200x1200.png (icon for app)
✓ screenshot-1-*.png (dashboard view)
✓ screenshot-2-*.png (governance decision)
✓ screenshot-3-*.png (audit trail)

This takes 1-2 hours. Skip to Step 2 if assets are done.
```

---

## Step 2: Validate Everything (2 minutes)

```bash
# Run validation
bash docs/phase9-stripe-submission/scripts/validate-submission.sh

# Expected: ✓ All validation checks passed!
```

If validation fails, see the error messages and fix those items.

---

## Step 3: Final Checklist (1 minute)

```bash
# Run final checklist
bash docs/phase9-stripe-submission/scripts/pre-submit-checklist.sh

# Expected: ✓ ALL 20 CHECKS PASSED!
```

If checklist fails, fix the failed items.

---

## Step 4: Open Stripe Dashboard (1 minute)

Go to: **https://dashboard.stripe.com/apps**

Click: **Create an app**

You'll see the app creation form.

---

## Step 5: Follow the Submission Guide (25 minutes)

Open this file: **PHASE9_SUBMISSION_READY.md**

Go to section: **"Step-by-Step Stripe Dashboard Submission"**

Fill in each section exactly as shown:
- T+0: App metadata (name, category, description)
- T+5: Upload icon & screenshots
- T+10: Configure permissions
- T+15: Configure webhook
- T+20: Support info
- T+25: Submit

Copy-paste ready. Takes ~25 minutes total.

---

## Step 6: Get Confirmation (2 minutes)

Stripe shows confirmation page with your App ID.

You'll get email at: **t.dealer01@dsg.pics**

Save the confirmation details.

---

## Step 7: Monitor for 1-43 Days

After submission:

- Stripe reviews your app (Days 1-43)
- Typical approval: 7 days
- Check email daily
- Respond within 24 hours if Stripe asks questions

See: **POST_SUBMISSION_TRACKING.md** for detailed day-by-day guide.

---

## If Stripe Asks Questions

They might ask about:
- App description clarity
- Permission justification
- OAuth flow verification
- Data privacy details
- Company information

See: **POST_SUBMISSION_TRACKING.md** → "Response Templates for Common Questions"

Respond with factual, detailed answers within 24 hours.

---

## If Approved ✓

You'll get approval email within 1-43 days (typical: 7 days).

Your app goes live at: https://marketplace.stripe.com/apps/dsg-governance-gate

Next steps:
1. Update website with marketplace link
2. Create FAQ based on Stripe feedback
3. Monitor installations

---

## Files You Need

| File | Purpose | Read Time |
|------|---------|-----------|
| **README.md** | Overview of entire submission pack | 5 min |
| **ASSET_PREPARATION_GUIDE.md** | How to create icon & screenshots | 20 min |
| **PHASE9_SUBMISSION_READY.md** | Step-by-step dashboard guide | Reference |
| **POST_SUBMISSION_TRACKING.md** | Day-by-day after submission | Reference |
| **SUBMISSION_CHECKLIST.txt** | Print & check 20 items | Reference |

---

## Validation Scripts

| Script | Purpose | Runtime |
|--------|---------|---------|
| **validate-submission.sh** | Check assets exist & meet specs | 1 min |
| **pre-submit-checklist.sh** | Final 20-item checklist | 1 min |
| **generate-submission-manifest.sh** | Create submission manifest (optional) | 1 min |

---

## Key Info (Copy-Paste)

**App Name:** DSG Governance Gate

**Support Email:** t.dealer01@dsg.pics

**Webhook URL:** https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events

**OAuth Callback:** https://tdealer01-crypto-dsg-control-plane.vercel.app/stripe/oauth/callback

**Permissions:**
- charge:read
- charge:write
- payment_intent:read
- payout:read
- refund:read

---

## Checklist: Ready to Submit?

- [ ] Assets prepared (icon + 3 screenshots)
- [ ] validate-submission.sh passes
- [ ] pre-submit-checklist.sh passes (20/20)
- [ ] You have Stripe account access
- [ ] Support email is monitored
- [ ] You've read PHASE9_SUBMISSION_READY.md

**If all checked: You're ready!**

Open: https://dashboard.stripe.com/apps

---

## Timeline

| Phase | Time | Status |
|-------|------|--------|
| Asset prep | 1-2 hours | Optional |
| Validation | 2 minutes | Required |
| Dashboard submission | 25 minutes | Required |
| Stripe review | 1-43 days | Automatic |
| **Total to submit** | **~30 min** | |

---

## What Happens Next

```
Day 0:  You submit → Confirmation email
Day 1-5: Stripe reviews assets
Day 5-10: Stripe tests OAuth & webhooks
Day 10-20: Possible questions from Stripe
Day 20-30: Final review
Day 30-43: Approval or rejection
```

Most apps approved in 7 days.

If Stripe asks questions, respond within 24 hours.

---

## Common Issues

**Validation script fails?**
→ Missing icon or screenshots. See ASSET_PREPARATION_GUIDE.md

**Webhook won't verify?**
→ Endpoint not accessible. See PHASE9_SUBMISSION_READY.md → "Webhook Verification Troubleshooting"

**Stripe asks for changes?**
→ See POST_SUBMISSION_TRACKING.md → "Response Templates for Common Questions"

---

## Next Action

Choose one:

```
1. IF assets not ready:
   Read: ASSET_PREPARATION_GUIDE.md
   Then: Prepare icon + screenshots
   Then: Come back here

2. IF assets ready:
   Run: bash docs/phase9-stripe-submission/scripts/validate-submission.sh
   Then: Run pre-submit-checklist.sh
   Then: Open PHASE9_SUBMISSION_READY.md
   Then: Go to https://dashboard.stripe.com/apps
```

---

## Questions?

**Before submitting:**
→ Read: README.md

**While submitting:**
→ See: PHASE9_SUBMISSION_READY.md

**After submitting:**
→ See: POST_SUBMISSION_TRACKING.md

**About assets:**
→ See: ASSET_PREPARATION_GUIDE.md

---

**You've got this! Start here:**

```bash
bash docs/phase9-stripe-submission/scripts/validate-submission.sh
```

**Then open:** https://dashboard.stripe.com/apps
