# Stripe Webhook Testing Toolkit - Index

Complete index of webhook testing tools and documentation.

## Overview

The Stripe Webhook Testing Toolkit provides three automated scripts and comprehensive documentation for testing, verifying, and debugging Stripe webhooks in the DSG Control Plane.

## Quick Navigation

### I Just Want To...

- **Send a test webhook**: See [Quick Start](#quick-start)
- **Verify webhook was received**: See [Verification Script](#webhook-verification-script)
- **Test webhook performance**: See [Load Test Script](#webhook-load-test-script)
- **Understand webhook testing**: See [Complete Guide](#comprehensive-guide)
- **See real examples**: See [Example Workflows](#example-workflows)
- **Quick reference**: See [Quick Reference Card](#quick-reference-card)

---

## Available Files

### Executable Scripts

#### 1. Stripe Webhook Simulator
**File**: `/scripts/stripe-webhook-simulator.sh` (25 KB, 997 lines)

Generates realistic Stripe webhook events with valid HMAC-SHA256 signatures and sends them to a target endpoint.

**Usage**:
```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx
```

**Features**:
- Realistic Stripe event JSON structures
- Valid HMAC-SHA256 signatures with timestamp
- 10+ supported event types
- Dry-run mode for payload inspection
- Verbose debug output
- Random ID generation

**When to use**: Testing webhook delivery, signature verification, event parsing

#### 2. Webhook Verification Script
**File**: `/scripts/verify-webhook-received.sh` (9.4 KB, 380 lines)

Queries Supabase audit trail to confirm webhooks were received and processed.

**Usage**:
```bash
./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 30 \
  --verbose
```

**Features**:
- Queries Supabase REST API
- Polling with configurable timeout
- Multiple filtering options (event ID, account ID, time window)
- Comprehensive error messages
- Auto-loads environment from .env/.env.local

**When to use**: Confirming webhook receipt, debugging delivery issues, audit trail verification

#### 3. Webhook Load Test Script
**File**: `/scripts/webhook-load-test.sh` (12 KB, 508 lines)

Sends multiple webhooks concurrently to test endpoint performance and stability.

**Usage**:
```bash
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --count 50 \
  --concurrency 10
```

**Features**:
- Configurable concurrency control
- Performance metrics (average, median, min, max)
- Progress bar with percentage indicator
- Results saved to timestamped files
- Success rate reporting

**When to use**: Performance benchmarking, stress testing, capacity planning

---

### Documentation

#### Complete Guide
**File**: `/docs/WEBHOOK_TESTING_GUIDE.md` (22 KB, 8,000+ words)

Comprehensive guide covering all aspects of webhook testing.

**Sections**:
- Overview and key concepts
- Quick start setup
- Detailed script usage for each tool
- All supported event types
- Dry-run and testing examples
- Common issues and troubleshooting (9 issues covered)
- Signature verification debugging
- Stripe CLI integration
- Production verification procedures
- Performance targets and interpretation
- Complete testing checklist

**When to read**: First-time setup, learning how to use the tools, troubleshooting problems

#### Quick Reference Card
**File**: `/docs/WEBHOOK_QUICK_REFERENCE.md` (4.2 KB)

One-page quick reference with common commands, event types, and troubleshooting.

**Contents**:
- Environment variable setup
- Quick commands for common tasks
- Event type table
- Dry-run examples
- Load testing examples
- Verification options
- Troubleshooting table
- Performance targets

**When to use**: Quick command lookup, reference while testing

#### Real-World Examples
**File**: `/docs/WEBHOOK_TESTING_EXAMPLES.md` (14 KB, 9 examples)

Practical example workflows for different scenarios.

**Examples Included**:
1. Local development testing
2. Staging environment verification
3. Load testing before production
4. Production rollout verification
5. Testing different event types
6. CI/CD pipeline integration
7. Debugging signature verification
8. Regression testing workflow
9. Monthly performance reporting

**When to use**: Finding examples for your specific use case, learning best practices

---

## Quick Start

### 1. Prerequisites

```bash
# Required tools (usually pre-installed)
curl                    # for HTTP requests
openssl                 # for signature generation
jq                      # (optional) for JSON formatting
bash                    # shell (v4+)
```

### 2. Environment Setup

```bash
# Set webhook secret (can also pass via --secret flag)
export STRIPE_WEBHOOK_SECRET="whsec_live_xxxxx"

# For verification script, also set:
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGc..."
```

### 3. Send a Test Webhook

```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url http://localhost:3000/api/stripe/webhook \
  --secret whsec_test_xxxxx \
  --verbose
```

### 4. Verify It Was Received

```bash
./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 30
```

### 5. Check Performance

```bash
./scripts/webhook-load-test.sh \
  --url http://localhost:3000/api/stripe/webhook \
  --secret whsec_test_xxxxx \
  --count 20 \
  --concurrency 5
```

---

## Common Tasks

### Test Locally

```bash
npm run dev &

./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url http://localhost:3000/api/stripe/webhook \
  --secret whsec_test_xxxxx

./scripts/verify-webhook-received.sh --wait
```

### Test in Staging

```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://staging-app.vercel.app/api/stripe/webhook \
  --secret whsec_test_staging_xxxxx

./scripts/verify-webhook-received.sh \
  --wait \
  --timeout 30 \
  --verbose
```

### Test in Production

```bash
# Send test webhook
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx

# Verify in audit trail
./scripts/verify-webhook-received.sh \
  --minutes 5 \
  --verbose
```

### Performance Benchmark

```bash
# Baseline (10 sequential)
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --count 10 \
  --concurrency 1

# Load test (50 concurrent)
./scripts/webhook-load-test.sh \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --count 50 \
  --concurrency 10 \
  --save-results
```

### Dry Run (No Send)

```bash
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url https://your-app.vercel.app/api/stripe/webhook \
  --secret whsec_live_xxxxx \
  --dry-run | jq '.'
```

---

## Supported Events

All scripts support these event types:

| Event | Usage |
|-------|-------|
| `charge.created` | Test charge creation |
| `charge.updated` | Test charge updates |
| `payout.created` | Test payout initiation |
| `payout.updated` | Test payout status changes |
| `refund.created` | Test refund processing |
| `payment_intent.created` | Test payment intent creation |
| `payment_intent.processing` | Test payment processing |
| `checkout.session.completed` | Test checkout completion |
| `customer.subscription.updated` | Test subscription updates |
| `customer.subscription.deleted` | Test subscription cancellation |

---

## Troubleshooting Quick Links

| Issue | Resolution |
|-------|-----------|
| "Invalid signature" | See [Signature Verification Debugging](./WEBHOOK_TESTING_GUIDE.md#signature-verification-debugging) |
| "Webhook secret not configured" | See [Common Issues & Fixes](./WEBHOOK_TESTING_GUIDE.md#common-issues--fixes) |
| "Webhook not in audit trail" | See [Load Testing](./WEBHOOK_TESTING_GUIDE.md#load-testing) |
| "High latency" | See [Performance Troubleshooting](./WEBHOOK_TESTING_GUIDE.md#common-issues--fixes) |
| Need examples | See [Real-World Examples](./WEBHOOK_TESTING_EXAMPLES.md) |

---

## Documentation Map

```
Webhook Testing Toolkit
├── This File (Index)
│
├── Quick Start & Reference
│   ├── WEBHOOK_QUICK_REFERENCE.md ........... One-page quick ref
│
├── Complete Guides
│   ├── WEBHOOK_TESTING_GUIDE.md ............ Comprehensive guide (8,000+ words)
│   │   ├── Overview & Concepts
│   │   ├── Quick Start
│   │   ├── Simulator Usage
│   │   ├── Verification Usage
│   │   ├── Load Testing
│   │   ├── Common Issues (9 issues)
│   │   ├── Signature Debugging
│   │   ├── Stripe CLI Integration
│   │   └── Production Verification
│   │
│   └── WEBHOOK_TESTING_EXAMPLES.md ........ Real-world examples
│       ├── Local Development
│       ├── Staging Verification
│       ├── Load Testing Strategy
│       ├── Production Rollout
│       ├── Event Type Testing
│       ├── CI/CD Integration
│       ├── Signature Debugging
│       ├── Regression Testing
│       └── Performance Reporting
│
└── Scripts
    ├── stripe-webhook-simulator.sh ........ Webhook event generator
    ├── verify-webhook-received.sh ......... Audit trail verification
    └── webhook-load-test.sh .............. Performance testing
```

---

## Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Webhook response | <500ms | 500-1000ms | >1000ms |
| Concurrent capacity | 10+ | 5-10 | <5 |
| Success rate | 100% | <95% | <80% |
| P99 latency | <2000ms | 2-5s | >5s |

---

## Environment Variables

### Required for Verification Script

```bash
# Supabase configuration (auto-loaded from .env/.env.local)
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGc..."
```

### Optional for Testing

```bash
# Can also be passed via --secret and --url flags
export STRIPE_WEBHOOK_SECRET="whsec_live_xxxxx"
export WEBHOOK_URL="https://your-app.vercel.app/api/stripe/webhook"
```

---

## Command Reference

### Simulator

```bash
# Send webhook
./scripts/stripe-webhook-simulator.sh \
  --event <type> \
  --url <endpoint> \
  --secret <secret> \
  [--account-id <id>] \
  [--dry-run] \
  [--verbose] \
  [--help]
```

### Verification

```bash
# Verify webhook
./scripts/verify-webhook-received.sh \
  [--minutes <N>] \
  [--event-id <id>] \
  [--account-id <id>] \
  [--wait] \
  [--timeout <seconds>] \
  [--verbose] \
  [--help]
```

### Load Test

```bash
# Load test webhook
./scripts/webhook-load-test.sh \
  --url <endpoint> \
  --secret <secret> \
  [--count <N>] \
  [--event <type>] \
  [--concurrency <N>] \
  [--delay <ms>] \
  [--save-results] \
  [--verbose] \
  [--help]
```

---

## Testing Workflow

### Development
1. Start local server: `npm run dev`
2. Send test: `./scripts/stripe-webhook-simulator.sh --event charge.created --url http://localhost:3000/api/stripe/webhook --secret whsec_test_xxxxx`
3. Verify: `./scripts/verify-webhook-received.sh --wait`

### Staging
1. Send test: `./scripts/stripe-webhook-simulator.sh --event charge.created --url https://staging.example.com/api/stripe/webhook --secret whsec_test_staging_xxxxx`
2. Verify: `./scripts/verify-webhook-received.sh --wait --timeout 30`
3. Load test: `./scripts/webhook-load-test.sh --url https://staging.example.com/api/stripe/webhook --secret whsec_test_staging_xxxxx --count 20`

### Production
1. Send test: `./scripts/stripe-webhook-simulator.sh --event charge.created --url https://prod.example.com/api/stripe/webhook --secret whsec_live_xxxxx`
2. Verify: `./scripts/verify-webhook-received.sh --minutes 5 --verbose`
3. Load test: `./scripts/webhook-load-test.sh --url https://prod.example.com/api/stripe/webhook --secret whsec_live_xxxxx --count 50 --concurrency 10`

---

## File Locations

| Type | File | Size |
|------|------|------|
| Script | `/scripts/stripe-webhook-simulator.sh` | 25 KB |
| Script | `/scripts/verify-webhook-received.sh` | 9.4 KB |
| Script | `/scripts/webhook-load-test.sh` | 12 KB |
| Docs | `/docs/WEBHOOK_TESTING_GUIDE.md` | 22 KB |
| Docs | `/docs/WEBHOOK_QUICK_REFERENCE.md` | 4.2 KB |
| Docs | `/docs/WEBHOOK_TESTING_EXAMPLES.md` | 14 KB |
| Index | `/docs/WEBHOOK_TESTING_INDEX.md` | This file |

**Total**: 86.6 KB (very lean, easy to maintain)

---

## Getting Help

1. **Quick lookup**: See [Quick Reference Card](./WEBHOOK_QUICK_REFERENCE.md)
2. **How to use**: See [Complete Guide](./WEBHOOK_TESTING_GUIDE.md)
3. **Real examples**: See [Example Workflows](./WEBHOOK_TESTING_EXAMPLES.md)
4. **Script help**: Run `./scripts/stripe-webhook-simulator.sh --help`
5. **Troubleshooting**: See [Common Issues](./WEBHOOK_TESTING_GUIDE.md#common-issues--fixes)

---

## Security Notes

All scripts follow security best practices:
- No hardcoded secrets
- Examples use placeholder values (whsec_test_xxxxx)
- Proper HMAC-SHA256 with salt and timestamp
- Environment variables not logged or printed
- Secure argument handling

---

## Version Info

- Created: June 7, 2026
- Compatible with: Stripe API 2024-04-10+
- Tested on: Linux, macOS, Alpine
- Dependencies: bash 4+, curl, openssl, jq (optional)

---

For detailed information, please refer to the specific documentation files listed above.
