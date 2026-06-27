================================================================================
DSG CONTROL PLANE - SMOKE TEST SUITE
Post-Deployment Integration Testing Suite
================================================================================

CREATED FILES:
1. scripts/smoke-test-suite.sh        (20 KB)  - 15 tests, bash-based, no deps
2. scripts/test-all-endpoints.sh       (11 KB)  - Detailed curl endpoint tests
3. tests/smoke/deployment.test.ts     (21 KB)  - 40+ vitest test cases
4. docs/SMOKE_TEST_GUIDE.md           (18 KB)  - Comprehensive documentation

QUICK START:

Local Testing (Development):
  chmod +x scripts/smoke-test-suite.sh scripts/test-all-endpoints.sh
  ./scripts/smoke-test-suite.sh http://localhost:3000
  npm run test tests/smoke/deployment.test.ts

Production Testing:
  ./scripts/smoke-test-suite.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
  SMOKE_TEST_URL=https://prod.example.com npm run test tests/smoke/deployment.test.ts

With Authentication:
  ./scripts/smoke-test-suite.sh https://prod.example.com your_token_here
  ./scripts/test-all-endpoints.sh https://prod.example.com your_token_here

WHAT GETS TESTED:

Core Endpoints:
  ✓ GET /api/health              - System health, DB status, rate limiter
  ✓ GET /api/readiness           - Deployment config readiness
  ✓ GET /api/agent/status        - Deployment identity
  ✓ GET /api/audit               - Audit events (auth required)
  ✓ POST /api/stripe/webhook     - Webhook endpoint

Security & Auth:
  ✓ Missing Bearer token → 401
  ✓ Invalid Bearer token → 401
  ✓ Protected endpoints reject anonymous access

Response Quality:
  ✓ Valid JSON format
  ✓ Proper Content-Type headers
  ✓ No sensitive data leakage
  ✓ Proper CORS headers

Performance:
  ✓ Health endpoint < 2 seconds
  ✓ Status endpoint < 1.5 seconds
  ✓ Readiness < 5 seconds
  ✓ Concurrent request handling (10 parallel)
  ✓ Large payload handling (1MB)

Reliability:
  ✓ Rate limiting detection
  ✓ Error handling (404, 405, etc)
  ✓ Database connectivity check
  ✓ Environment variable validation
  ✓ Timeout handling

SCRIPTS OVERVIEW:

scripts/smoke-test-suite.sh
  - Lightweight bash script using curl
  - 15 comprehensive tests
  - Color-coded output
  - No external dependencies (except curl)
  - Works offline after initial setup
  - Perfect for CI/CD pipelines

  Usage:
    ./scripts/smoke-test-suite.sh [BASE_URL] [AUTH_TOKEN]

  Example:
    ./scripts/smoke-test-suite.sh https://prod.example.com sk_live_abc

scripts/test-all-endpoints.sh
  - Detailed endpoint-by-endpoint testing
  - Performance profiling (timing per request)
  - Concurrent request testing
  - Large payload handling
  - Optional JSON pretty-printing (with jq)
  - Detailed curl command output

  Usage:
    ./scripts/test-all-endpoints.sh [BASE_URL] [AUTH_TOKEN]

  Example:
    ./scripts/test-all-endpoints.sh https://prod.example.com

tests/smoke/deployment.test.ts
  - Vitest-based test suite
  - 13 test groups, 40+ individual tests
  - Programmatic assertions
  - Easy CI/CD integration
  - Supports both local and remote testing
  - Full error reporting with stack traces

  Usage:
    npm run test tests/smoke/deployment.test.ts
    SMOKE_TEST_URL=https://prod.example.com npm run test tests/smoke/deployment.test.ts
    SMOKE_TEST_URL=https://prod.example.com SMOKE_TEST_TOKEN=xyz npm run test tests/smoke/deployment.test.ts

ENVIRONMENT VARIABLES:

For smoke-test-suite.sh:
  BASE_URL         - Target URL (required as arg or env var)
  AUTH_TOKEN       - Bearer token (optional)
  STRIPE_API_KEY   - Stripe key for webhook tests
  CURL_TIMEOUT     - Request timeout in seconds (default: 10)
  VERBOSE          - Set to 1 for debug output

For test-all-endpoints.sh:
  BASE_URL         - Target URL (required)
  AUTH_TOKEN       - Bearer token
  STRIPE_API_KEY   - Stripe API key
  PRETTY_PRINT     - Set to 1 to pretty-print JSON (requires jq)
  CURL_TIMEOUT     - Request timeout (default: 10)

