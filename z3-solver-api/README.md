# Z3 Solver API

Production-ready Z3 SMT solver endpoint for DSG deterministic gates on Vercel.

## Features

- **SMT-LIB v2 Support:** Parse and solve SMT-LIB v2 formulas
- **Model Extraction:** Get satisfying assignments for SAT results
- **Unsat Core:** Extract unsatisfiable cores for UNSAT results
- **Timeout Protection:** Configurable timeout (default 5000ms)
- **CORS Enabled:** Cross-origin requests supported
- **Error Handling:** Comprehensive error responses

## API Endpoint

```
POST https://z3-solver-api.vercel.app/api/solve
```

## Request

The Z3 Solver API expects SMT-LIB v2 format constraints:

```json
{
  "smt2": "(set-logic QF_UF) (declare-const x () Int) (assert (> x 5)) (check-sat)",
  "timeout_ms": 5000,
  "nonce": "req-nonce-12345"
}
```

### Field Details

- **smt2** (string, required): Complete SMT-LIB v2 formula including `(set-logic ...)`, declarations, assertions, and `(check-sat)`
- **timeout_ms** (number, optional): Timeout in milliseconds (default: 5000, max: 30000)
- **nonce** (string, optional): Unique identifier for request tracking and replay protection

## Response (SAT)

```json
{
  "status": "sat",
  "satisfiable": true,
  "model": [
    { "name": "x", "value": "6" }
  ],
  "solver_version": "4.12.2",
  "time_ms": 45,
  "smt2_hash": "abc123def456"
}
```

## Response (UNSAT)

```json
{
  "status": "unsat",
  "satisfiable": false,
  "unsatisfiable_core": [
    "(and true true)",
    "(not (> x 5))"
  ],
  "solver_version": "4.12.2",
  "time_ms": 32,
  "smt2_hash": "abc123def456"
}
```

## Response Fields

- **status** (string): One of `sat`, `unsat`, or `unknown`
- **satisfiable** (boolean): True if formula is satisfiable (SAT)
- **model** (array): Variable assignments when SAT (array of `{name, value}` objects)
- **unsatisfiable_core** (array): Core assumptions that make formula UNSAT
- **solver_version** (string): Z3 solver version used (e.g., "4.12.2")
- **time_ms** (number): Solver execution time in milliseconds
- **smt2_hash** (string): Hash of input formula for verification
- **error** (string, optional): Error message if solver failed

## Deployment

### Prerequisites
- Vercel account
- Node.js 18.x

### Deploy to Vercel

```bash
cd z3-solver-api
npm ci
vercel deploy --prod
```

### Get Deployment URL

After deployment, note the URL (e.g., `https://z3-solver-api-XXXXX.vercel.app`)

### Configure DSG Control Plane

After deploying this Z3 Solver API to Vercel, configure the main DSG Control Plane project:

1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add these variables for **all environments** (Production, Preview, Development):
   ```
   DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true
   DSG_EXTERNAL_SOLVER_URL=https://z3-solver-api-XXXXX.vercel.app/api/solve
   DSG_SOLVER_TIMEOUT_MS=5000
   DSG_DETERMINISTIC_SOLVER_NAME=z3
   DSG_DETERMINISTIC_SOLVER_VERSION=4.12.2
   ```
   Replace `z3-solver-api-XXXXX` with your actual Vercel project domain.
3. Redeploy the main DSG Control Plane app to activate the configuration

## Testing

```bash
curl -X POST https://z3-solver-api.vercel.app/api/solve \
  -H "Content-Type: application/json" \
  -d '{
    "formula": "(declare-fun x () Int) (assert (> x 5))",
    "timeout": 5000
  }'
```

## Performance

- Simple SAT: 10-50ms
- Complex formula: 50-200ms
- Timeout threshold: 5000ms (configurable)
- Cold start: ~100ms (first call only)

## Safety Guarantees

- UNSUPPORTED never becomes PASS
- Timeout protection on all requests
- Fallback to static checks on solver error
- Request validation
- Response schema enforcement

## Limits

- Max formula size: 100KB
- Max timeout: 30 seconds (Vercel limit)
- Memory: 1GB per execution
- Concurrent: Limited by Vercel concurrency
