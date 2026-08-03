# Phase 3: Load Testing Harness

This directory contains the k6 load testing framework for validating Phase 2 hybrid proof verification under production-like load (1000 concurrent agents).

## Quick Start

### Development Test (Local)
```bash
npm run load:dev
# Or with custom params:
bash scripts/load-test.sh dev 10
```

### Staging Test
```bash
npm run load:staging
```

### Production GO/NO-GO Test
```bash
API_KEY="your-production-api-key" npm run load:production:go
```

## Files

- **`phase2-hybrid-proof-k6.js`** — Main k6 load test script
  - 3 test groups: cache hit, live Z3, mixed workload
  - Custom metrics for cache performance tracking
  - Stages: ramp 0→100→500→1000→0 agents
  - SLA thresholds built-in

- **`README.md`** — This file

## Documentation

See `/docs/PHASE3_LOAD_TESTING.md` for:
- Detailed test scenarios
- Metrics and SLA targets
- Troubleshooting guide
- Expected results

## Environment Variables

- `BASE_URL` — API endpoint (default: http://localhost:3000)
- `API_KEY` — Bearer token for authentication

## Requirements

- k6 CLI installed (https://k6.io/docs/getting-started/installation/)
- Running DSG ONE instance (local or deployed)
- Valid API credentials

## Key Metrics

| Metric | Target |
|--------|--------|
| Cache hit rate | ≥ 80% |
| P95 latency (cached) | < 500ms |
| P99 latency (live) | < 1000ms |
| Failure rate | < 1% |

## Output

Results saved to `test-results/` directory:
- `phase3-*.csv` — Detailed metrics per request
- `phase3-*-summary.json` — JSON summary of test run
