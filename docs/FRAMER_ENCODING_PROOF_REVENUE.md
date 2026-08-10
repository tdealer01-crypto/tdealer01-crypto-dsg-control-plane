# Framer Product — DSG Encoding Proof Gate

## Product

**Name:** DSG Encoding Proof Gate

**Positioning:** Deterministic validation for QUBO/Ising encodings before solver execution.

**Default commercial offer:** DSG Governance Pro — **$99/month**.

**Truth boundary:** This product validates encoding structure and policy constraints and produces proof/audit identifiers. It does **not** by itself prove that the original problem was semantically formalized correctly.

## Customer flow

```text
Framer /encoding-proof
  ↓ Start Pro
DSG /framer/encoding-proof/checkout
  ↓ if not signed in
DSG login
  ↓ automatic return
POST /api/billing/checkout { plan: pro, interval: monthly }
  ↓
Stripe Checkout
  ↓ payment/subscription success
Existing DSG Stripe webhook + entitlement + quota/metering pipeline
  ↓
Customer receives governed DSG Pro access
```

No second Stripe catalogue or parallel entitlement system is introduced.

## Framer automation

The integration package is in:

```text
integrations/framer/encoding-proof/
├── EncodingProofProduct.tsx
├── package.json
└── publish.mjs
```

`publish.mjs` uses the Framer Server API to:

1. Connect to the target Framer project.
2. Create or update `EncodingProofProduct.tsx`.
3. Find or create `/encoding-proof`.
4. Insert or update the code component.
5. Publish a preview deployment.
6. Promote to production only when `FRAMER_DEPLOY_PRODUCTION=1`.

### Required secrets

Do not commit these values:

```bash
FRAMER_API_KEY=...
FRAMER_PROJECT_URL=https://framer.com/projects/<project-id>
```

Optional:

```bash
DSG_ENCODING_PROOF_CHECKOUT_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app/framer/encoding-proof/checkout
DSG_ENCODING_PROOF_DOCS_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app/docs
FRAMER_DEPLOY_PRODUCTION=0
```

### Run

```bash
cd integrations/framer/encoding-proof
npm install
npm run publish
```

Default behavior publishes a Framer preview only. Production promotion is intentionally fail-closed while the underlying Encoding Proof Gate release checks are not all green.

## Revenue behavior

The Framer CTA does not create a new Stripe product. It hands the customer to the existing DSG Pro billing route, so pricing, checkout, webhook processing, entitlement, quota and metering remain centralized.

Current canonical offer used by the product page:

- DSG Governance Pro
- USD 99/month

## Release gate

Do not set `FRAMER_DEPLOY_PRODUCTION=1` until all required checks for the Encoding Proof Gate are green, including security and production preview deployment.
