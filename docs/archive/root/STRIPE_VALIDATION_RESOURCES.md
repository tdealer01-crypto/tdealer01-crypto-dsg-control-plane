# Stripe Configuration Validation Resources

Three comprehensive resources created for validating Stripe configuration:

## Files Created

### 1. `/scripts/validate-stripe-config.sh` (13 KB, Executable)

**Purpose:** Comprehensive local environment and configuration validation

**Key Checks:**
- Environment variable completeness
- Key format validation (sk_test_*, whsec_test_*, ca_*)
- API key validity testing (connectivity to Stripe API)
- Webhook secret format validation
- OAuth client ID format validation
- Local implementation verification (webhook/OAuth handlers)
- Supabase configuration check
- Stripe CLI availability and authentication

**Usage:**
```bash
./scripts/validate-stripe-config.sh
```

**Output:**
- Color-coded PASS/FAIL/WARN results
- Masked key values (sk_test_...ABCD)
- Summary counts and manual verification steps
- Exit code 0 = all passed, 1 = failures

**Runtime:** ~1 minute

---

### 2. `/scripts/test-webhook-delivery.sh` (17 KB, Executable)

**Purpose:** End-to-end webhook delivery and signature validation testing

**Tests Performed:**
- Prerequisites validation (curl, jq, environment)
- Endpoint reachability check
- Realistic test payload generation (charge.created event)
- HMAC-SHA256 signature calculation
- Webhook POST delivery with Stripe-Signature header
- Response validation (HTTP 200 expected)
- Audit trail entry verification (Supabase)
- Stripe CLI integration (optional)

**Usage:**
```bash
# Using environment variables
./scripts/test-webhook-delivery.sh

# With explicit webhook secret
./scripts/test-webhook-delivery.sh whsec_test_abc123
```

**Configuration (Environment Variables):**
```bash
WEBHOOK_URL=http://localhost:3001/stripe/webhook/events
ENDPOINT_URL=http://localhost:3000
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_SECRET_KEY=sk_test_...
```

**Output:**
- Step-by-step progress with status indicators
- Generated payload details
- Signature calculation results
- Webhook endpoint response
- Audit trail verification instructions
- Stripe CLI usage guide

**Runtime:** ~30 seconds

---

### 3. `/docs/STRIPE_CONFIGURATION_VERIFICATION.md` (40 KB, 953 Lines)

**Purpose:** Complete reference guide for verification across all layers

**Sections Included:**

1. **Prerequisites** — Tools and credentials needed
2. **Quick Start** — 3-step validation workflow
3. **Configuration Checklist** — 27-item comprehensive checklist
4. **Stripe Dashboard Verification** — Step-by-step navigation
5. **Webhook Configuration & Testing** — Local and production testing
6. **OAuth Configuration & Testing** — Full OAuth flow verification
7. **API Key Validation** — Format reference and testing
8. **Troubleshooting** — 7 common issues with solutions
9. **Security Considerations** — Best practices and DO's/DON'Ts
10. **Testing Checklist** — Pre-production verification steps
11. **Related Documentation** — Links to other guides

**Key Features:**
- Copy-paste ready commands
- Configuration examples
- Security best practices
- Common troubleshooting scenarios
- Links to Stripe documentation
- References to project documentation

---

## Usage Workflow

### Phase 1: Local Setup Validation
```bash
source .env.local
./scripts/validate-stripe-config.sh
```
Fix any failures before proceeding.

### Phase 2: Local Webhook Testing
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test webhook delivery
./scripts/test-webhook-delivery.sh
```
Verify webhook received and audit trail created.

### Phase 3: Stripe Dashboard Verification
Follow instructions in `STRIPE_CONFIGURATION_VERIFICATION.md`:
- Verify webhook endpoint registered
- Verify webhook signing secret matches
- Verify OAuth configuration
- Send test event from Dashboard

### Phase 4: Production Deployment
Use verification checklist in `STRIPE_CONFIGURATION_VERIFICATION.md`:
- Verify environment variables in Vercel
- Test endpoint reachability
- Monitor webhook delivery status
- Verify audit trail entries

### Phase 5: Continuous Monitoring
- Review Supabase audit trail
- Check Stripe Dashboard webhook logs
- Monitor application logs
- Validate permissions periodically

---

## Key Features

### Security
- Never prints secret values (masked: sk_test_...ABCD)
- No temporary files with secrets
- No secrets in debug output
- CI/CD safe
- Follows Stripe security best practices

### Comprehensive
- Covers all configuration layers (local, code, deployment, Dashboard)
- Tests both format AND functionality
- Includes manual verification steps
- Provides troubleshooting guide
- Documents best practices

### User-Friendly
- Color-coded output
- Step-by-step instructions
- Copy-paste ready commands
- Clear success/failure indicators
- Helpful error messages

---

## Quick Reference

| Script | Purpose | Input | Output | Runtime |
|--------|---------|-------|--------|---------|
| validate-stripe-config.sh | Environment validation | .env file | PASS/FAIL/WARN | ~1 min |
| test-webhook-delivery.sh | Webhook testing | Webhook secret | HTTP response | ~30 sec |
| STRIPE_CONFIGURATION_VERIFICATION.md | Reference guide | Dashboard access | Verified config | N/A |

---

## Security Notes

**Never:**
- Commit `.env` files to git
- Print secrets in logs
- Share API keys via email/Slack
- Use same key across environments
- Disable webhook signature validation

**Always:**
- Rotate secrets regularly
- Use environment variables for deployment
- Validate webhook signatures
- Log all operations for audit
- Use HTTPS for webhook endpoints

---

## Requirements

### System Tools
- Bash 4.0+
- curl
- jq
- Node.js 16+ (for project)
- Stripe CLI (optional but recommended)

### Credentials Required
- Stripe Secret Key (sk_test_* or sk_live_*)
- Stripe Webhook Secret (whsec_test_* or whsec_live_*)
- Stripe App Client ID (ca_*)
- Stripe App Client Secret (for OAuth)

### Environment Setup
Create `.env.local` with required credentials before running scripts.

---

## Troubleshooting Quick Links

| Issue | Section | Command |
|-------|---------|---------|
| Webhook signature failed | Troubleshooting → Webhook signature | ./scripts/validate-stripe-config.sh |
| Endpoint not reachable | Troubleshooting → Endpoint not reachable | ./scripts/test-webhook-delivery.sh |
| OAuth state token failed | Troubleshooting → OAuth state token | See verification guide |
| API key rejected | Troubleshooting → API key rejected | ./scripts/validate-stripe-config.sh |
| Key not configured | Troubleshooting → Key not configured | Check .env.local |

---

## Next Steps

1. **Review** the three created files
2. **Customize** webhook URLs and event types for your deployment
3. **Integrate** into your deployment checklist
4. **Extend** with live-mode variants if needed
5. **Reference** in onboarding and runbook documentation

---

**Created:** 2026-06-07  
**Status:** Ready for Review (Not Committed)  
**Version:** 1.0

For detailed instructions, see `/docs/STRIPE_CONFIGURATION_VERIFICATION.md`
