/**
 * k6 Load Testing Script: DSG Control Plane - 1000 Parallel Agents
 *
 * Purpose: Simulate 1000 concurrent AI agents interacting with the DSG control plane
 * Endpoints: /api/health, /api/agent/status, /api/proof/claim-readiness
 *
 * Usage:
 *   k6 run load/parallel-1000-agents.k6.js
 *   k6 run --vus=100 --duration=30s load/parallel-1000-agents.k6.js (quick test)
 *   k6 run -e BASE_URL=https://staging.example.com load/parallel-1000-agents.k6.js
 *   k6 cloud load/parallel-1000-agents.k6.js (upload to k6 Cloud)
 *
 * Notes:
 *   - 1000 VUs requires significant system resources (~8GB+ RAM, high CPU)
 *   - Start with 100 VUs on first run to verify environment
 *   - Total test duration: 210 seconds (3.5 minutes)
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Gauge } from 'k6/metrics';

// ============================================================================
// Custom Metrics
// ============================================================================

const agentChecks = new Counter('agent_checks');
const claimReadinessLatency = new Trend('claim_readiness_latency', { unit: 'ms' });
const healthCheckLatency = new Trend('health_check_latency', { unit: 'ms' });
const agentStatusLatency = new Trend('agent_status_latency', { unit: 'ms' });
const activeAgents = new Gauge('active_agents');
const jsonParseFailures = new Counter('json_parse_failures');

// ============================================================================
// Configuration
// ============================================================================

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const BEARER_TOKEN = __ENV.BEARER_TOKEN || 'Bearer demo-agent-token-12345';
const THINK_TIME_MIN = 0.5;  // 500ms minimum inter-request delay
const THINK_TIME_MAX = 2.0;  // 2 second maximum inter-request delay

// ============================================================================
// Load Test Options (ramping-vus executor)
// ============================================================================

export const options = {
  executor: 'ramping-vus',
  stages: [
    // Stage 1: Warm-up phase (0-30s) - Gradually ramp from 0 to 100 VUs
    {
      duration: '30s',
      target: 100,
      description: 'Warm-up: ramp 0 → 100 VUs',
    },
    // Stage 2: Sustained load (30-120s) - Hold at 500 VUs for 90 seconds
    {
      duration: '90s',
      target: 500,
      description: 'Sustained load: ramp to 500 VUs',
    },
    // Stage 3: Peak load (120-180s) - Reach peak 1000 VUs and sustain for 60s
    {
      duration: '60s',
      target: 1000,
      description: 'Peak load: ramp to 1000 VUs',
    },
    // Stage 4: Cool-down (180-210s) - Gracefully ramp down to 0
    {
      duration: '30s',
      target: 0,
      description: 'Cool-down: ramp down to 0 VUs',
    },
  ],

  // Success thresholds (gates for pass/fail)
  thresholds: {
    'http_req_failed': ['rate<0.01'],      // < 1% error rate
    'http_req_duration': [
      'p(50)<100',                           // p50 latency < 100ms
      'p(95)<500',                           // p95 latency < 500ms
      'p(99)<1000',                          // p99 latency < 1000ms
    ],
    'http_reqs': ['count>5000'],             // minimum 5000 requests total
    'health_check_latency': [
      'p(95)<200',                           // p95 health check < 200ms
    ],
    'claim_readiness_latency': [
      'p(95)<500',                           // p95 claim readiness < 500ms
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate random delay between THINK_TIME_MIN and THINK_TIME_MAX seconds
 */
function randomThinkTime() {
  const random = Math.random();
  return THINK_TIME_MIN + random * (THINK_TIME_MAX - THINK_TIME_MIN);
}

/**
 * Parse JSON response with error handling
 */
function parseJsonSafely(body, label) {
  try {
    return JSON.parse(body);
  } catch (error) {
    console.error(`[${label}] Failed to parse JSON: ${error.message}`);
    jsonParseFailures.add(1);
    return null;
  }
}

/**
 * Generate agent identifier for debugging/logging
 */
function getAgentId(__VU) {
  return `agent-${String(__VU).padStart(4, '0')}`;
}

// ============================================================================
// Main Test Function
// ============================================================================

