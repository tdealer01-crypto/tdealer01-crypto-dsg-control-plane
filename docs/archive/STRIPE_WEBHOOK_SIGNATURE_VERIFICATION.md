# Stripe Webhook Signature Verification Guide

This guide explains the technical details of verifying Stripe webhook signatures, including the algorithm, formula, and security best practices.

## Overview

When Stripe sends a webhook to your endpoint, it includes a `stripe-signature` header that cryptographically proves the request came from Stripe and hasn't been modified. Verifying this signature is **critical** for security.

**Requirements:**

- Raw request body (not parsed JSON) — the exact bytes Stripe sent
- Signature header from Stripe: `stripe-signature`
- Signing secret from Stripe Dashboard: `STRIPE_WEBHOOK_SECRET`
- HMAC-SHA256 hashing algorithm

---

## 1. Raw Body Requirement

The **most common signature verification failure** is using a parsed JSON body instead of the raw request body.

### Why Raw Body Matters

Stripe computes the signature using the exact bytes of the request body:

```
HMAC-SHA256(secret, timestamp.raw_body)
```

If you parse the body to JSON and re-stringify it, the byte representation changes:

```typescript
// Raw body (what Stripe signed)
const rawBody = '{"id":"evt_1","type":"charge.created"}';

// Parsed and re-stringified (loses formatting, different bytes)
const jsonData = JSON.parse(rawBody);
const restringified = JSON.stringify(jsonData);

// These are different!
rawBody !== restringified  // true
```

The signature was computed on `rawBody`, so verifying against `restringified` fails.

### Correct Implementation

Always read the body as raw text **first**, before any parsing:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  // Step 1: Read raw body
  const body = await req.text(); // ← Raw bytes, not JSON

  // Step 2: Get signature header
  const sig = req.headers.get('stripe-signature');

  // Step 3: Verify signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, secret!);
  } catch (err) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  // Step 4: Now you can parse the event as JSON
  // event.data.object contains parsed JSON
}
```

### What NOT to Do

```typescript
// ❌ WRONG: Parse body first, then verify signature
const jsonData = await req.json(); // Body is consumed
const body = JSON.stringify(jsonData); // Different bytes!
const event = stripe.webhooks.constructEvent(body, sig!, secret!); // Fails

// ❌ WRONG: Parse body as stream (can't re-read)
const stream = req.body; // Body is a stream
const text = await stream.text(); // Consumes stream
const sig = req.headers.get('stripe-signature');
// Can't read body again for verification

// ❌ WRONG: Using published key instead of signing secret
const secret = process.env.STRIPE_PUBLISHABLE_KEY; // Wrong!
const event = stripe.webhooks.constructEvent(body, sig!, secret); // Fails
```

---

## 2. HMAC-SHA256 Algorithm

Stripe uses HMAC (Hash-Based Message Authentication Code) with SHA-256 hashing.

### Mathematical Formula

```
signature = HMAC-SHA256(secret, message)
message = timestamp + "." + json_body
```

### Step-by-Step Verification

**Input:**

- `secret` = signing secret from Stripe Dashboard (e.g., `[YOUR_WEBHOOK_SECRET]...`)
- `timestamp` = Unix timestamp (from signature header, e.g., `1614556800`)
- `body` = raw JSON body bytes (exact string Stripe sent)

**Process:**

1. Extract timestamp from signature header:
   ```
   stripe-signature: t=1614556800,v1=abc123...
   ```

2. Reconstruct the message to verify:
   ```
   signed_content = "1614556800.{json_body}"
   ```

3. Compute HMAC:
   ```
   computed_signature = HMAC-SHA256(secret, signed_content)
   ```

4. Compare with header value (constant-time comparison):
   ```
   header_signature == computed_signature ?
   ```

### TypeScript Implementation (Manual)

If you need to verify without using the Stripe SDK:

```typescript
import crypto from 'crypto';

