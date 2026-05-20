# ProofGate Production Hardening

This branch hardens the public trial gate and related runtime surfaces against the issues found in the production-readiness review.

## What changed

- `/api/try/gate` no longer relies on process-local session state in production. It uses Upstash Redis when deployed with Redis environment variables.
- Trial gate stamps are HMAC-signed and verifiable instead of being generated from `Math.random()`.
- The trial gate requires an explicit production auth boundary unless public-trial mode is intentionally enabled for demo environments.
- Trial gate request bodies are parsed with a bounded JSON reader.
- DSG deterministic gate requests are runtime-validated instead of trusted through TypeScript assertions.
- Rate limiting fails closed in production when Redis is unavailable.
- Cron endpoints migrated to a fail-closed auth helper. Per-job secrets are supported and preferred over a shared cron secret.
- Supabase admin requests now use a 5-second fetch timeout and an application header.
- CORS now logs blocked origins and enforces strict production behavior.

## Required production configuration

Set these in the deployment secret manager before promoting this branch:

- Upstash Redis URL and token for rate limiting and trial-gate session storage.
- A 32+ byte DSG stamp secret for signed ProofGate stamps.
- A trial gate API key or SHA-256 hash unless the deployment is explicitly public-demo only.
- Cron bearer secrets, preferably one per cron job.
- Strict CORS allowed origins.

## Claim boundary

After this patch, the branch is a production-hardening candidate, not an automatic production certification.

Do not claim SOC 2, WORM-certified audit storage, third-party audit completion, GDPR residency coverage, or full cryptographic certification unless those controls are verified outside this code patch.

## Minimum verification before merge

Run:

```bash
npm run typecheck
npm test
npm run build
npm run go:no-go
```

If production Redis or Supabase credentials are not available in CI, run the required live DB tests in staging before release.
