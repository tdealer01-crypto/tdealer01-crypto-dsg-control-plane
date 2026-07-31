# External deployed APIs

Two externally deployed services relate to this plugin's QUBO/Ising + Z3
domain. They are separate hosted services, **not** code in this repo. This
plugin only documents them and provides curl templates; it stores no api_key
and performs no real solver POST.

All auth values must come from runtime environment variables. Never commit or
print a real `api_key`, token, or password.

---

## API #1 — DSG QUBO Policy Optimizer API (ready to use)

- Base URL: `https://dsg-qubo-api.vercel.app`
- Name / version: "DSG QUBO Policy Optimizer API" v2.0.0
- Auth: `api_key` **query parameter** (register/login to obtain a key)
- Env vars: `DSG_QUBO_API_BASE` (default `https://dsg-qubo-api.vercel.app`),
  `DSG_QUBO_API_KEY`
- Claim boundary: external deployed service, production-connected, reachable
  via `/health` (verified 2026-07-31). No real optimization run has been
  executed from this repo; do not claim solver invocation or certification.

### Verified endpoints (probed 2026-07-31)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | Info JSON: name, version, status, docs, stripe_configured |
| GET | `/health` | Returned `{"status":"healthy","version":"2.0.0",...}` (verified reachable) |
| GET | `/docs` | Swagger UI |
| GET | `/openapi.json` | OpenAPI 3.1.0 |
| POST | `/api/v1/auth/register` | Body `{email, company_name, password, pricing_tier}` |
| POST | `/api/v1/auth/login` | Body `{email, password}` |
| POST | `/api/v1/optimization/run?api_key=<KEY>` | Body `OptimizationRequest` (see below) |
| GET | `/api/v1/optimization/list?api_key=<KEY>&limit=10` | Recent runs |
| GET | `/api/v1/optimization/{id}?api_key=<KEY>` | Single run |
| GET | `/api/v1/account/profile?api_key=<KEY>` | Account profile |
| GET | `/api/v1/account/usage?api_key=<KEY>` | Quota / usage |

`OptimizationRequest` body:

- `domain` (enum, required): `EU_GDPR_AI` | `THAI_PDPA` | `THAI_CRIMINAL_LAW` |
  `FINTECH`
- `budget_cap` (number, **required**)
- `anneal_iterations` (number, optional; example `5000`)
- `deterministic_seed` (number, optional; example `42`)

### Curl templates

```bash
export DSG_QUBO_API_BASE="${DSG_QUBO_API_BASE:-https://dsg-qubo-api.vercel.app}"
# export DSG_QUBO_API_KEY=...   # runtime only; never hardcode in the repo

# Health (safe, no auth)
curl -s "$DSG_QUBO_API_BASE/health"

# Run an optimization — WARNING: real run, may trigger solver work and may
# incur cost under the service's pricing tier (Stripe scaffold).
curl -s -X POST \
  "$DSG_QUBO_API_BASE/api/v1/optimization/run?api_key=${DSG_QUBO_API_KEY}" \
  -H "content-type: application/json" \
  -d '{"domain":"EU_GDPR_AI","budget_cap":1000,"anneal_iterations":5000,"deterministic_seed":42}'
```

See `skills/qubo-optimization-run/SKILL.md` for the full workflow.

---

## API #2 — z3-solver-api (partially verified)

- Base URL: `https://z3-solver-api-deploy-dsg.vercel.app`
- Verified endpoint (probed 2026-07-31):
  - `POST /api/solve` — route exists; `Content-Type: application/json`, CORS
    `*`. `GET` returns `405`, confirming the route is POST-only.
- **Request/response schema = NOT VERIFIED (route only).** There is no
  discovered `/docs` or `/openapi.json`, and no POST was executed. Do not
  assume field names or invent a payload. Treat the schema as unknown until a
  real, authorized probe confirms it.
- Claim boundary: only "route `/api/solve` reachable, POST-only (verified
  2026-07-31)". Do not claim "external Z3 solver invocation complete" or any
  readiness/certification status.

### Curl template (schema unverified — placeholder body)

```bash
export Z3_SOLVER_API_BASE="${Z3_SOLVER_API_BASE:-https://z3-solver-api-deploy-dsg.vercel.app}"

# Route exists but the request schema is UNVERIFIED. The body below is a
# placeholder only; confirm the real schema before relying on it.
curl -s -X POST "$Z3_SOLVER_API_BASE/api/solve" \
  -H "content-type: application/json" \
  -d '{ "schema": "UNVERIFIED — confirm before use" }'
```

---

## Secret handling

- No `api_key`, token, or password is stored in this repo.
- Provide `DSG_QUBO_API_KEY` (and any other credential) from the runtime
  environment or a secrets manager at call time.
- Responses from `/auth/register` and `/auth/login` are secret; do not log or
  commit them.
