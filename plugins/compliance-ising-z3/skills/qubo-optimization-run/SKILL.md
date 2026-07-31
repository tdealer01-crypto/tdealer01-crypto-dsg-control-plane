---
name: qubo-optimization-run
description: >-
  Call the externally deployed DSG QUBO Policy Optimizer API to run a
  deterministic QUBO/Ising policy optimization. Use when a user wants to run a
  real optimization against the hosted service rather than the local Kotlin
  engine: registering/logging in for an api_key, checking account usage, and
  submitting an optimization run for a regulatory domain under a budget cap.
  Auth is an `api_key` query parameter that must come from runtime env, never
  from the repo. Running a real optimization may trigger solver work and may
  incur cost under the service's pricing tier.
---

# QUBO Optimization Run (DSG QUBO Policy Optimizer API)

This skill drives the **externally deployed** DSG QUBO Policy Optimizer API.
It is a separate hosted service, not code in this repo. Use it to run a real
deterministic QUBO/Ising policy optimization when the user asks for a live run.

## Service identity (verified 2026-07-31)

- Base URL: `https://dsg-qubo-api.vercel.app`
- Name/version: "DSG QUBO Policy Optimizer API" v2.0.0
- Reachability: `GET /health` returned
  `{"status":"healthy","version":"2.0.0",...}` (verified reachable 2026-07-31).
- Interactive docs: `GET /docs` (Swagger UI), `GET /openapi.json`
  (OpenAPI 3.1.0).

Claim boundary (CLAUDE.md sections 1, 12): this is an **external deployed
service, production-connected, reachable via `/health` (verified 2026-07-31)**.
Do NOT claim "external Z3 solver invocation complete", "certified", or any
readiness status — a real optimization run has not been executed here, and no
api_key is stored in this repo.

## Authentication

Auth is an **`api_key` query parameter**. Obtain a key at runtime by
registering or logging in; never commit or print a real key.

- Set it in the environment before calling: `DSG_QUBO_API_KEY`.
- Base URL is overridable via `DSG_QUBO_API_BASE`.

```bash
export DSG_QUBO_API_BASE="${DSG_QUBO_API_BASE:-https://dsg-qubo-api.vercel.app}"
# export DSG_QUBO_API_KEY=...   # provide at runtime; do NOT hardcode in the repo
```

Register / login (returns a key or token — treat the response as secret):

```bash
curl -s -X POST "$DSG_QUBO_API_BASE/api/v1/auth/register" \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","company_name":"Example Co","password":"<runtime>","pricing_tier":"free"}'

curl -s -X POST "$DSG_QUBO_API_BASE/api/v1/auth/login" \
  -H "content-type: application/json" \
  -d '{"email":"you@example.com","password":"<runtime>"}'
```

## Run an optimization

`POST /api/v1/optimization/run?api_key=<KEY>` with an `OptimizationRequest`
body.

Request fields:

- `domain` (enum, required): `EU_GDPR_AI` | `THAI_PDPA` | `THAI_CRIMINAL_LAW` |
  `FINTECH`
- `budget_cap` (number, **required**)
- `anneal_iterations` (number, optional; example `5000`)
- `deterministic_seed` (number, optional; example `42` — fix it for
  reproducible runs)

```bash
# WARNING: this performs a real run. It may trigger solver work and may incur
# cost under the service's pricing tier (Stripe scaffold). Only run with the
# user's intent and a valid runtime api_key.
curl -s -X POST \
  "$DSG_QUBO_API_BASE/api/v1/optimization/run?api_key=${DSG_QUBO_API_KEY}" \
  -H "content-type: application/json" \
  -d '{
    "domain": "EU_GDPR_AI",
    "budget_cap": 1000,
    "anneal_iterations": 5000,
    "deterministic_seed": 42
  }'
```

## Read results / account

```bash
# List recent runs
curl -s "$DSG_QUBO_API_BASE/api/v1/optimization/list?api_key=${DSG_QUBO_API_KEY}&limit=10"

# Fetch a single run by id
curl -s "$DSG_QUBO_API_BASE/api/v1/optimization/{id}?api_key=${DSG_QUBO_API_KEY}"

# Account profile and usage (check quota/cost before running)
curl -s "$DSG_QUBO_API_BASE/api/v1/account/profile?api_key=${DSG_QUBO_API_KEY}"
curl -s "$DSG_QUBO_API_BASE/api/v1/account/usage?api_key=${DSG_QUBO_API_KEY}"
```

## Safe workflow

1. Confirm the service is up: `GET /health`.
2. Ensure `DSG_QUBO_API_KEY` is set from runtime env (never from the repo).
3. Check `account/usage` so you understand quota/cost before a run.
4. Only then `POST .../optimization/run` with an explicit `budget_cap` and a
   fixed `deterministic_seed`.
5. Report the run id, selected controls, and the seed used so the result is
   replayable. If you did not actually run it, say `Not run` — never fabricate
   a result.

See `references/external-apis.md` for the full endpoint inventory and for the
second (partially-verified) z3-solver service.
