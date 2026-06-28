# Z3 Solver API - Deployment & Testing Guide

This is a minimal Vercel-hosted Z3 SMT solver endpoint for the DSG Control Plane.

## Quick Start

### Deploy to Vercel

**Option 1: Using Vercel CLI (Recommended)**

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Navigate to z3-solver-api directory
cd z3-solver-api

# Deploy to Vercel
vercel --prod

# The CLI will prompt for:
# - Project name: dsg-z3-solver-api (or your choice)
# - Framework: Select "Other" or "Next.js" (auto-detected)
# - Root directory: leave blank (accept default)

# After deployment, you'll get a URL: https://dsg-z3-solver-api.vercel.app
```

**Option 2: Using GitHub Integration (Recommended for CI/CD)**

1. Push this directory to a separate GitHub repository (or use monorepo approach)
2. Link repository to Vercel dashboard
3. Vercel auto-deploys on every push to main branch

### Verify Deployment

Once deployed, test the endpoint:

```bash
# Replace with your Vercel URL
export Z3_URL="https://dsg-z3-solver-api.vercel.app"

# Test basic SAT formula
curl -X POST "$Z3_URL/api/solve" \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n(assert p)\n(check-sat)",
    "timeout_ms": 5000,
    "nonce": "verify-test-001"
  }' | jq .

# Expected response:
# {
#   "status": "sat",
#   "satisfiable": true,
#   "solver_version": "z3 4.12.2",
#   "time_ms": <number>,
#   "smt2_hash": "<sha256-hash>"
# }
```

Test UNSAT formula:

```bash
curl -X POST "$Z3_URL/api/solve" \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n(assert (and p (not p)))\n(check-sat)",
    "timeout_ms": 5000,
    "nonce": "unsat-test-002"
  }' | jq .

# Expected response:
# {
#   "status": "unsat",
#   "satisfiable": false,
#   "solver_version": "z3 4.12.2",
#   "time_ms": <number>,
#   "smt2_hash": "<sha256-hash>"
# }
```

## Local Testing (Before Deploy)

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# In another terminal, test against http://localhost:3000
curl -X POST http://localhost:3000/api/solve \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n(assert p)\n(check-sat)",
    "timeout_ms": 5000,
    "nonce": "local-test"
  }' | jq .
```

## Integrating with DSG Control Plane

Once deployed and verified:

1. **Get the deployed URL from Vercel dashboard or CLI output**
   ```
   Deployment URL: https://dsg-z3-solver-api.vercel.app
   ```

2. **Update DSG Control Plane environment variables**
   
   In Vercel dashboard → your dsg-control-plane project → Settings → Environment Variables:
   
   ```
   DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true
   DSG_EXTERNAL_SOLVER_URL=https://dsg-z3-solver-api.vercel.app
   DSG_SOLVER_TIMEOUT_MS=5000
   ```

3. **Redeploy DSG Control Plane**
   
   Push a commit to main branch or trigger manual redeploy in Vercel dashboard:
   ```bash
   git add .
   git commit -m "Enable Z3 external solver integration"
   git push origin main
   ```

4. **Verify integration**
   
   Test the gate evaluation endpoint with Z3 enabled:
   ```bash
   curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/dsg/v1/gates/evaluate \
     -H "Content-Type: application/json" \
     -d '{
       "policyRef": "policy_default",
       "policyVersion": "2026-06-24-v1",
       "context": {
         "goalLocked": true
       },
       "nonce": "integration-test-123",
       "idempotencyKey": "integration-test-123"
     }' | jq .proof.evidenceBoundary.externalSolverInvoked
   
   # Should return: true (if solver is invoked)
   ```

## Monitoring & Logs

### View deployment logs in Vercel

```bash
vercel logs --prod dsg-z3-solver-api
```

### Monitor solver performance

Check response `time_ms` in solver results to track performance:
- Typical SAT/UNSAT: 10-200ms
- Complex formulas: up to timeout (5000ms default)
- Timeout errors: `time_ms > DSG_SOLVER_TIMEOUT_MS`

### Common Issues

**Timeout on first request:**
- Z3 startup takes time on cold Vercel containers
- Solution: Increase `DSG_SOLVER_TIMEOUT_MS` to 10000 for production

**CORS errors from DSG Control Plane:**
- Z3 solver endpoint already has CORS headers configured
- Verify `Access-Control-Allow-Origin: *` in response

**Formula parsing errors:**
- Ensure SMT-LIB v2 syntax is valid
- Common mistakes: missing `(set-logic ...)`, invalid variable names, unclosed parentheses

## Scaling & Configuration

### Vercel Function Limits

Current `vercel.json` settings:
- `maxDuration`: 30 seconds (max for Vercel Pro)
- `memory`: 1024 MB

If needed, increase memory for complex formulas:
```json
{
  "functions": {
    "api/solve.ts": {
      "maxDuration": 30,
      "memory": 3008
    }
  }
}
```

### Alternative Deployments

See `../docs/Z3_SOLVER_SETUP.md` for:
- AWS Lambda deployment
- Self-hosted Docker Compose
- Docker container options

## Next Steps

1. ✅ Deploy to Vercel using `vercel --prod`
2. ✅ Test endpoint with curl commands above
3. ✅ Update DSG Control Plane env vars
4. ✅ Redeploy DSG Control Plane
5. ✅ Monitor solver invocations in logs

---

**Support:**
- Z3 documentation: https://z3prover.github.io/
- Vercel documentation: https://vercel.com/docs
- DSG setup guide: `../docs/Z3_SOLVER_SETUP.md`