For deployment.test.ts:
  SMOKE_TEST_URL   - Target deployment (default: http://localhost:3000)
  SMOKE_TEST_TOKEN - Bearer token for authenticated tests

DEPLOYMENT WORKFLOW:

1. Pre-Deployment:
   npm run build
   npm run typecheck
   npm run test:unit
   npm run dev &
   ./scripts/smoke-test-suite.sh http://localhost:3000
   npm run test tests/smoke/deployment.test.ts
   kill %1

2. Post-Deployment (within 5 minutes):
   ./scripts/smoke-test-suite.sh https://prod.url
   npm run test tests/smoke/deployment.test.ts

3. Production Validation:
   ./scripts/smoke-test-suite.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
   If all tests pass → DEPLOYMENT READY
   If tests fail → CHECK DOCS/SMOKE_TEST_GUIDE.md#Remediation

EXPECTED OUTPUT:

Successful Run:
  ╔════════════════════════════════════════════════════════════════╗
  ║     DSG Control Plane Post-Deployment Smoke Test Suite        ║
  ║     Target: https://prod.example.com                          ║
  ╚════════════════════════════════════════════════════════════════╝

  === Test Summary ===
  Total Tests Run:  15
  Passed:          15
  Failed:           0
  Skipped:          0

  ✓ All critical tests passed!

Failed Run:
  === Test Summary ===
  Total Tests Run:  15
  Passed:          14
  Failed:           1
  Skipped:          0

  Failed Tests:
    - Health endpoint alive - Unexpected status: 503

  ✗ 1 test(s) failed. Review above for details.

EXIT CODES:
  0 - All tests passed
  1 - One or more tests failed

TROUBLESHOOTING:

Common Issues:
  "db_unreachable"              → Check SUPABASE_SERVICE_ROLE_KEY
  "rate_limiter_misconfigured"  → Set UPSTASH_REDIS_REST_URL
  "Unexpected status: 401"      → Verify auth token validity
  "Timeout after 10 seconds"    → Server overloaded or DB slow
  "Invalid JSON response"       → Check endpoint returns proper JSON

For detailed troubleshooting:
  - See SMOKE_TEST_GUIDE.md (comprehensive 400+ line guide)
  - Enable VERBOSE=1 for debug output
  - Check Vercel deployment logs
  - Check Supabase database status

CONTINUOUS MONITORING:

Recommended Schedule:
  - Pre-deployment:      Always (before any merge to main)
  - Post-deployment:     Within 5 minutes
  - Hourly:              Automated monitoring
  - Daily:               Review logs and metrics
  - Weekly:              Test coverage review

GitHub Actions Integration:
  Add to .github/workflows/smoke-tests.yml:

  name: Smoke Tests
  on:
    schedule:
      - cron: '0 * * * *'  # Every hour

  jobs:
    smoke-tests:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
        - run: npm ci
        - run: npm run test tests/smoke/deployment.test.ts
          env:
            SMOKE_TEST_URL: https://prod.example.com
            SMOKE_TEST_TOKEN: ${{ secrets.AUTH_TOKEN }}

COMPLETE DOCUMENTATION:

See: docs/SMOKE_TEST_GUIDE.md

This guide includes:
  - Detailed test descriptions (400+ lines)
  - Complete remediation procedures
  - Performance tuning tips
  - CI/CD integration examples
  - Monitoring setup instructions
  - FAQ and common issues
  - Maintenance schedules

TEST MATRIX:

                          | Bash Suite | Curl Script | Vitest | Required
  ──────────────────────────────────────────────────────────
  Health endpoint         |      ✓     |      ✓      |   ✓    |   Yes
  Readiness endpoint      |      ✓     |      ✓      |   ✓    |   Yes
  Status endpoint         |      ✓     |      ✓      |   ✓    |   Yes
  Audit endpoint          |      ✓     |      ✓      |   ✓    |   Yes
  Auth validation         |      ✓     |      ✓      |   ✓    |   Yes
  Response format         |      ✓     |      ✓      |   ✓    |   Yes
  Error handling          |      ✓     |      ✓      |   ✓    |   Yes
  Response time (<2s)     |      ✓     |      ✓      |   ✓    |   Yes
  Rate limiting           |      ✓     |      ✓      |   ✓    |  Optional
  Concurrent requests     |      -     |      ✓      |   -    |  Optional
  Large payloads          |      -     |      ✓      |   -    |  Optional
  CORS headers            |      ✓     |      ✓      |   ✓    |  Optional
  Performance metrics     |      ✓     |      ✓      |   ✓    |  Optional

BEST PRACTICES:

1. Run all three test suites for comprehensive coverage
2. Maintain separate test schedules for dev/staging/prod
3. Use CI/CD integration for automated validation
4. Monitor response times and set alerts for degradation
5. Review test results after every deployment
6. Keep test suite in sync with endpoint changes
7. Document any skipped tests and reasons
8. Rotate auth tokens before they expire

FILES CREATED:

1. /scripts/smoke-test-suite.sh
   - Pure bash implementation
   - Uses curl (widely available)
   - No npm dependencies
   - ~500 lines of code
   - 15 test functions
   - Color-coded output
   - Executable: ✓

2. /scripts/test-all-endpoints.sh
   - Detailed endpoint testing
   - Performance analysis
   - Concurrent request testing
   - ~450 lines of code
   - Optional jq dependency
   - Executable: ✓

3. /tests/smoke/deployment.test.ts
   - Vitest test suite
   - 40+ individual tests
   - 13 test groups
   - Full TypeScript typing
   - CI/CD friendly
   - Comprehensive assertions

4. /docs/SMOKE_TEST_GUIDE.md
   - 400+ line comprehensive guide
   - Setup instructions
   - Troubleshooting procedures
   - Remediation steps
   - Performance tuning
   - Monitoring setup
   - FAQ and best practices

STATUS: ✅ Ready for Review (Not Committed)

All files created and tested. Ready for review before committing.
No changes pushed to remote repository.

================================================================================
Next Steps:
  1. Review the SMOKE_TEST_GUIDE.md for complete documentation
  2. Run tests locally: ./scripts/smoke-test-suite.sh http://localhost:3000
  3. Verify against dev/staging deployment
  4. Integrate into CI/CD pipeline (.github/workflows)
  5. Commit when satisfied with coverage and results
================================================================================