export default function () {
  const agentId = getAgentId(__VU);

  // Update active agents gauge
  activeAgents.add(__VU);

  // =========================================================================
  // Group 1: Health Check
  // =========================================================================
  group('health-checks', () => {
    const startTime = new Date();

    const healthRes = http.get(`${BASE_URL}/api/health`, {
      tags: {
        name: 'HealthCheck',
        endpoint: '/api/health',
      },
      timeout: '10s',
    });

    const healthLatency = new Date() - startTime;
    healthCheckLatency.add(healthLatency);

    check(healthRes, {
      'health: status is 200': (r) => r.status === 200,
      'health: response time < 100ms': (r) => r.timings.duration < 100,
      'health: has "ok" field': (r) => {
        const body = parseJsonSafely(r.body, 'health');
        return body && typeof body.ok === 'boolean';
      },
      'health: core_ok present': (r) => {
        const body = parseJsonSafely(r.body, 'health');
        return body && 'core_ok' in body;
      },
    });
  });

  // Random inter-request delay
  sleep(randomThinkTime());

  // =========================================================================
  // Group 2: Agent Status Check
  // =========================================================================
  group('agent-status', () => {
    const startTime = new Date();

    const statusRes = http.get(`${BASE_URL}/api/agent/status`, {
      headers: {
        'Authorization': BEARER_TOKEN,
      },
      tags: {
        name: 'AgentStatus',
        endpoint: '/api/agent/status',
      },
      timeout: '10s',
    });

    const statusLatency = new Date() - startTime;
    agentStatusLatency.add(statusLatency);

    check(statusRes, {
      'agent-status: status is 200': (r) => r.status === 200,
      'agent-status: has agent_id': (r) => {
        const body = parseJsonSafely(r.body, 'agent-status');
        return body && 'agent_id' in body;
      },
      'agent-status: db_ok present': (r) => {
        const body = parseJsonSafely(r.body, 'agent-status');
        return body && 'db_ok' in body;
      },
      'agent-status: timestamp present': (r) => {
        const body = parseJsonSafely(r.body, 'agent-status');
        return body && 'timestamp' in body;
      },
    });
  });

  // Random inter-request delay
  sleep(randomThinkTime());

  // =========================================================================
  // Group 3: Claim Readiness Check
  // =========================================================================
  group('claim-readiness', () => {
    const startTime = new Date();

    const claimRes = http.get(`${BASE_URL}/api/proof/claim-readiness`, {
      headers: {
        'Authorization': BEARER_TOKEN,
      },
      tags: {
        name: 'ClaimReadiness',
        endpoint: '/api/proof/claim-readiness',
      },
      timeout: '10s',
    });

    const claimLatency = new Date() - startTime;
    claimReadinessLatency.add(claimLatency);
    agentChecks.add(1);  // Count every agent check

    // Handle both 200 (exists) and 404 (not found) as valid responses
    check(claimRes, {
      'claim-readiness: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
      'claim-readiness: response time < 500ms': (r) => r.timings.duration < 500,
      'claim-readiness: valid JSON response': (r) => {
        const body = parseJsonSafely(r.body, 'claim-readiness');
        return body !== null;
      },
    });

    // Optional: Only check for 'claims' field if status is 200
    if (claimRes.status === 200) {
      check(claimRes, {
        'claim-readiness: has claims field (when 200)': (r) => {
          const body = parseJsonSafely(r.body, 'claim-readiness');
          return body && 'claims' in body;
        },
      });
    }
  });

  // Random inter-request delay before next iteration
  sleep(randomThinkTime());
}

// ============================================================================
// Setup (runs once before all VUs)
// ============================================================================

