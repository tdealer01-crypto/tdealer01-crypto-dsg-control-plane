---
name: qubo-optimization-run
description: >-
  Describe how to invoke a separately deployed and verified DSG QUBO optimizer.
  The old Vercel provider is retired. Use only after the user supplies a
  current endpoint and authorizes a real, potentially billable operation.
  Otherwise report PROVIDER_UNVERIFIED / NOT RUN and provide offline steps.
---

# QUBO optimization: externally verified provider only

This skill is a **provider integration guide**, not a bundled running solver.
The historical Vercel API is retired. **Never default to a Vercel URL**, invent
an active deployment, claim that a real optimization executed, or bypass a
missing API contract.

## Preflight (must pass before any run)

1. Confirm a user-approved and currently deployed QUBO provider; obtain its
   HTTPS base URL from a trusted runtime configuration (e.g. `DSG_QUBO_API_BASE`).
   **If not supplied, stop: `BLOCKED: PROVIDER_UNVERIFIED`.**
2. Confirm the service identity, health and actual version by a read-only call.
3. Read its current OpenAPI or other real request/response schema. Historical
   schemas from 2026-07-31 are **not sufficient**.
4. Establish the provider's supported authentication without logging secrets.
   Never assume an `api_key` query parameter is appropriate for a new provider.
5. Check quotas and billing. Obtain user approval for any billable request.
6. Record the input domain/constraints, budget, deterministic seed, request ID,
   real response, run ID and provenance hash where available.

## Example of safe read-only preflight

With a **verified and explicitly provided** `DSG_QUBO_API_BASE`:

```bash
: "${DSG_QUBO_API_BASE:?Set a verified HTTPS provider first}"
curl --fail --silent --show-error --max-time 10 "${DSG_QUBO_API_BASE}/health"
```

A health response alone does not establish schema compatibility or authorize
a POST. Run only the request form documented by that provider and record the
actual output. If no authorized provider exists, offer the local Kotlin/Android
engine instructions instead of making an API call.

## Reporting

- `PASS`: real run output and authorization with input/seed/provenance recorded
- `FAILED`: executed and returned a concrete error
- `BLOCKED / PROVIDER_UNVERIFIED`: provider missing, retired or unverified
- `NOT RUN`: no execution occurred

See `references/external-apis.md` for **historical documentation only**;
those old endpoint paths are not an authorization to issue requests.
