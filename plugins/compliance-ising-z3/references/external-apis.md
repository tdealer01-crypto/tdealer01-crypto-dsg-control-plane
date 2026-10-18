# Historical API reference — not a deployment claim

This file is an **archive** of API details observed or documented on **31 July 2026**, before Vercel was retired for DSG. As of **18 October 2026**, the user confirms that Vercel is no longer used. Nothing in this plugin establishes a replacement deployed endpoint.

**Current availability:** NOT VERIFIED. **Production connection:** NOT CLAIMED. **Execution from this plugin:** NOT RUN.

The plugin bundles no API service, private credentials, Android binaries or external Z3 process.

## Archived DSG QUBO Policy Optimizer API

Historical base URL: `https://dsg-qubo-api.vercel.app` (**retired; do not use as an active default**).

Historical note (not a current probe): `GET /health` was reported to return `{"status":"healthy","version":"2.0.0"}` on 2026-07-31. Historical routes from the archived service documentation included:

| Method | Path | Historical purpose |
|---|---|---|
| GET | `/health` | Health |
| GET | `/openapi.json` | OpenAPI schema |
| POST | `/api/v1/auth/register` | Account registration |
| POST | `/api/v1/auth/login` | Authentication |
| POST | `/api/v1/optimization/run` | Submit optimization |
| GET | `/api/v1/optimization/list` | Query past runs |
| GET | `/api/v1/account/usage` | Account usage |

Historical optimization fields were: `domain`, `budget_cap`, optional `anneal_iterations`, and optional `deterministic_seed`. **Current request/response schemas have not been verified for any replacement provider.**

Authentication in historical documents used an `api_key` query parameter. That can expose credentials to logs and caches; do not silently copy the pattern into a new provider.

## Archived z3-solver API

Historical base URL: `https://z3-solver-api-deploy-dsg.vercel.app` (**retired**).

The previous notes reported `GET /api/solve` returning HTTP 405 on 2026-07-31, interpreted as a POST-only route. There is **no confirmed POST request schema or valid output** in this plugin. Do not claim that the external Z3 solver was invoked or that a formal proof was produced from this endpoint.

## Requirements before re-enabling an external skill

1. A deployed provider URL has to be supplied explicitly and confirmed current (no fallback to retired Vercel URLs).
2. Fetch service identity/health and a documented, versioned request schema.
3. Confirm authentication and avoid transmitting keys in URLs where safer supported methods exist.
4. Obtain user authorization for any real/billable solver request and capture concrete request, response, seed, hashes, and date.
5. If provider verification fails, output `BLOCKED / PROVIDER_UNVERIFIED`, not `PASS`.

For a local Kotlin optimization, consult the upstream Android engine repository and run the Gradle tests from that source repository instead.