export function setup() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                   k6 Load Test Starting                           ║
║                  DSG Control Plane - 1000 Agents                  ║
╠═══════════════════════════════════════════════════════════════════╣
║ Base URL:        ${BASE_URL}
║ Total Duration:  210 seconds (3.5 minutes)                        ║
║ Peak VUs:        1000 concurrent agents                           ║
║ Think Time:      ${THINK_TIME_MIN}s - ${THINK_TIME_MAX}s between requests                        ║
╚═══════════════════════════════════════════════════════════════════╝
  `);

  // Quick connectivity check
  try {
    const testRes = http.get(`${BASE_URL}/api/health`, {
      timeout: '5s',
      tags: {
        name: 'SetupHealthCheck',
      },
    });

    if (testRes.status === 200) {
      console.log('✓ Successfully connected to DSG Control Plane');
    } else {
      console.warn(`⚠ DSG Control Plane returned HTTP ${testRes.status} — tests may fail`);
    }
  } catch (error) {
    console.error(`✗ Failed to connect to ${BASE_URL}: ${error.message}`);
  }

  return { startTime: new Date().toISOString() };
}

// ============================================================================
// Teardown (runs once after all VUs complete)
// ============================================================================

export function teardown(data) {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                   k6 Load Test Complete                           ║
║              Check results above for pass/fail status             ║
╠═══════════════════════════════════════════════════════════════════╣
║ Test Start:      ${data.startTime}
║ Test End:        ${new Date().toISOString()}
║ Total Agents:    Up to 1000 concurrent                            ║
║                                                                   ║
║ Next Steps:                                                       ║
║ 1. Review latency metrics (p50, p95, p99)                        ║
║ 2. Check error rates and failed requests                         ║
║ 3. Monitor database connection pool under load                   ║
║ 4. Run: k6 run load/parallel-1000-agents.k6.js --out=csv        ║
║    to export results to CSV                                      ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
}

// ============================================================================
// Implementation Notes
// ============================================================================

/*
STAGES EXPLAINED:

Stage 1: Warm-up (0-30s, ramp 0→100)
  - Allows DSG to initialize connections, warm caches
  - Gives k6 time to establish connections to target
  - Error rate typically higher due to slow-start

Stage 2: Sustained (30-120s, ramp 100→500)
  - Increases load gradually (90 seconds total)
  - Observes system behavior under moderate load
  - Helps detect connection pool exhaustion

Stage 3: Peak (120-180s, ramp 500→1000 → sustain 60s)
  - Reaches full 1000 concurrent agents
  - Sustains at peak for 60 seconds
  - Stress-tests rate limits, quotas, DB connections
  - Real-world peak capacity test

Stage 4: Cool-down (180-210s, ramp 1000→0)
  - Gracefully shuts down agents
  - Tests recovery and cleanup
  - Allows k6 to finalize metrics

LATENCY TARGETS:

  p50 < 100ms  : Fast / good response time for most requests
  p95 < 500ms  : Acceptable for 95% of agents
  p99 < 1000ms : Even under peak load, worst-case is < 1 second

ERROR RATE:

  < 1% : Allows for occasional failures (network, timeouts)
          but catches systemic issues (crashes, 500 errors)

RECOMMENDED SYSTEM SPECS FOR 1000 VUs:

  - 4+ CPU cores
  - 8GB+ RAM (k6 itself, plus system overhead)
  - Low-latency network (< 50ms to target)
  - No local resource contention (DB, cache, etc.)

QUICK TEST (for CI/development):

  k6 run --vus 100 --duration 30s load/parallel-1000-agents.k6.js

FULL PRODUCTION TEST:

  k6 run load/parallel-1000-agents.k6.js

EXPORT RESULTS:

  # CSV export for analysis
  k6 run --out=csv=results.csv load/parallel-1000-agents.k6.js

  # JSON export for detailed inspection
  k6 run --out=json=results.json load/parallel-1000-agents.k6.js

METRICS EXPLAINED:

  agent_checks            : Total number of claim readiness checks performed
  health_check_latency    : Response time for /api/health endpoint
  agent_status_latency    : Response time for /api/agent/status endpoint
  claim_readiness_latency : Response time for /api/proof/claim-readiness
  active_agents           : Current active VUs (should match stage targets)
  http_req_duration       : All HTTP request latencies (p50, p95, p99)
  http_req_failed         : Count of failed requests (4xx, 5xx, timeouts)
  http_reqs               : Total requests sent (must exceed 5000)

TROUBLESHOOTING:

  Issue: "Too many open files" error
  Fix:   Increase ulimit: ulimit -n 10000

  Issue: Connection refused on localhost:3000
  Fix:   Ensure DSG server is running: npm run dev

  Issue: High error rate (> 5%)
  Fix:   - Reduce peak VUs to 500
         - Increase think time (randomThinkTime)
         - Check DSG error logs for details

  Issue: Latency spikes at stage transitions
  Fix:   Normal behavior, monitor for sustained degradation
         If p99 > 2000ms, system may be overloaded

EXPECTED RESULTS (healthy system):

  ✓ http_req_failed < 1%
  ✓ http_req_duration p50 < 100ms
  ✓ http_req_duration p95 < 500ms
  ✓ http_req_duration p99 < 1000ms
  ✓ http_reqs count > 5000
  ✓ No significant latency increase from stage 2 to stage 3

RED FLAGS (potential issues):

  ✗ Error rate > 5% — system instability
  ✗ p99 latency > 2000ms — connection pool exhausted or DB slow
  ✗ Memory leak indicators (latency increases over time)
  ✗ Timeout errors under load — increase connection pool size
*/
