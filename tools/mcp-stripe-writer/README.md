# DSG MCP Stripe Writer

Standalone MCP server for governed Stripe writer actions.

This package is additive only. It does not modify or disable the existing browser automation MCP server, browser tools, CLI, API routes, or webhook surfaces.

## Tools

```text
stripe_create_product
stripe_create_price
stripe_create_payment_link
```

## Required environment

```bash
STRIPE_SECRET_KEY=sk_live_or_sk_test
```

No Stripe secret is committed to the repo.

## Build and run

```bash
cd tools/mcp-stripe-writer
npm install
npm run build
npm run start
```

Development mode:

```bash
npm run dev
```

## DSG approval boundary

Each writer tool requires:

```json
{
  "mutationApproved": true,
  "approvalTicket": "DSG-APPROVAL-ID"
}
```

This is not a disabled function. It is the explicit DSG approval signal for an external billing mutation.

## Example inputs

Create product:

```json
{
  "name": "DSG Pro",
  "description": "DSG ONE Pro subscription",
  "mutationApproved": true,
  "approvalTicket": "DSG-PRICE-2026-06-20"
}
```

Create monthly price:

```json
{
  "product": "prod_xxx",
  "unit_amount": 9900,
  "currency": "usd",
  "recurring": {
    "interval": "month",
    "interval_count": 1
  },
  "mutationApproved": true,
  "approvalTicket": "DSG-PRICE-2026-06-20"
}
```

Create payment link:

```json
{
  "price": "price_xxx",
  "quantity": 1,
  "mutationApproved": true,
  "approvalTicket": "DSG-PRICE-2026-06-20"
}
```

## Evidence output

Each successful tool call returns structured JSON including:

```text
ok
tool
created Stripe object id
approvalTicket
evidenceHash
```

Record successful outputs in `docs/PRODUCTION_EVIDENCE_2026-06-20.md` before claiming live billing activation.
