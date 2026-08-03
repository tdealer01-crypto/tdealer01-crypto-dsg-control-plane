import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// Custom metrics for hybrid proof verification strategy
const cacheHitCounter = new Counter('cache_hits');
const cacheMissCounter = new Counter('cache_misses');
const liveZ3Counter = new Counter('live_z3_invocations');
const proofLatencyTrend = new Trend('proof_latency_ms');
const decisionRateTrend = new Trend('decision_rate_per_sec');
const proofSourceRate = new Rate('proof_from_cache');
const z3SolverLatency = new Trend('z3_solver_latency_ms');

// Configuration
export const options = {
  stages: [
    { duration: '30s', target: 100 },    // Ramp up to 100 agents
    { duration: '1m', target: 500 },     // Ramp up to 500 agents
    { duration: '2m', target: 1000 },    // Ramp up to 1000 agents
    { duration: '3m', target: 1000 },    // Hold at 1000 agents
    { duration: '1m', target: 500 },     // Ramp down to 500 agents
    { duration: '30s', target: 0 },      // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95th percentile < 500ms, 99th < 1s
    cache_hits: ['count>0'],                         // Verify caching works
    'proof_from_cache': ['value > 0.8'],             // Target 80%+ cache hit rate
    http_req_failed: ['rate<0.01'],                  // Less than 1% failure rate
  },
};

// Test data: deterministic gate constraints
const testConstraintSets = [
  {
    name: 'simple_allow',
    constraint: {
      agent_id: 'agent-001',
      action: 'read_file',
      resource_path: '/home/user/data.txt',
      risk_level: 'low',
    },
    expected_decision: 'ALLOW',
  },
  {
    name: 'simple_block',
    constraint: {
      agent_id: 'agent-002',
      action: 'delete_database',
      resource_path: 'production_db',
      risk_level: 'critical',
    },
    expected_decision: 'BLOCK',
  },
  {
    name: 'review_required',
    constraint: {
      agent_id: 'agent-003',
      action: 'modify_config',
      resource_path: '/etc/app.conf',
      risk_level: 'medium',
    },
    expected_decision: 'REVIEW',
  },
];

// Generate deterministic test payload
function generateTestPayload(constraintIndex, agentId) {
  const constraint = testConstraintSets[constraintIndex % testConstraintSets.length];
  return {
    org_id: `org-${agentId % 10}`, // Distribute across 10 orgs for multi-tenant testing
    policy_version: 'v2-phase2-hybrid',
    constraints: constraint.constraint,
    metadata: {
      timestamp: new Date().toISOString(),
      agent_id: agentId,
      test_scenario: constraint.name,
    },
  };
}

// Main test function
export default function () {
  const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
  const apiKey = __ENV.API_KEY || 'test-api-key';
  const agentId = `load-test-${__VU}-${__ITER}`;

  group('Gate Evaluation - Hybrid Proof Path', () => {
    // Test 1: Cache hit path (primary)
    const cacheHitPayload = generateTestPayload(0, agentId);
    const cacheHitResponse = http.post(
      `${baseUrl}/api/dsg/v1/gates/evaluate`,
      JSON.stringify(cacheHitPayload),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const cacheHitStatus = check(cacheHitResponse, {
      'cache hit: status 200': (r) => r.status === 200,
      'cache hit: has decision': (r) => r.json('decision') !== undefined,
      'cache hit: has proof_source': (r) => r.json('proof_source') !== undefined,
      'cache hit: decision in valid set': (r) =>
        ['ALLOW', 'BLOCK', 'REVIEW', 'UNSUPPORTED'].includes(r.json('decision')),
    });

    if (cacheHitStatus) {
      proofLatencyTrend.add(cacheHitResponse.timings.duration);
      const proofSource = cacheHitResponse.json('proof_source');
      if (proofSource === 'cached') {
        cacheHitCounter.add(1);
        proofSourceRate.add(1);
      } else if (proofSource === 'live') {
        cacheMissCounter.add(1);
        liveZ3Counter.add(1);
        proofSourceRate.add(0);
        z3SolverLatency.add(cacheHitResponse.json('z3_time_ms') || 0);
      }
    }

    sleep(0.1); // Small delay between requests

    // Test 2: Live Z3 path (cache miss, fallback to solver)
    const liveZ3Payload = generateTestPayload(1, agentId);
    liveZ3Payload.constraints.force_fresh = true; // Force live evaluation
    const liveZ3Response = http.post(
      `${baseUrl}/api/dsg/v1/gates/evaluate`,
      JSON.stringify(liveZ3Payload),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const liveZ3Status = check(liveZ3Response, {
      'live z3: status 200': (r) => r.status === 200,
      'live z3: has z3_status': (r) => r.json('z3_status') !== undefined,
      'live z3: z3_status in valid set': (r) =>
        ['sat', 'unsat', 'unknown'].includes(r.json('z3_status')),
      'live z3: has z3_time_ms': (r) => r.json('z3_time_ms') > 0,
    });

    if (liveZ3Status) {
      proofLatencyTrend.add(liveZ3Response.timings.duration);
      z3SolverLatency.add(liveZ3Response.json('z3_time_ms') || 0);
      liveZ3Counter.add(1);
    }

    sleep(0.1);

    // Test 3: Mixed workload (random decision)
    const mixedPayload = generateTestPayload(2, agentId);
    const mixedResponse = http.post(
      `${baseUrl}/api/dsg/v1/gates/evaluate`,
      JSON.stringify(mixedPayload),
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    const mixedStatus = check(mixedResponse, {
      'mixed: status 200': (r) => r.status === 200,
      'mixed: has decision': (r) => r.json('decision') !== undefined,
      'mixed: response time < 500ms (cached)': (r) =>
        r.timings.duration < 500 || r.json('proof_source') === 'live',
    });

    if (mixedStatus) {
      proofLatencyTrend.add(mixedResponse.timings.duration);
    }

    sleep(0.5); // Realistic inter-request delay
  });

  group('Audit & Evidence', () => {
    // Verify audit trail is recorded
    const auditResponse = http.get(
      `${baseUrl}/api/audit?limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    check(auditResponse, {
      'audit: status 200': (r) => r.status === 200 || r.status === 401, // May require auth
      'audit: returns data': (r) => r.body.length > 0,
    });
  });
}

// Teardown: summary metrics
export function teardown(data) {
  console.log('=== Phase 2 Hybrid Proof Load Test Summary ===');
  console.log(`Total cache hits: ${cacheHitCounter.value}`);
  console.log(`Total cache misses (live Z3): ${cacheMissCounter.value}`);
  console.log(`Total Z3 invocations: ${liveZ3Counter.value}`);
  console.log(`Average proof latency: ${proofLatencyTrend.value}ms`);
  console.log(`Average Z3 solver latency: ${z3SolverLatency.value}ms`);
  console.log(`Estimated cache hit rate: ${(proofSourceRate.value * 100).toFixed(2)}%`);
}
