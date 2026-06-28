# Z3 Solver API

Minimal, production-ready Z3 SMT solver endpoint for Vercel. Used by DSG Control Plane's deterministic constraint verification system.

## What it does

Accepts SMT-LIB v2 logic formulas and returns satisfiability results:

```bash
curl -X POST https://z3-solver-api.vercel.app/api/solve \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n(assert p)\n(check-sat)",
    "timeout_ms": 5000
  }'

# Response:
{
  "status": "sat",
  "satisfiable": true,
  "solver_version": "z3 4.12.2",
  "time_ms": 45,
  "smt2_hash": "abc123..."
}
```

## Quick Start

### Local development

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Test in another terminal
./test-solver.sh http://localhost:3000
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Get your deployment URL and run tests
./test-solver.sh https://your-deployment.vercel.app
```

## Files

| File | Purpose |
|------|---------|
| `package.json` | Dependencies: z3-solver v4.12.2, Node.js 18.x |
| `api/solve.ts` | Main endpoint: POST /api/solve |
| `vercel.json` | Vercel build/function configuration |
| `DEPLOY.md` | Detailed deployment & testing guide |
| `test-solver.sh` | Automated test suite (5 tests) |
| `.env.example` | Environment variables (optional) |

## API Endpoint

**POST** `/api/solve`

### Request

```json
{
  "smt2": "(set-logic QF_UF)\n...",
  "timeout_ms": 5000,
  "nonce": "unique-id"
}
```

- `smt2` (required): SMT-LIB v2 formula
- `timeout_ms` (optional, default 5000): Solver timeout in milliseconds
- `nonce` (optional): Request identifier for tracking

### Response

```json
{
  "status": "sat" | "unsat" | "unknown",
  "satisfiable": boolean,
  "solver_version": "z3 4.12.2",
  "time_ms": number,
  "smt2_hash": "sha256-hex-digest",
  "model": [
    { "name": "variable_name", "value": "value" }
  ],
  "unsatisfiable_core": ["assertion_name"],
  "error": "error message (if any)"
}
```

## Integration with DSG Control Plane

Once deployed:

1. Get your Vercel URL: `https://your-deployment.vercel.app`

2. Update DSG Control Plane environment variables:
   ```
   DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true
   DSG_EXTERNAL_SOLVER_URL=https://your-deployment.vercel.app
   DSG_SOLVER_TIMEOUT_MS=5000
   ```

3. Redeploy DSG Control Plane

4. Verify in gate evaluation:
   ```bash
   curl -X POST https://dsg-control-plane/api/dsg/v1/gates/evaluate \
     -d '{"context": {...}}' | jq .proof.evidenceBoundary.externalSolverInvoked
   # Should return: true
   ```

## Testing

### Automated tests

```bash
# Test local instance
./test-solver.sh

# Test deployed instance
./test-solver.sh https://your-deployment.vercel.app
```

Tests cover:
1. SAT formula (satisfiable)
2. UNSAT formula (contradiction)
3. Invalid request handling
4. Complex formula with model extraction
5. Response schema validation

### Manual curl testing

See `DEPLOY.md` for detailed curl examples.

## Configuration

### Vercel function settings

Edit `vercel.json` to adjust:

```json
{
  "functions": {
    "api/solve.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

- `maxDuration`: Max execution time (30s on Vercel Pro)
- `memory`: Function memory allocation in MB

### Z3 solver settings

Modify `api/solve.ts` line 94:

```typescript
solver.setParams({
  ':timeout': timeoutMs,  // Milliseconds (default 5000)
});
```

## Monitoring

### View logs

```bash
vercel logs --prod dsg-z3-solver-api
```

### Performance metrics

Check `time_ms` in responses:
- Typical SAT/UNSAT: 10-200ms
- Complex formulas: 200-5000ms
- Timeout: >5000ms

### Common issues

| Issue | Solution |
|-------|----------|
| Timeout on first request | Z3 cold start on Vercel; increase timeout to 10000ms |
| CORS errors | Already configured; verify deployment has correct headers |
| Formula parsing error | Check SMT-LIB v2 syntax; common: missing `(set-logic ...)` |
| High latency | Complex formula; consider caching or parallel solving |

## Architecture

```
POST /api/solve
  ↓
Validate SMT-LIB v2 formula
  ↓
Initialize Z3 Context
  ↓
Parse formula with parse_smt2_string()
  ↓
Assert constraints
  ↓
Run check-sat
  ↓
Extract model (if SAT) or unsat core (if UNSAT)
  ↓
Return { status, satisfiable, solver_version, time_ms, smt2_hash }
```

## Dependencies

- `z3-solver@^4.12.2`: Z3 JavaScript bindings
- Node.js 18.x runtime

## Limits & Guarantees

✅ Timeout protection - Always responds within maxDuration  
✅ Response validation - Strict schema checking  
✅ Error handling - Graceful fallback on parse/solver errors  
✅ CORS enabled - Cross-origin requests allowed  
✅ Request logging - All requests include nonce for tracing  

⚠️ Not certified - Real solver ≠ third-party certification  
⚠️ Network dependent - Solver availability = endpoint availability  

## Support

- Z3 docs: https://z3prover.github.io/
- SMT-LIB standard: http://smtlib.cs.uiowa.edu/
- Vercel docs: https://vercel.com/docs
- DSG setup: `../docs/Z3_SOLVER_SETUP.md`

---

**Version:** 1.0.0  
**Status:** Production-ready  
**Last updated:** 2026-06-28
