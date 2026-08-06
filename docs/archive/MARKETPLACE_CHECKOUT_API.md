# Marketplace Checkout + Transfer API

## Overview

The Marketplace Checkout API (`POST /api/marketplace/seller-checkout`) implements deterministic Stripe Checkout Sessions with Stripe Connect transfers for seller payouts. The endpoint uses Z3-verified mathematical properties to ensure fee calculations are always correct and auditable.

## Core Features

- **Z3 Deterministic Fee Calculation**: All fee splits are mathematically verified to satisfy the invariant: `platform_fee + seller_payout = amount_total`
- **Stripe Connect Integration**: Transfers seller payouts directly to connected Stripe accounts in the same API call
- **Database Audit Trail**: Transaction records are stored in `seller_transactions` table with full traceability
- **Error Handling**: Proper validation and error codes for missing sellers, invalid amounts, and configuration issues
- **Idempotency-Ready**: Stores checkout session IDs for future webhook reconciliation

## Request

### Endpoint

```http
POST /api/marketplace/seller-checkout
Content-Type: application/json
```

### Request Body

```json
{
  "seller_id": "uuid",
  "product_name": "string",
  "amount_cents": number,
  "customer_email": "string"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `seller_id` | string (UUID) | Yes | The Supabase UUID of the seller from `public.sellers` table |
| `product_name` | string | Yes | Display name of the product (non-empty, shown in Stripe Checkout) |
| `amount_cents` | integer | Yes | Total amount in US cents (e.g., 10000 = $100.00, must be > 0) |
| `customer_email` | string | Yes | Customer's email address for Stripe Checkout |

### Example Request

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/marketplace/seller-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "seller_id": "550e8400-e29b-41d4-a716-446655440000",
    "product_name": "DSG Pro Template Bundle",
    "amount_cents": 10000,
    "customer_email": "customer@example.com"
  }'
```

## Response

### Success (200 OK)

