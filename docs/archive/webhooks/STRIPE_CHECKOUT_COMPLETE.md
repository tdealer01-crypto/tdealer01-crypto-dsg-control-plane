# Stripe Checkout Complete Webhook Handler

## Overview

The webhook handler at `/api/webhooks/stripe/checkout-complete` processes `checkout.session.completed` events from Stripe and implements Z3-style deterministic verification of fee calculations.

**Endpoint:** `POST /api/webhooks/stripe/checkout-complete`

**Event Type:** `checkout.session.completed`

## Architecture

### Core Flow

```
Stripe Event → Signature Verification → Transaction Lookup → Z3 Fee Verification → DB Updates → Audit Logging → Response
```

### Components

1. **Webhook Receiver**: Listens for Stripe POST requests
2. **Signature Verification**: Validates event authenticity using `STRIPE_WEBHOOK_SECRET`
3. **Transaction Finder**: Looks up transaction by `checkout_session_id` in `seller_transactions`
4. **Z3 Verifier**: Deterministically verifies fee calculations
5. **Transaction Updater**: Marks transaction as 'completed' in DB
6. **Payout Creator**: Creates corresponding record in `seller_payouts`
7. **Audit Logger**: Logs event to `marketplace_payment_audit` for compliance

## Z3 Deterministic Verification

The webhook implements deterministic verification of the following constraints:

### Constraint 1: Fee Calculation
```
platform_fee = amount_total × (fee_percentage / 100)
```

Example:
- `amount_total` = 10000 cents ($100.00)
- `fee_percentage` = 10
- `platform_fee` = 10000 × (10 / 100) = 1000 cents ($10.00) ✓

### Constraint 2: Payout Calculation
```
seller_payout = amount_total - platform_fee
```

Example:
- `amount_total` = 10000 cents ($100.00)
- `platform_fee` = 1000 cents ($10.00)
- `seller_payout` = 10000 - 1000 = 9000 cents ($90.00) ✓

### Verification Status

The webhook returns one of three verification statuses:

- **PASS**: Both constraints verified successfully
- **FAILED**: One or more constraints violated
- **BLOCK**: Configuration missing (seller fee_percentage not found)

When verification **PASSES**:
1. A deterministic proof hash is generated
2. Transaction status is updated to 'completed'
3. Seller payout record is created with status 'pending'
4. Success is logged to audit table with proof hash

When verification **FAILS**:
1. Failure reason is logged
2. Transaction status remains 'pending'
3. Payout is NOT created
4. Failure is logged to audit table
5. Webhook returns 200 OK (prevents Stripe retry)

## Database Schema

### seller_transactions
```sql
CREATE TABLE seller_transactions (
  id uuid PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES sellers(id),
  checkout_session_id text UNIQUE NOT NULL,
  customer_email text NOT NULL,
  amount_total bigint NOT NULL,          -- in cents
  platform_fee bigint NOT NULL,          -- in cents
  seller_payout bigint NOT NULL,         -- in cents
  status text DEFAULT 'pending',         -- pending, completed, refunded, failed
  created_at timestamptz DEFAULT now()
);
```

### seller_payouts
```sql
CREATE TABLE seller_payouts (
  id uuid PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES sellers(id),
  amount bigint NOT NULL,                -- in cents
  stripe_payout_id text,                 -- from payment_intent.id
  status text DEFAULT 'pending',         -- pending, in_transit, paid, failed, cancelled
  created_at timestamptz DEFAULT now()
);
```

### marketplace_payment_audit
```sql
CREATE TABLE marketplace_payment_audit (
  id uuid PRIMARY KEY,
  product_id uuid REFERENCES marketplace_products(id),
  org_id uuid REFERENCES organizations(id),
  user_id uuid REFERENCES users(id),
  stripe_session_id text,
  event_type text NOT NULL,              -- checkout_completed, checkout_verification_failed
  amount_cents integer,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
```

## Implementation Details

### File Location
`/app/api/webhooks/stripe/checkout-complete/route.ts`

### Key Functions

#### `verifyFeeCalculation()`
Implements the Z3-style deterministic verification logic.

**Inputs:**
- `amountTotal`: Total transaction amount in cents
- `platformFee`: Platform fee amount in cents
- `sellerPayout`: Seller payout amount in cents
- `feePercentage`: Seller's fee percentage (e.g., 10.0)

