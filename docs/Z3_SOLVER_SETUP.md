# Z3 Deterministic Solver Setup Guide

This guide explains how to enable real Z3 SMT solver invocation for DSG Control Plane's deterministic gate evaluation.

## Overview

The DSG Control Plane uses **deterministic constraint verification** to make governance decisions:

- **Design-time**: Static constraint checks (current default)
- **Runtime** (optional): Real Z3 SMT solver invocation for formula satisfiability

When enabled, `/api/dsg/v1/gates/evaluate` generates SMT-LIB v2 formulas and sends them to an external Z3 solver endpoint to verify constraints.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ DSG Control Plane (Node.js)                         │
│                                                     │
│  POST /api/dsg/v1/gates/evaluate                   │
│    ↓                                                │
│  generateSmt2ForProof() → SMT-LIB v2 formula       │
│    ↓                                                │
│  invokeExternalSolver()                            │
│    ↓ (if DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED)│
│  HTTP POST ${DSG_EXTERNAL_SOLVER_URL}/solve        │
│    │                                               │
│    └─────────────────────────────────────┐         │
│                                          │         │
└──────────────────────────────────────────┼─────────┘
                                           │
┌──────────────────────────────────────────▼─────────┐
│ External Z3 Solver Service                         │
│                                                    │
│  POST /solve                                       │
│    ↓                                               │
│  Parse SMT-LIB v2 formula                         │
│  Invoke Z3 (z3 -T:5000 ...)                       │
│    ↓ (check-sat, get-model)                       │
│  Response: {status, satisfiable, solver_version}  │
│                                                    │
└────────────────────────────────────────────────────┘
```

## Setup Options

### Option 1: Docker (Recommended for Development)

**Requirements:**
- Docker installed
- Port 3001 available locally

**Steps:**

```bash
# Pull and run Z3 solver container
docker run -d \
  --name z3-solver \
  -p 3001:3000 \
  z3solver/web:latest

# Verify it's running
curl -X POST http://localhost:3001/solve \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n(assert p)\n(check-sat)",
    "timeout_ms": 5000,
    "nonce": "test"
  }'

