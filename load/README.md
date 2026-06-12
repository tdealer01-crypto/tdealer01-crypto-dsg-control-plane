# DSG Control Plane Load Testing - k6 Scripts

## Quick Start

### Full 1000-Agent Load Test (Production-like)
```bash
k6 run load/parallel-1000-agents.k6.js
```

### Quick Validation Test (100 VUs, 30 seconds)
```bash
k6 run --vus=100 --duration=30s load/parallel-1000-agents.k6.js
```

### Against Different Environments
```bash
# Staging
k6 run -e BASE_URL=https://staging.example.com load/parallel-1000-agents.k6.js

# Production
k6 run -e BASE_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app load/parallel-1000-agents.k6.js

# Local with custom token
k6 run -e BASE_URL=http://localhost:3000 -e BEARER_TOKEN="Bearer your-token" load/parallel-1000-agents.k6.js
```

## Test Scenarios

### parallel-1000-agents.k6.js
- **Purpose**: Full stress test of DSG with 1000 concurrent agents
- **Duration**: 210 seconds (3.5 minutes)
- **Stages**:
  - Warm-up: 0→100 VUs over 30s
  - Sustained: 100→500 VUs over 90s
  - Peak: 500→1000 VUs over 60s (sustains at 1000 for 60s)
  - Cool-down: 1000→0 VUs over 30s

**Endpoints Tested**:
- GET /api/health
- GET /api/agent/status
- GET /api/proof/claim-readiness

**SLA Thresholds**:
- Error rate: < 1%
- p50 latency: < 100ms
- p95 latency: < 500ms
- p99 latency: < 1000ms
- Minimum requests: 5000

## Environment Variables

```bash
# Base URL (default: http://localhost:3000)
-e BASE_URL=https://your-dsig.example.com

# Bearer token for authentication
-e BEARER_TOKEN="Bearer your-api-token"
```

## Export Results

```bash
# CSV format for spreadsheet analysis
k6 run --out=csv=results.csv load/parallel-1000-agents.k6.js

# JSON format for detailed inspection
k6 run --out=json=results.json load/parallel-1000-agents.k6.js

# Summary only (default)
k6 run load/parallel-1000-agents.k6.js
```

## Installation

```bash
# macOS (Homebrew)
brew install k6

# Linux (apt)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6-stable.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker run -i grafana/k6 run - < load/parallel-1000-agents.k6.js

# Download binary
https://github.com/grafana/k6/releases
```

## System Requirements

### For Full 1000 VU Test
- 4+ CPU cores
- 8GB+ RAM
- Increase file descriptors: `ulimit -n 10000`
- Low-latency network (< 50ms to target)

### For Quick Tests (100 VUs)
- 2+ CPU cores  
- 4GB+ RAM
- Standard network

## Troubleshooting

### "Too many open files"
```bash
ulimit -n 10000
k6 run load/parallel-1000-agents.k6.js
```

### Connection Refused
Ensure DSG is running:
```bash
npm run dev  # or your start script
```

### High Error Rate
1. Reduce VUs: `--vus 500`
2. Increase think time in script
3. Check DSG logs for errors

### Latency Spikes
- Normal at stage transitions
- If sustained > 2s: system may be overloaded
- Monitor database connection pool

## Metrics Explained

| Metric | Type | Description |
|--------|------|-------------|
| `agent_checks` | Counter | Total claim readiness checks |
| `health_check_latency` | Trend | Response time for health endpoint |
| `agent_status_latency` | Trend | Response time for agent status |
| `claim_readiness_latency` | Trend | Response time for claim readiness |
| `active_agents` | Gauge | Current active virtual users |
| `http_req_duration` | Trend | All HTTP request latencies |
| `http_req_failed` | Counter | Failed requests |
| `http_reqs` | Counter | Total requests sent |

## Expected Results (Healthy System)

```
✓ http_req_failed < 1%
✓ http_req_duration p50 < 100ms
✓ http_req_duration p95 < 500ms
✓ http_req_duration p99 < 1000ms
✓ http_reqs count > 5000
✓ No significant latency increase from stage 2→3
✓ Graceful degradation during cool-down
```

## Red Flags

```
✗ Error rate > 5% → System instability
✗ p99 latency > 2000ms → Connection pool exhausted
✗ Sustained latency increase → Memory leak or DB slow
✗ Timeouts increasing → Rate limiting or pool exhaustion
```

## Recording Results for Approval

```bash
# Run test and save results with timestamp
k6 run --out=json=results-$(date +%Y%m%d-%H%M%S).json load/parallel-1000-agents.k6.js
```

## K6 Documentation

- Official docs: https://k6.io/docs/
- HTTP API: https://k6.io/docs/javascript-api/k6-http/
- Metrics: https://k6.io/docs/javascript-api/k6-metrics/
- Executors: https://k6.io/docs/using-k6/scenarios/executors/

## Next Steps

1. **Install k6** if not already installed
2. **Run quick test**: `k6 run --vus=100 --duration=30s load/parallel-1000-agents.k6.js`
3. **Review output** for any failures or high latency
4. **Run full test** when ready: `k6 run load/parallel-1000-agents.k6.js`
5. **Export results** for stakeholders: `k6 run --out=csv=results.csv ...`
