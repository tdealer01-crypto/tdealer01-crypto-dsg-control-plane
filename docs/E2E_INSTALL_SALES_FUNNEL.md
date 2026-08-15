# DSG ONE E2E Install + Sales Funnel

## Goal

One supported path from discovery to first value to paid usage:

`Discover -> Start -> Connect -> Verify -> Execute (when authorized) -> Evidence -> Upgrade`

## Truth boundary

A channel is only labeled **one-click** when its production installation flow is wired and testable end-to-end.

Current states are published by `GET /api/install/manifest`:

- Web demo: ready / one-click
- DSG Gate API: ready / guided API-key setup
- MCP server: guided / repository install + environment configuration
- GitHub managed install: planned until the production GitHub App registration/callback flow is verified
- Vercel managed install: planned until the production integration install/callback flow is verified

This prevents the product UI from claiming automation that is not actually available.

## Sales surfaces

- `/start` — connection chooser and first-value path
- `/pricing` — pricing plus a direct route into `/start`
- `/demo` — public proof path before login
- `/dashboard/api-keys` — API activation path
- `/request-access?integration=github` — managed GitHub integration request
- `/request-access?integration=vercel` — managed Vercel integration request

## User benefit contract

Every install path must answer:

1. What can I connect?
2. What do I have to do?
3. What happens automatically?
4. What result will I see first?
5. Where is the evidence?
6. What is required before execution?
7. When and why would I pay?

## Execution contract

DSG must not block plan-authorized execution without a verified constraint or unsupported-action reason. `REVIEW` and `BLOCK` must provide a reason and next action. Evidence must be retained for later verification/replay where the underlying execution path supports it.

## Completion checks

- TypeScript typecheck passes.
- Production build passes.
- Install manifest integration test passes.
- `/start` renders in production build.
- `/pricing` links to `/start`.
- No GitHub/Vercel one-click claim is shipped until those production install flows are verified.