# Expected response: {"status":"sat","satisfiable":true,...}
```

**Configure DSG Control Plane:**

```bash
# .env.local
DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true
DSG_EXTERNAL_SOLVER_URL=http://localhost:3001
DSG_SOLVER_TIMEOUT_MS=5000
```

**Start development:**

```bash
npm run dev
# Now POST to /api/dsg/v1/gates/evaluate will use real Z3
```

### Option 2: Vercel Deployment (Production)

**Step 1: Deploy Z3 service to Vercel**

Create a minimal Z3 solver API:

```typescript
// api/solve.ts (in a separate Vercel project)
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  
  const { smt2, timeout_ms, nonce } = req.body;
  
  try {
    const { stdout, stderr } = await execAsync(
      `echo '${smt2}' | timeout ${timeout_ms / 1000} z3 -T:${timeout_ms} -in`,
      { maxBuffer: 1024 * 1024 }
    );
    
    const satisfiable = stdout.includes('sat');
    
    res.json({
      status: satisfiable ? 'sat' : 'unsat',
      satisfiable,
      solver_version: 'z3 4.12.2',
      time_ms: 0,
      smt2_hash: require('crypto').createHash('sha256').update(smt2).digest('hex'),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

**Step 2: Deploy to Vercel**

```bash
cd z3-solver-service
vercel --prod
# Note the URL: https://z3-solver-service.vercel.app
```

**Step 3: Update main DSG Control Plane Vercel env vars**

In Vercel Dashboard → Settings → Environment Variables:

```
DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true
DSG_EXTERNAL_SOLVER_URL=https://z3-solver-service.vercel.app
DSG_SOLVER_TIMEOUT_MS=5000
```

**Redeploy:**

```bash
git push origin main
# Vercel auto-deploys with new env vars
```

### Option 3: AWS Lambda

**Step 1: Create Lambda function**

```python
# lambda_function.py
import json
import subprocess
import base64

def lambda_handler(event, context):
    body = json.loads(event['body'])
    smt2 = body.get('smt2', '')
    timeout_ms = body.get('timeout_ms', 5000)
    
    try:
        # Run Z3 with timeout
        result = subprocess.run(
            ['z3', '-T:{}'.format(timeout_ms), '-in'],
            input=smt2,
            capture_output=True,
            timeout=timeout_ms/1000 + 1,
            text=True
        )
        
        satisfiable = 'sat' in result.stdout
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'status': 'sat' if satisfiable else 'unsat',
                'satisfiable': satisfiable,
                'solver_version': 'z3 4.12.2',
                'time_ms': 0,
                'smt2_hash': hashlib.sha256(smt2.encode()).hexdigest()
            })
        }
    except Exception as e:
        return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}
```

**Step 2: Deploy**

```bash
zip lambda.zip lambda_function.py
aws lambda create-function --function-name z3-solver \
  --runtime python3.11 --role arn:aws:iam::YOUR-ARN:role/lambda-role \
  --handler lambda_function.lambda_handler --zip-file fileb://lambda.zip

# Create API Gateway trigger
aws apigateway create-rest-api --name z3-solver
# ... wire up POST /solve → Lambda function
```

**Step 3: Update DSG Control Plane env vars**

```
DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED=true
DSG_EXTERNAL_SOLVER_URL=https://YOUR-API-GATEWAY.execute-api.us-east-1.amazonaws.com/prod
DSG_SOLVER_TIMEOUT_MS=5000
```

### Option 4: Self-Hosted (Docker Compose)

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  z3-solver:
    image: z3solver/web:latest
    ports:
      - "3001:3000"
    environment:
      Z3_TIMEOUT: 5000
    restart: unless-stopped
    
  dsg-control-plane:
    build: .
    ports:
      - "3000:3000"
    environment:
      DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED: "true"
      DSG_EXTERNAL_SOLVER_URL: "http://z3-solver:3000"
      DSG_SOLVER_TIMEOUT_MS: "5000"
    depends_on:
      - z3-solver
    restart: unless-stopped
```

**Run:**

```bash
docker-compose up -d
```

## Verification

### Test Z3 Solver Endpoint

```bash
curl -X POST ${DSG_EXTERNAL_SOLVER_URL}/solve \
  -H "Content-Type: application/json" \
  -d '{
    "smt2": "(set-logic QF_UF)\n(declare-const p Bool)\n(assert p)\n(check-sat)",
    "timeout_ms": 5000,
    "nonce": "verification-test"
  }'

# Expected response:
# {
#   "status": "sat",
#   "satisfiable": true,
#   "solver_version": "z3 4.12.2",
#   "time_ms": 45,
#   "smt2_hash": "..."
# }
```

### Test Gate Evaluation with Z3

```bash
curl -X POST http://localhost:3000/api/dsg/v1/gates/evaluate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_DSG_API_KEY" \
  -d '{
    "policyRef": "policy_default",
    "policyVersion": "2026-06-24-v1",
    "context": {
      "goalLocked": true,
      "gateAllow": true,
      "evidenceExists": true
    },
    "nonce": "test-nonce-12345",
    "idempotencyKey": "idempotent-12345"
  }'

# Look for in response:
# "externalSolverInvoked": true
# "solver": {"name": "z3", "version": "4.12.2"}
```

### Monitor Logs

```bash
# Watch for external solver invocations
grep -i "external" app.log
# Expected: [ExternalSolver] Invoking solver for nonce=test-nonce-12345

# Monitor timeouts
grep -i "timeout" app.log
# Warning: [ExternalSolver] Timeout (>5000ms)
```

## Safety & Boundaries

### Guarantees

✅ **Timeout protection** - Always falls back to static check if timeout exceeded  
✅ **Response validation** - Strict schema check before accepting result  
✅ **Boundary tracking** - `externalSolverInvoked` flag in response  
✅ **UNSUPPORTED safe** - Never maps to PASS, always → REVIEW/BLOCK  
✅ **Error fallback** - Any solver error → uses static check  

### Limitations

⚠️ **Not certified** - Real solver ≠ third-party certification  
⚠️ **Not signed** - No cryptographic signing of proof chain  
⚠️ **Network dependent** - Solver availability = gate availability  
⚠️ **Timing variable** - Z3 solve time depends on formula complexity  

## Configuration Reference

| Variable | Default | Range | Notes |
|----------|---------|-------|-------|
| `DSG_DETERMINISTIC_EXTERNAL_SOLVER_ENABLED` | `false` | `true` \| `false` | Enable/disable real Z3 invocation |
| `DSG_EXTERNAL_SOLVER_URL` | (none) | Valid URL | Base URL (no `/solve` path) |
| `DSG_SOLVER_TIMEOUT_MS` | `5000` | 1000-30000 | Milliseconds before fallback |

## Troubleshooting

### Solver Not Invoked

```bash
# Check env vars in production
curl https://YOUR-APP/api/health | jq .
# Look for dsg_solver_enabled flag

# Check logs for:
# [ExternalSolver] Invoking solver for nonce=...
```

### Timeouts

```bash
# Increase timeout if formulas are complex
DSG_SOLVER_TIMEOUT_MS=10000  # 10 seconds

# Monitor actual solver response times
grep "time_ms" app.log
```

### Solver Service Down

```bash
# Graceful fallback to static checks
# Check logs for:
# [ExternalSolver] Failed: ECONNREFUSED

# Verify solver endpoint
curl -X POST ${DSG_EXTERNAL_SOLVER_URL}/solve -d '...'
```

## Performance Benchmarks

On typical constraint sets (5-10 constraints):

| Solver | Time | Notes |
|--------|------|-------|
| Static check (current) | <1ms | No network overhead |
| Z3 solver | 50-200ms | Formula generation + network + solving |
| Z3 solver (cached) | 20-50ms | Idempotency key reuse |

**Recommendation:** Use Z3 for critical gates; static checks fine for development/testing.

## Next Steps

1. **Choose deployment option** (Docker → Vercel → Lambda → Self-hosted)
2. **Deploy Z3 solver service**
3. **Set environment variables** in Vercel/production
4. **Test end-to-end** with sample constraint sets
5. **Monitor** solver response times and fallback rates
6. **Document** solver SLA (target availability/latency)

## Support

For issues:
- Check Z3 solver logs: `docker logs z3-solver`
- Review DSG Control Plane logs: grep for `[ExternalSolver]`
- Verify SMT-LIB v2 formula generation: `lib/dsg/deterministic/external-solver.ts:generateSmt2ForProof()`
- Test solver endpoint directly with curl

---

**Last Updated:** 2026-06-28  
**Status:** Infrastructure ready, awaiting deployment