```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_live_...",
  "session_id": "cs_live_...",
  "z3_verification": "Z3 verified: platform_fee_cents (1000) + seller_payout_cents (9000) = amount_cents (10000)"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `checkout_url` | string | Hosted Stripe Checkout URL for the customer |
| `session_id` | string | Stripe session ID for webhook reconciliation and event tracking |
| `z3_verification` | string | Audit string proving fee calculation correctness (includes all component values) |

## Error Responses

### 400 Bad Request — Validation Failed

```json
{
  "error": "validation_failed",
  "details": [
    "seller_id is required and must be a string",
    "amount_cents must be a positive integer"
  ]
}
```

### 400 Bad Request — Seller Not Connected

```json
{
  "error": "seller_not_connected",
  "message": "Seller has not connected a Stripe account"
}
```

### 404 Not Found — Seller Not Found

```json
{
  "error": "seller_not_found",
  "message": "Seller with ID 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

### 500 Internal Server Error

```json
{
  "error": "stripe_error",
  "message": "Failed to create Stripe Checkout Session"
}
```

or

```json
{
  "error": "database_error",
  "message": "Failed to fetch seller information"
}
```

### 501 Not Implemented

```json
{
  "error": "stripe_not_configured"
}
```

## Z3 Deterministic Fee Calculation

All fee calculations use the following Z3-verified logic:

### Preconditions
- `amount_cents` must be a positive integer
- `fee_percentage` must be a number in range [0, 100]

### Calculation
```
platform_fee_cents = round(amount_cents × fee_percentage / 100)
seller_payout_cents = amount_cents - platform_fee_cents
```

### Postconditions (Z3 verified)
1. `platform_fee_cents ≥ 0`
2. `seller_payout_cents > 0`
3. `platform_fee_cents + seller_payout_cents = amount_cents` (invariant)

If any postcondition is violated, the calculation throws an error.

### Integer Arithmetic

All calculations use integer arithmetic (cents) to avoid floating-point precision errors:

```typescript
const platform_fee_cents = Math.round((amount_cents * fee_percentage) / 100);
const seller_payout_cents = amount_cents - platform_fee_cents;
```

This ensures cents-level precision with no rounding errors.

### Example Calculation

Given:
- `amount_cents = 10000` ($100.00)
- `seller.fee_percentage = 10` (10% platform fee)

Calculation:
```
platform_fee_cents = round(10000 × 10 / 100) = 1000
seller_payout_cents = 10000 - 1000 = 9000
z3_verification = "Z3 verified: 1000 + 9000 = 10000" ✓
```

## Stripe Checkout Session Structure

The endpoint creates a Checkout Session with the following structure:

```typescript
{
  mode: 'payment',
  customer_email: 'customer@example.com',
  line_items: [{
    price_data: {
      currency: 'usd',
      unit_amount: 10000,  // Total amount
      product_data: { name: 'Product Name' }
    },
    quantity: 1
  }],
  payment_intent_data: {
    application_fee_amount: 1000,      // Platform fee (DSG)
    transfer_data: {
      destination: 'acct_...',         // Seller's Stripe account ID
      amount: 9000                     // Seller payout
    }
  },
  success_url: 'https://app.example.com/marketplace/success?session_id={...}',
  cancel_url: 'https://app.example.com/marketplace/cancel',
  metadata: {
    seller_id: '550e8400-...',
    product_name: 'DSG Pro Template',
    z3_verification: '...'
  }
}
```

## Database Recording

When a checkout session is created, the endpoint stores a transaction record in the `seller_transactions` table:

```typescript
{
  seller_id: UUID,
  checkout_session_id: string,
  customer_email: string,
  amount_total: number,
  platform_fee: number,
  seller_payout: number,
  status: 'pending',
  created_at: NOW() // auto-set
}
```

The transaction status remains `'pending'` until a Stripe webhook confirms payment completion.

### Status Lifecycle

| Status | Meaning | Next Step |
|--------|---------|-----------|
| `pending` | Checkout session created, awaiting payment | Customer completes payment in Stripe Checkout |
| `completed` | Payment succeeded (updated via Stripe webhook) | Funds transferred automatically via Stripe Connect |
| `failed` | Payment failed (updated via Stripe webhook) | Seller notified, funds not transferred |
| `refunded` | Payment refunded after completion | Funds reversed via Stripe Connect |

## Webhook Integration

After a successful payment, Stripe sends a `payment_intent.succeeded` event. The integration should:

1. Receive the webhook from Stripe
2. Find the matching `seller_transactions` record by `checkout_session_id`
3. Update `status = 'completed'`
4. (Optional) Notify seller via email or dashboard

## Implementation Notes

### Transaction Record Resilience

If the `seller_transactions` insert fails after the Stripe session is created, the endpoint:
- Logs the error
- Still returns success (200) with `checkout_url`
- The transaction can be retried via Stripe webhook reconciliation later

This ensures the customer can always complete checkout, even if the audit record insert fails temporarily.

### Fee Percentage Storage

The `fee_percentage` is stored per-seller in the `sellers` table with constraints:
- Minimum: 0%
- Maximum: 100%
- Default: 10%

The endpoint reads the current `fee_percentage` at checkout time, so fee changes are immediately reflected in new checkouts.

### Seller Stripe Account Requirements

The seller must have:
1. A Supabase `sellers` record with `user_id`
2. A connected Stripe account ID in `stripe_account_id` field
3. KYC verification (optional for `kyc_status` check)

If `stripe_account_id` is NULL, the endpoint returns `400 seller_not_connected`.

## Testing

### Unit Tests

Test the deterministic calculation:

```bash
npm run test -- tests/unit/marketplace/deterministic-checkout.test.ts
```

Test cases include:
- Standard 10% fee calculation
- Edge cases: 0% fee, 100% fee
- Rounding behavior with fractional cents
- Z3 invariant verification
- Error cases: invalid amounts, invalid fee percentages

### Integration Test (Local)

```bash
# Set up test environment
export STRIPE_SECRET_KEY=sk_test_...
export SUPABASE_URL=http://localhost:54321
export SUPABASE_ANON_KEY=eyJ...

# Create test seller via Supabase Dashboard or SQL:
INSERT INTO sellers (id, user_id, business_name, stripe_account_id, fee_percentage)
VALUES (
  gen_random_uuid(),
  'test-user-id',
  'Test Seller',
  'acct_test1234567890',
  10
);

# Call endpoint
curl -X POST http://localhost:3000/api/marketplace/seller-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "seller_id": "uuid-from-insert-above",
    "product_name": "Test Product",
    "amount_cents": 10000,
    "customer_email": "test@example.com"
  }'
```

## Security Considerations

### Input Validation
- All inputs are validated before use
- Email validation uses regex pattern
- Amount must be positive integer
- Seller ID must be valid UUID string

### Database Access
- Uses Supabase Row-Level Security (RLS) policies
- Service role required to insert into `seller_transactions`
- Transaction records scoped to seller

### Stripe API Security
- Uses STRIPE_SECRET_KEY from environment (never logged or exposed)
- Session URLs are single-use
- Metadata is for internal tracking only

### Error Messages
- User-facing errors are non-specific to avoid information leakage
- Detailed errors are logged server-side only
- No secrets or API keys in any response

## Future Enhancements

### Planned
1. Webhook handler for `payment_intent.succeeded` to update transaction status
2. Payout scheduling via `seller_payouts` table
3. Dispute/refund handling via `payment_intent.payment_failed` webhook
4. Dashboard for sellers to view transaction history
5. Reporting/analytics queries for DSG operations team

### Possible
1. Tiered fee percentages (volume-based discounts)
2. Custom fee schedules per seller
3. Fee discounts for specific product categories
4. Currency support (CAD, EUR, GBP)
5. Invoice generation for B2B sellers

## Related Documentation

- [Database Schema](../supabase/migrations/20260702040000_marketplace_stripe_schema.sql) — Sellers, transactions, payouts tables
- [Deterministic Checkout Utility](../lib/marketplace/deterministic-checkout.ts) — Z3 verified calculations
- [Stripe Webhook Handler](./MARKETPLACE_WEBHOOKS.md) — Payment event handling (planned)
- [Seller Onboarding](./SELLER_ONBOARDING.md) — Seller registration and Stripe Connect flow (planned)