**Process:**
1. Verify: `platformFee === Math.round(amountTotal × (feePercentage / 100))`
2. Verify: `sellerPayout === amountTotal - platformFee`
3. Generate deterministic proof hash

**Returns:** `WebhookVerificationResult`
```typescript
{
  ok: boolean,
  verified: boolean,
  reason: string,
  proofHash?: string,
  amountTotal?: number,
  platformFee?: number,
  sellerPayout?: number,
  feePercentage?: number
}
```

#### `findTransactionByCheckoutSessionId()`
Looks up seller transaction by Stripe checkout session ID.

#### `getSellerFeePercentage()`
Fetches the seller's configured fee percentage from the `sellers` table.

#### `updateTransactionStatus()`
Updates transaction status to 'completed' in the database.

#### `createSellerPayout()`
Creates a new payout record in `seller_payouts` table.

#### `logToAuditTable()`
Logs webhook event to `marketplace_payment_audit` for compliance and auditing.

## Request/Response

### Request (from Stripe)
```http
POST /api/webhooks/stripe/checkout-complete
stripe-signature: t=<timestamp>,v1=<signature>
content-type: application/json

{
  "id": "evt_1234567890",
  "type": "checkout.session.completed",
  "created": 1234567890,
  "data": {
    "object": {
      "id": "cs_test_mock_session_123",
      "type": "checkout.session",
      "amount_total": 10000,
      "payment_intent": "pi_test_mock_intent_456",
      "customer_email": "buyer@example.com",
      "metadata": {}
    }
  }
}
```

### Response - Success (200 OK)
```json
{
  "ok": true,
  "received": true,
  "type": "checkout.session.completed",
  "transaction_id": "txn_123456",
  "message": "Checkout completed and payout created",
  "verification": {
    "status": "PASSED",
    "proof_hash": "proof_hash_abc123def456",
    "reason": "Z3 verified: Fee calc matches stored transaction"
  }
}
```

### Response - Transaction Not Found (200 OK)
```json
{
  "ok": true,
  "message": "Transaction not found",
  "warning": "transaction_not_found",
  "type": "checkout.session.completed"
}
```

### Response - Verification Failed (200 OK)
```json
{
  "ok": false,
  "error": "Fee verification failed",
  "details": "Z3 verified: Fee calculation mismatch. Expected platform_fee=1000, got 999"
}
```

### Response - Configuration Error (503)
```json
{
  "error": "Webhook processing unavailable"
}
```

## Configuration

### Environment Variables Required

```bash
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx
```

### Stripe Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add Endpoint"
3. Set URL: `https://your-domain.com/api/webhooks/stripe/checkout-complete`
4. Select events: `checkout.session.completed`
5. Copy the Webhook Secret and set as `STRIPE_WEBHOOK_SECRET`

## Testing

### Unit Tests
Location: `tests/integration/webhooks-stripe-checkout-complete.test.ts`

Run tests:
```bash
npm run test:integration -- webhooks-stripe-checkout-complete
```

### Manual Testing with Stripe CLI

```bash
# 1. Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# 2. Login to your Stripe account
stripe login

# 3. Forward webhook events to local endpoint
stripe listen --forward-to localhost:3000/api/webhooks/stripe/checkout-complete

# 4. Trigger test event
stripe trigger checkout.session.completed

# 5. Watch webhook processing logs
# Output will show in the CLI and your server logs
```

### Integration Testing

1. Create a test seller in the database:
```sql
INSERT INTO sellers (user_id, business_name, fee_percentage)
VALUES ('user-id-123', 'Test Seller', 10.0);
```

2. Create a test transaction:
```sql
INSERT INTO seller_transactions (
  seller_id,
  checkout_session_id,
  customer_email,
  amount_total,
  platform_fee,
  seller_payout,
  status
)
VALUES (
  'seller-id-123',
  'cs_test_123',
  'buyer@example.com',
  10000,
  1000,
  9000,
  'pending'
);
```

3. Send webhook request:
```bash
curl -X POST http://localhost:3000/api/webhooks/stripe/checkout-complete \
  -H "stripe-signature: $(stripe trigger-signature)" \
  -H "content-type: application/json" \
  -d '{
    "id": "evt_test_123",
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_123",
        "amount_total": 10000,
        "payment_intent": "pi_test_123",
        "customer_email": "buyer@example.com"
      }
    }
  }'
```

