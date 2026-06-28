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

```json
{
  "formula": "(declare-fun x () Int) (assert (> x 5))",
  "timeout": 5000
}
```

## Response (SAT)

```json
{
  "satisfiable": true,
  "model": {
    "x": "6"
  },
  "smtLibHash": "abc123def456",
  "timestamp": "2026-06-28T10:00:00.000Z"
}
```

## Response (UNSAT)

```json
{
  "satisfiable": false,
  "unsatCore": ["(not (> x 5))", "(> x 5)"],
  "smtLibHash": "abc123def456",
  "timestamp": "2026-06-28T10:00:00.000Z"
}
```

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

In the main DSG Control Plane Vercel project:

1. Go to Settings → Environment Variables
2. Add:
   ```
   DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true
   DSG_EXTERNAL_SOLVER_URL=https://z3-solver-api-XXXXX.vercel.app/api/solve
   DSG_SOLVER_TIMEOUT_MS=5000
   ```
3. Redeploy the main app

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
