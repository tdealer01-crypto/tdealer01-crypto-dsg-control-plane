# DSG Stripe App

Pre-execution governance gates for Stripe operations with compliance evidence and approval workflows.

## Overview

The DSG Stripe App extends DSG ONE's control plane to Stripe by:

- **Gating Stripe operations** (charges, payouts, refunds) before execution
- **Enforcing approval workflows** for high-risk transactions
- **Collecting compliance evidence** with immutable audit trails
- **Distributing via Stripe App Marketplace** to reach Stripe merchants

## Project Structure

```
packages/stripe-app/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Hono app initialization
│   ├── lib/
│   │   ├── dsg-client.ts     # DSG SDK wrapper
│   │   ├── policy-cache.ts   # Redis cache layer (TODO: Phase 5)
│   │   └── fail-safe-config.ts # Fail-safe mode config (TODO: Phase 5)
│   ├── adapters/
│   │   └── stripe-to-dsg-gate.ts # Stripe → DSG request mapping (TODO: Phase 2)
│   ├── handlers/
│   │   ├── webhook-handler.ts    # Webhook processing (TODO: Phase 2)
│   │   ├── custom-ui-handler.ts  # Pre-execution gates (TODO: Phase 2)
│   │   ├── approval-handler.ts   # Approval workflows (TODO: Phase 4)
│   │   └── oauth-handler.ts      # OAuth flows (TODO: Phase 2)
│   └── routes/
│       ├── webhooks.ts       # POST /stripe/webhook/*
│       ├── custom-ui.ts      # POST /stripe/custom-ui/execute
│       ├── policies.ts       # GET/POST /stripe/policies/*
│       ├── audit.ts          # GET /stripe/audit/*
│       └── oauth.ts          # GET /stripe/oauth/*
├── tests/
│   ├── unit/                 # Unit tests (TODO: Phase 7)
│   └── integration/          # Integration tests (TODO: Phase 7)
├── docs/
│   ├── SETUP.md              # Installation guide (TODO: Phase 8)
│   └── ARCHITECTURE.md       # Technical reference (TODO: Phase 8)
├── package.json
├── tsconfig.json
├── stripe-app.json           # Stripe App manifest
└── .env.example
```

## Development Setup

### Prerequisites

- Node.js 20+
- Stripe account with app marketplace access
- Stripe CLI

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials

# Build
npm run build

# Run locally (Edge Functions simulation)
npm run dev
```

### Stripe CLI Integration

```bash
# Start local webhook tunnel
stripe apps dev src/server.ts

# Test webhooks locally
stripe trigger charge.created
```

## Architecture Highlights

### Pre-Execution Gating

**Custom UI Actions** (Phase 2):
- Stripe App provides custom buttons in Stripe Dashboard
- User clicks button → routed through DSG for approval
- Decision returned before Stripe API call is made

### Post-Event Compliance

**Async Webhook Checks** (Phase 2):
- Detects violations after transaction completes
- Auto-reversal (refund/freeze) within <500ms if violation detected
- Logs to audit trail for compliance evidence

### Performance Optimization

- **Vercel Edge Functions** for webhook endpoint (eliminate cold starts)
- **Redis/Upstash caching** for policies (sub-200ms lookups)
- **Cache Write-Through pattern** for cache invalidation
- Target: **<500ms response time** (well under Stripe's 5s timeout)

### Configurable Fail-Safe

- **Fail-Open** (default): Allow + log on DSG outage (speed-critical merchants)
- **Fail-Closed**: Block + alert on outage (high-compliance orgs)
- Per-customer configuration at install time

## Routes Overview

### Webhooks
- `POST /stripe/webhook/events` - Stripe event processing (Edge Function)
- `POST /stripe/webhook/install` - App installation
- `POST /stripe/webhook/uninstall` - App removal

### Custom UI Actions
- `POST /stripe/custom-ui/execute` - Pre-execution gate for UI buttons

### Policies
- `GET /stripe/policies/list` - List governance rules
- `POST /stripe/policies/create` - Create/update rule

### Audit Trail
- `GET /stripe/audit/operations` - List audited operations
- `GET /stripe/audit/operations/:id` - Operation details

### OAuth
- `GET /stripe/oauth/authorize` - Start OAuth flow
- `GET /stripe/oauth/callback` - Complete OAuth linkage

## Key Dependencies

- **Hono** - Lightweight web framework (Edge-friendly)
- **Stripe SDK** - Stripe API client
- **ioredis** - Redis client for caching
- **Zod** - TypeScript-first validation
- **Supabase JS** - Database client
- **Vitest** - Test framework

## Phase 1 Completion

✅ **PHASE 1: Project Setup & Infrastructure** (3 days)

Deliverables:
- [x] `/packages/stripe-app/package.json` - Dependencies + scripts
- [x] `/packages/stripe-app/tsconfig.json` - TypeScript config
- [x] `/packages/stripe-app/stripe-app.json` - Stripe App manifest
- [x] `/packages/stripe-app/.env.example` - Environment variables
- [x] `/packages/stripe-app/src/index.ts` - Entry point
- [x] `/packages/stripe-app/src/server.ts` - Hono initialization
- [x] `/packages/stripe-app/src/lib/dsg-client.ts` - DSG wrapper
- [x] `/packages/stripe-app/src/routes/*.ts` - Route handlers (scaffolding)

Ready for Phase 2: Core Gateway Handlers.

## Next Steps

**Phase 2** will implement:
- Stripe event adapters (charge → GatewayToolRequest)
- Webhook handlers with signature validation
- Pre-execution gate via custom UI actions
- Policy caching in Redis
- OAuth flows

See the implementation plan at `/root/.claude/plans/https-docs-stripe-com-stripe-apps-create-breezy-crescent.md`