4. Verify database updates:
```sql
-- Check transaction status
SELECT id, status FROM seller_transactions WHERE checkout_session_id = 'cs_test_123';

-- Check payout created
SELECT id, amount, status FROM seller_payouts WHERE seller_id = 'seller-id-123';

-- Check audit log
SELECT event_type, metadata FROM marketplace_payment_audit WHERE stripe_session_id = 'cs_test_123';
```

## Error Handling

### Missing Webhook Secret
- **Status**: 503 Service Unavailable
- **Message**: "Webhook processing unavailable"
- **Cause**: `STRIPE_WEBHOOK_SECRET` not configured in environment

### Invalid Signature
- **Status**: 400 Bad Request
- **Message**: "Invalid signature"
- **Cause**: Webhook signature verification failed

### Transaction Not Found
- **Status**: 200 OK (intentional)
- **Message**: "Transaction not found"
- **Reason**: No matching `checkout_session_id` in database
- **Action**: Webhook is acknowledged; Stripe won't retry

### Fee Verification Failed
- **Status**: 200 OK (intentional)
- **Message**: "Fee verification failed"
- **Reason**: Stored fee/payout values don't match calculated values
- **Action**: Webhook is acknowledged; manual investigation required

### Database Update Failed
- **Status**: 500 Internal Server Error
- **Message**: "Failed to update transaction" or "Failed to create payout"
- **Reason**: Database write error
- **Action**: Stripe will retry webhook

## Security Considerations

1. **Signature Verification**: All webhooks are verified using HMAC-SHA256 with `STRIPE_WEBHOOK_SECRET`
2. **Service Role Only**: Database writes use Supabase service role (secure backend)
3. **No Raw Secret Export**: Webhook secret never appears in logs or responses
4. **Transaction Idempotency**: Webhook returns 200 OK even for already-processed events to prevent duplicates
5. **Deterministic Verification**: Fee calculations cannot be tampered with without detection
6. **Audit Trail**: All events logged to `marketplace_payment_audit` with proof hash

## Monitoring and Debugging

### Logs to Check
- Application logs: Webhook receipt and processing
- Supabase logs: Database write errors
- Stripe Dashboard: Webhook delivery status and retry attempts

### Common Issues

**Issue**: Webhook returns 500 after successful Stripe verification
```
Likely cause: Supabase connection failure
Solution: Check SUPABASE_SERVICE_ROLE_KEY and database permissions
```

**Issue**: Fee verification fails with "Fee calculation mismatch"
```
Likely cause: Transaction stored with incorrect fee/payout amounts
Solution: Manually investigate transaction creation; check seller's fee_percentage
```

**Issue**: Payout not created despite transaction status updated
```
Likely cause: seller_payouts insert policy issue
Solution: Verify RLS policy allows service_role inserts
```

## Proof Hash Generation

The proof hash is a deterministic SHA256 hash of the verification data:

```typescript
{
  type: 'fee_calculation_verification',
  constraints: {
    fee_equation: 'platform_fee = amount_total * (fee_percentage / 100)',
    payout_equation: 'seller_payout = amount_total - platform_fee',
  },
  values: {
    amount_total: 10000,
    platform_fee: 1000,
    seller_payout: 9000,
    fee_percentage: 10,
  },
  verification_status: 'PASS',
  timestamp: '2026-07-02T12:00:00.000Z',
}
```

**Same input always produces same hash** → Deterministic verification ✓

## Future Enhancements

1. **Refund Handling**: Process `charge.refunded` events
2. **Retry Logic**: Implement exponential backoff for transient failures
3. **Batch Payouts**: Aggregate payouts and dispatch periodically
4. **Webhook Replay**: Implement endpoint to manually replay failed webhooks
5. **Metrics**: Add webhook processing metrics (success rate, latency, etc.)

## Related Documentation

- [Stripe Checkout Documentation](https://stripe.com/docs/payments/checkout)
- [Webhook Signing Guide](https://stripe.com/docs/webhooks/signatures)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Deterministic Execution Protocol](../DETERMINISTIC_EXECUTION_PROTOCOL_10X_2026-04-11.md)