function verifyStripeSignature(
  body: string,
  sigHeader: string,
  secret: string,
  tolerance: number = 300 // 5 minutes in seconds
): boolean {
  // Parse signature header: t=timestamp,v1=hash,v0=old_hash
  const parts = sigHeader.split(',');
  let timestamp: string | null = null;
  let signatures: string[] = [];

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') {
      timestamp = value;
    } else if (key === 'v1') {
      signatures.push(value);
    }
  }

  if (!timestamp || signatures.length === 0) {
    return false; // Malformed header
  }

  // Check timestamp is within tolerance
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > tolerance) {
    return false; // Timestamp too old or from future
  }

  // Construct signed content
  const signedContent = `${timestamp}.${body}`;

  // Compute expected signature
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedContent, 'utf-8')
    .digest('hex');

  // Constant-time comparison (prevent timing attacks)
  for (const sig of signatures) {
    if (crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))) {
      return true;
    }
  }

  return false;
}
```

**Usage:**

```typescript
const body = await req.text();
const sig = req.headers.get('stripe-signature');
const secret = process.env.STRIPE_WEBHOOK_SECRET!;

if (!verifyStripeSignature(body, sig, secret)) {
  return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
}
```

---

## 3. Signature Header Format

The `stripe-signature` header contains multiple pieces of information:

```
stripe-signature: t=1614556800,v1=abc123xyz,v0=old_signature
```

### Components

| Part | Meaning | Example |
|------|---------|---------|
| `t` | Timestamp (Unix epoch) | `1614556800` |
| `v1` | Current signature (HMAC-SHA256) | `abc123xyz...` |
| `v0` | Old signature (deprecated) | `def456uvw...` |

### Parsing Example

```typescript
function parseSignatureHeader(header: string): { t: string; v1: string } {
  const parts = header.split(',');
  const parsed: { t?: string; v1?: string } = {};

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't' || key === 'v1') {
      parsed[key] = value;
    }
  }

  if (!parsed.t || !parsed.v1) {
    throw new Error('Invalid signature header');
  }

  return { t: parsed.t, v1: parsed.v1 };
}
```

---

## 4. Timestamp Validation

The timestamp proves the webhook was sent recently, protecting against replay attacks.

### 5-Minute Tolerance Window

Stripe recommends accepting webhooks within a 5-minute (300 second) window:

```typescript
function isTimestampValid(
  timestamp: number,
  toleranceSeconds: number = 300
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const difference = Math.abs(now - timestamp);
  return difference <= toleranceSeconds;
}
```

### Why This Matters

**Scenario: Replay Attack**

1. Attacker intercepts a webhook: `stripe-signature: t=1614556800,v1=xxx`
2. Attacker replays it to your endpoint
3. Your code verifies signature (correct)
4. But timestamp is old (sent 1 hour ago)
5. You reject it because it's outside 5-minute window

**How to Implement:**

```typescript
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;

  // Parse signature header
  const sigParts = new URLSearchParams(sig.replace(/,/g, '&'));
  const timestamp = parseInt(sigParts.get('t')!, 10);
  const headerSig = sigParts.get('v1')!;

  // Check timestamp freshness
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > 300) {
    return NextResponse.json({ error: 'request_too_old' }, { status: 400 });
  }

  // Verify signature
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  // Process event
  return NextResponse.json({ received: true });
}
```

---

## 5. Security Best Practices

### 5.1 Use the Stripe SDK (Recommended)

The Stripe SDK handles all verification automatically:

```typescript
// Stripe SDK handles:
// - Raw body reading
// - Signature parsing
// - HMAC computation
// - Timestamp validation
// - Constant-time comparison

const event = stripe.webhooks.constructEvent(body, sig, secret);
```

**Never implement verification manually unless you have a specific reason.**

### 5.2 Constant-Time Comparison

Always use `crypto.timingSafeEqual()` instead of `===` to prevent timing attacks:

```typescript
// ❌ WRONG: Regular comparison (vulnerable to timing attacks)
if (computedSig === headerSig) { ... }

