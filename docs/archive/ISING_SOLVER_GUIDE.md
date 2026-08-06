# Ising Solver Tool for Agents

## Overview

The Ising Solver is a probabilistic constraint satisfaction solver based on **Simulated Annealing**. It provides an alternative to Z3 SMT solver for deterministic gate evaluation.

**When to use:**
- Fast evaluation needed (5-50ms vs Z3 100-500ms)
- Resource-constrained environments
- Probabilistic/approximate solutions acceptable
- Binary constraint satisfaction problems
- Optimization on many boolean variables

## Architecture

### Components

1. **`lib/ising/types.ts`** - Type definitions
   - `IsingVariable` - binary variable (true/false)
   - `IsingConstraint` - constraint with satisfaction function
   - `IsingProblem` - problem definition
   - `IsingSolution` - solver output

2. **`lib/ising/solver.ts`** - Core algorithm
   - Simulated Annealing implementation
   - Temperature cooling schedule
   - Energy minimization
   - Retry strategy with varying temperatures

3. **`lib/ising/gate-adapter.ts`** - Bridge to DSG framework
   - Converts DSG constraints → Ising problem
   - Maps solver output → gate decision
   - Hash proof generation

4. **`app/api/dsg/v1/solver/ising/evaluate`** - Agent endpoint
   - REST API for agents
   - Rate limiting (100 req/min per org)
   - Entitlement checking
   - Usage recording

## Algorithm: Simulated Annealing

```
1. Initialize: random configuration of boolean variables
2. Loop for max iterations or until timeout:
   a. Pick random variable to flip (spin)
   b. Calculate energy change (constraint violations)
   c. Accept if:
      - Energy decreases (deltaE < 0), OR
      - Random chance based on temperature
   d. Cool temperature: T = T * coolingRate
3. Return best solution found
```

**Parameters:**
- `initialTemperature` (default 1.0) - starting exploration level
- `coolingRate` (default 0.995) - temperature decay per iteration
- `maxIterations` (default 5000) - iteration limit
- `timeout_ms` (default 5000) - wall-clock timeout

## Usage: Agent Calling Ising Solver

### Basic Example

```bash
curl -X POST https://control-plane.dsg.pics/api/dsg/v1/solver/ising/evaluate \
  -H "Authorization: Bearer ${DSG_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "my-workflow",
    "riskLevel": "medium",
    "context": {
      "requirement_clear": true,
      "tool_available": true,
      "permission_granted": true,
      "secret_bound": true,
      "dependency_resolved": true,
      "testable": true
    },
    "nonce": "ising-2026-07-18-12345",
    "idempotencyKey": "idem-2026-07-18-12345",
    "solverConfig": {
      "maxIterations": 10000,
      "initialTemperature": 1.0,
      "coolingRate": 0.995,
      "timeout_ms": 5000
    }
  }'
```

### Response

```json
{
  "ok": true,
  "gateStatus": "PASS",
  "proofStatus": "PASS",
  "riskLevel": "medium",
  "reason": null,
  "proof": {
    "status": "PASS",
    "solver": {
      "name": "ising-sa",
      "version": "1.0-ising-sa",
      "solverInvoked": true
    },
    "proofHash": "prf_abc123...",
    "metadata": {
      "energy": 0,
      "iterations": 342,
      "temperature_final": 0.156,
      "time_ms": 23,
      "violations": []
    }
  },
  "solver": "ising-sa",
  "timestamp": "2026-07-18T12:34:56Z",
  "responseTime_ms": 45
}
```

## Performance Comparison

| Metric | Z3 | Ising | Notes |
|--------|-----|-------|-------|
| **Avg latency** | 150-500ms | 20-100ms | Ising ~3-5x faster |
| **Correctness** | 100% (exact) | ~95% (probabilistic) | Ising may miss corner cases |
| **Scalability** | O(n²-n³) | O(n) linear | Ising better for many vars |
| **Memory** | High | Low | Ising lightweight |
| **CPU intensive** | Yes | Moderate | Z3 more resource-heavy |
| **Best for** | Exact proofs | Fast decisions | Different use cases |

## Decision Logic

```
if solution.satisfiable && no_violated_constraints:
  gateStatus = PASS
elif violated_constraints.any(severity=critical):
  gateStatus = BLOCK
else:
  gateStatus = REVIEW
```

## Integration with Z3

Agents can **choose which solver** to use:

1. **Default Z3** - `/api/dsg/v1/gates/evaluate`
   - Exact formal proofs
   - Slower but guaranteed correct
   - Production compliance

2. **Ising Solver** - `/api/dsg/v1/solver/ising/evaluate`
   - Fast probabilistic decisions
   - Good for iterative refinement
   - Timeout protection

**Example Agent Strategy:**
```
if real_time_constraint:
  use Ising solver  # Fast
  if gate_status == BLOCK:
    retry with Z3  # Double-check critical blocks
else:
  use Z3 solver  # Exact proof needed
```

## Configuration for Agents

### Conservative (High Confidence)

```json
{
  "solverConfig": {
    "maxIterations": 10000,
    "initialTemperature": 2.0,
    "coolingRate": 0.99,
    "timeout_ms": 10000
  }
}
```

Slower but higher chance of finding solution.

### Fast (Quick Decision)

```json
{
  "solverConfig": {
    "maxIterations": 1000,
    "initialTemperature": 0.5,
    "coolingRate": 0.995,
    "timeout_ms": 1000
  }
}
```

Returns faster but may find suboptimal solution.

## Metrics & Monitoring

Each response includes:

```json
{
  "responseTime_ms": 45,
  "proof": {
    "metadata": {
      "energy": 0.5,           // Total constraint violation cost
      "iterations": 342,        // Iterations completed
      "temperature_final": 0.156,  // Final temperature
      "time_ms": 23,           // Solver wall-clock time
      "violations": []         // List of violated constraint IDs
    }
  }
}
```

**Interpretation:**
- `energy == 0` → all constraints satisfied
- `energy > 0` → some constraints violated (proportional to severity)
- `iterations < maxIterations` → converged early (good)
- `temperature_final` → cooling progress (should be < 0.1)

## Rate Limiting

- **Limit**: 100 requests/minute per org
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Exceeded**: HTTP 429 with `rate_limit_exceeded` error

## Error Handling

```json
{
  "ok": false,
  "error": "solver_error",
  "message": "Timeout after 5000ms"
}
```

Possible errors:
- `validation_failed` - missing nonce/idempotencyKey
- `rate_limit_exceeded` - quota exceeded
- `solver_error` - Ising algorithm failed
- `requiresUpgrade` (HTTP 402) - entitlement check failed

## Future Enhancements

1. **Hybrid solver** - use Z3 + Ising in parallel, return fastest
2. **Warm-start** - provide initial good solution to Ising
3. **GPU acceleration** - CUDA-based parallel annealing
4. **Constraint learning** - improve constraints based on solutions
5. **Constraint weighting** - adaptive weights for soft constraints

## References

- Simulated Annealing: Kirkpatrick et al. (1983)
- Ising model: Ising (1925), applications to optimization
- DSG Deterministic Gate: `/lib/dsg/deterministic/`
- Z3 Solver: `lib/dsg/deterministic/external-solver.ts`