// ✓ CORRECT: Constant-time comparison
if (crypto.timingSafeEqual(Buffer.from(computedSig), Buffer.from(headerSig))) {
  ...
}
```

**Why?** If the comparison fails at the first character, it's microseconds faster than if it fails at the last character. An attacker can measure response times to guess the signature.

### 5.3 Fail Closed

If signature verification fails, reject the webhook:

```typescript
try {
  event = stripe.webhooks.constructEvent(body, sig, secret);
} catch (err) {
  // ✓ Return 400 — reject the webhook
  return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
}
```

**Important:** Return `4xx` status (e.g., `400`, `401`), not `5xx`. This tells Stripe not to retry.

Stripe will:

- Log the failed delivery
- Stop retrying if you consistently return `4xx`
- Let you know via the dashboard

### 5.4 Never Log Signatures

Never log the raw signature or secret:

```typescript
// ❌ WRONG: Logging secrets
console.log(`Secret: ${secret}`);
console.log(`Signature: ${sig}`);

// ✓ OK: Log only the outcome
console.log('Webhook signature verified');
console.error('Webhook signature verification failed');
```

### 5.5 Require HTTPS in Production

Stripe only sends to HTTPS endpoints in production:

```typescript
// Development (local)
http://localhost:3000/api/stripe/webhook/events ← OK

// Production
https://example.com/api/stripe/webhook/events ← Required
```

If you try to register an HTTP endpoint in production, Stripe will reject it.

### 5.6 Store Secrets as Environment Variables

Never hardcode secrets:

```typescript
// ❌ WRONG
const secret = '[YOUR_WEBHOOK_SECRET]...';

// ✓ CORRECT
const secret = process.env.STRIPE_WEBHOOK_SECRET;
if (!secret) {
  throw new Error('STRIPE_WEBHOOK_SECRET not configured');
}
```

Verify at startup:

```typescript
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const apiKey = process.env.STRIPE_SECRET_KEY;

  if (!secret || !apiKey) {
    // ✓ Return 500 — tells Stripe to retry
    return NextResponse.json(
      { error: 'stripe_not_configured' },
      { status: 500 }
    );
  }

  // Continue with verification
}
```

---

## 6. Common Verification Failures and Fixes

### 6.1 "Cannot read property 'text' of undefined"

**Cause:** Request body was already consumed

**Error:**

```
Cannot read property 'text' of undefined
    at POST (app/api/stripe/webhook/route.ts:15)
```

**Fix:**

```typescript
// ❌ WRONG: Body can only be read once
const json1 = await req.json();
const json2 = await req.json(); // Fails

// ✓ CORRECT: Read as text only once
const body = await req.text();
const event = stripe.webhooks.constructEvent(body, sig, secret);
// event.data.object is already parsed JSON
```

### 6.2 "Invalid signature" on Every Webhook

**Possible Causes:**

1. Wrong signing secret (e.g., API key instead of webhook secret)
2. Body modified before verification
3. Signature header missing

**Debugging:**

```typescript
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  console.log('Signature header:', sig);
  console.log('Body length:', body.length);
  console.log('Body first 100 chars:', body.substring(0, 100));
  console.log('Secret exists:', !!secret);
  console.log('Secret format:', secret?.substring(0, 10));

  try {
    const event = stripe.webhooks.constructEvent(body, sig!, secret!);
    console.log('Signature valid');
  } catch (err) {
    console.error('Signature error:', err.message);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }
}
```

**Fix Checklist:**

- [ ] Is `STRIPE_WEBHOOK_SECRET` set? (not `STRIPE_SECRET_KEY`)
- [ ] Does it start with `whsec_`?
- [ ] Is body read with `await req.text()` before any parsing?
- [ ] Is `stripe-signature` header present?

### 6.3 "Timestamp Too Old" or "Timestamp Too New"

**Cause:** System clock is out of sync

**Error:**

```
Timestamp outside tolerance window
```

**Fix:**

```bash
# Sync system clock
ntpdate -s time.nist.gov
# or
timedatectl set-ntp true
```

### 6.4 Signature Valid Locally, but Not in Production

**Possible Causes:**

1. Different signing secret in production
2. Different middleware modifying the body
3. Request body buffering issue

**Debugging:**

1. Verify Stripe Dashboard signing secret matches `STRIPE_WEBHOOK_SECRET` in Vercel
2. Check if any middleware is reading/modifying the body:
   ```typescript
   // middleware.ts — ensure it doesn't touch /api/stripe/webhook
   if (req.nextUrl.pathname.startsWith('/api/stripe/webhook')) {
     return NextResponse.next();
   }
   ```
3. Test with Stripe CLI locally:
   ```bash
   stripe listen --forward-to https://[your-production-url]/api/stripe/webhook/events
   stripe trigger charge.created
   ```

### 6.5 "Missing stripe-signature Header"

**Cause:** Stripe webhook not arriving with signature header, or middleware stripped it

**Fix:**

```typescript
const sig = req.headers.get('stripe-signature');
if (!sig) {
  return NextResponse.json(
    { error: 'missing_signature_header' },
    { status: 400 }
  );
}
```

Check that middleware doesn't remove headers:

```typescript
// middleware.ts — preserve all headers for webhook endpoint
export const config = {
  matcher: [
    // Exclude webhook endpoint
    '/((?!api/stripe/webhook).*)',
  ],
};
```

---

## 7. Testing Webhook Signatures

### 7.1 Using Stripe Dashboard

1. Go to Developers → Webhooks → Your endpoint
2. Click **Send test event**
3. Stripe computes and sends a valid signature
4. Your endpoint should verify successfully

### 7.2 Using Stripe CLI

```bash
# Start listening
stripe listen --forward-to localhost:3000/api/stripe/webhook/events
# Output: Webhook signing secret: [YOUR_WEBHOOK_SECRET]_xxx

# In another terminal, send event
stripe trigger charge.created

# Check local server logs for "Signature verified"
```

### 7.3 Using Manual cURL (with computed signature)

See `/scripts/test-stripe-webhook.sh` for an automated script.

**Manual computation:**

```bash
#!/bin/bash

SECRET="[YOUR_WEBHOOK_SECRET]_xxx"
TIMESTAMP=$(date +%s)
BODY='{"id":"evt_test","type":"charge.created","data":{"object":{"id":"ch_1","amount":1000}}}'

# Compute signature
SIGNED_CONTENT="${TIMESTAMP}.${BODY}"
SIGNATURE=$(echo -n "$SIGNED_CONTENT" | openssl dgst -sha256 -mac HMAC -macopt key="$SECRET" | sed 's/^.* //')

# Send webhook
curl -X POST http://localhost:3000/api/stripe/webhook/events \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=${TIMESTAMP},v1=${SIGNATURE}" \
  -d "$BODY"
```

---

## 8. Integration with Monitoring

### 8.1 Log Webhook Events

```typescript
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, secret!);
  } catch (err) {
    console.error('[STRIPE_WEBHOOK_FAIL]', {
      error: err.message,
      signature: sig ? 'present' : 'missing',
      bodyLength: body.length,
      timestamp: new Date(),
    });
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  console.log('[STRIPE_WEBHOOK_OK]', {
    eventId: event.id,
    eventType: event.type,
    eventTs: new Date(event.created * 1000),
    timestamp: new Date(),
  });

  // Process event
}
```

### 8.2 Set Up Alerts

Monitor for:

- High frequency of `invalid_signature` errors
- Signature verification timeouts
- Missing `STRIPE_WEBHOOK_SECRET` configuration

---

## References

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Webhook Signing Secret](https://stripe.com/docs/webhooks/signatures)
- [HMAC Specification](https://tools.ietf.org/html/rfc2104)
- [Constant-Time Comparison](https://codahale.com/a-lesson-in-timing-attacks/)
- [Replay Attack Prevention](https://owasp.org/www-community/attacks/Replay_attack)
