# Smoke Test Guide — DSG Control Plane

This guide documents how to run post-deployment validation tests for the DSG Control Plane. Smoke tests validate that core API endpoints are operational and responding correctly after a deployment.

## Quick Start

### Local Testing (Development)

```bash
# Make scripts executable
chmod +x scripts/smoke-test-suite.sh
chmod +x scripts/test-all-endpoints.sh

# Run the bash smoke test suite (local dev server on port 3000)
./scripts/smoke-test-suite.sh http://localhost:3000

# Run the detailed endpoint test script
./scripts/test-all-endpoints.sh http://localhost:3000
```

### Production/Staging Testing

```bash
# Test production deployment
./scripts/smoke-test-suite.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# Test with authentication token
./scripts/smoke-test-suite.sh https://prod.example.com your_auth_token_here

# Test endpoints with detailed output
./scripts/test-all-endpoints.sh https://prod.example.com your_auth_token_here
```

### Vitest Smoke Test Suite

```bash
# Run local smoke tests
npm run test tests/smoke/deployment.test.ts

# Run against production
SMOKE_TEST_URL=https://prod.example.com npm run test tests/smoke/deployment.test.ts

# Run with authentication
SMOKE_TEST_URL=https://prod.example.com SMOKE_TEST_TOKEN=your_token npm run test tests/smoke/deployment.test.ts

# Run with verbose output
SMOKE_TEST_URL=https://prod.example.com SMOKE_TEST_TOKEN=your_token npm run test -- --reporter=verbose tests/smoke/deployment.test.ts
```

## Test Suites Overview

### 1. Bash Smoke Test Suite (`scripts/smoke-test-suite.sh`)

**Purpose**: Lightweight, offline-compatible endpoint validation using curl

**Tests Included** (15 tests):
- Server availability check
- Response time assertions (<2 seconds)
- Health endpoint validation (GET /api/health)
- Readiness endpoint validation (GET /api/readiness)
- Agent status validation (GET /api/agent/status)
- Database connectivity check
- Authentication validation (missing/invalid tokens)
- CORS headers presence
- JSON response format validation
- Error handling (404, 405)
- Environment variable validation
- Rate limiting detection
- Webhook signature validation
- Deployment identity verification

**Output**: Color-coded console output with summary statistics

**Usage**:
```bash
./scripts/smoke-test-suite.sh [BASE_URL] [AUTH_TOKEN]
```

**Environment Variables**:
- `BASE_URL`: Target deployment URL (default: http://localhost:3000)
- `AUTH_TOKEN`: Bearer token for authenticated endpoints
- `STRIPE_API_KEY`: Stripe API key for webhook tests (optional)
- `CURL_TIMEOUT`: HTTP timeout in seconds (default: 10)
- `VERBOSE`: Set to 1 for debug output

**Example Output**:
```
╔════════════════════════════════════════════════════════════════╗
║     DSG Control Plane Post-Deployment Smoke Test Suite        ║
║     Target: https://prod.example.com                          ║
║     Auth: sk_live_abcdef123...                                ║
╚════════════════════════════════════════════════════════════════╝

=== Server & Connectivity Tests ===
[INFO] Test 1: Server availability check (connectivity test)
[PASS] Server availability check (connectivity test)
[INFO] Test 2: Response time assertion (health < 2 seconds)
[PASS] Response time assertion (health < 2 seconds) (145ms)

=== Test Summary ===
Total Tests Run:  15
Passed:          15
Failed:           0
Skipped:          0

✓ All critical tests passed!
```

### 2. Endpoint Test Script (`scripts/test-all-endpoints.sh`)

**Purpose**: Detailed curl-based endpoint testing with response inspection

**Tests Included**:
- Public endpoints (health, readiness, agent/status)
- Protected endpoints (audit)
- Stripe webhook endpoint
- Error handling (404, 405, 401)
- Response headers & CORS
- Performance testing (5 samples, average calculation)
- Concurrent request handling (10 parallel)
- Large payload handling (1MB)

**Output**: Detailed endpoint-by-endpoint report with curl commands shown

**Usage**:
```bash
./scripts/test-all-endpoints.sh [BASE_URL] [AUTH_TOKEN]
```

**Environment Variables**:
- `BASE_URL`: Target URL (default: http://localhost:3000)
- `AUTH_TOKEN`: Bearer token
- `STRIPE_API_KEY`: Stripe API key (optional)
- `PRETTY_PRINT`: Set to 1 for JSON pretty-printing (requires jq)
- `CURL_TIMEOUT`: HTTP timeout (default: 10)

**Example Output**:
```
[1] GET /api/health
    Description: System health check - DB, core, and readiness status
    Status: 200
    Response: 342 bytes
    
[2] GET /api/readiness
    Description: Deployment readiness report with config status
    Status: 200
    Response: 528 bytes
```

### 3. Vitest Smoke Test Suite (`tests/smoke/deployment.test.ts`)

**Purpose**: Programmatic test suite using Vitest framework for CI/CD integration

**Tests Included** (13 test groups, 40+ individual tests):
- Server connectivity
- Health & status endpoints
- Authentication & authorization
- API response format validation
- Error handling
- Database connectivity
- Environment & configuration
- Rate limiting detection
- Security headers
- Latency assertions
- Stripe integration
- Rollback detection
- Smoke test readiness

**Output**: Vitest compatible output (TAP, JSON, verbose modes)

**Usage**:
```bash
npm run test tests/smoke/deployment.test.ts
```

**Environment Variables**:
- `SMOKE_TEST_URL`: Target deployment (default: http://localhost:3000)
- `SMOKE_TEST_TOKEN`: Bearer token for authenticated tests

**Example Output**:
```
 ✓ tests/smoke/deployment.test.ts (40 tests) 1234ms

 ✓ Post-Deployment Smoke Tests (40)
   ✓ Server & Connectivity Tests (3)
   ✓ Health & Status Endpoints (3)
   ✓ Authentication & Authorization (3)
   ...
```

## Test Coverage Matrix

| Endpoint | Bash Suite | Endpoint Script | Vitest Suite | Required? |
|----------|-----------|-----------------|-------------|-----------|
| GET /api/health | ✓ | ✓ | ✓ | Yes |
| GET /api/readiness | ✓ | ✓ | ✓ | Yes |
| GET /api/agent/status | ✓ | ✓ | ✓ | Yes |
| GET /api/audit | ✓ | ✓ | ✓ | Yes (with auth) |
| POST /api/stripe/webhook | ✓ | ✓ | ✓ | Optional |
| Invalid endpoint handling | ✓ | ✓ | ✓ | Yes |
| Auth validation | ✓ | ✓ | ✓ | Yes |
| Response time (<2s) | ✓ | ✓ | ✓ | Yes |
| Rate limiting | ✓ | ✓ | ✓ | Optional |
| Concurrent requests | - | ✓ | - | Optional |
| Large payloads | - | ✓ | - | Optional |

## Running Before Deployment

### Pre-Deployment Checklist

```bash
# 1. Verify local build succeeds
npm run build

# 2. Run type checking
npm run typecheck

# 3. Run unit tests
npm run test:unit

# 4. Start local dev server
npm run dev &
sleep 3

# 5. Run smoke tests against local
./scripts/smoke-test-suite.sh http://localhost:3000
./scripts/test-all-endpoints.sh http://localhost:3000

# 6. Run Vitest smoke suite
npm run test tests/smoke/deployment.test.ts

# 7. Kill local server
kill %1
```

## Running After Deployment

### Production Validation Workflow

```bash
# 1. Wait for Vercel deployment to complete and show "Ready"
# Check: https://vercel.com/[project]

# 2. Run smoke tests against production
./scripts/smoke-test-suite.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

# 3. Expected result: All tests pass with status 200 or appropriate error codes

# 4. If tests pass, deployment is ready
# If tests fail, see "Troubleshooting Failed Tests" section below
```

### Monitoring Deployment via CI/CD

If integrated into GitHub Actions:

```bash
# This would run automatically on merge to main
npm run test tests/smoke/deployment.test.ts
./scripts/smoke-test-suite.sh $PRODUCTION_URL
```

## Interpreting Test Results

### Passing Test (✓)

```
[PASS] Health endpoint alive (GET /api/health) (status: 200, service: dsg-control-plane)
```

- Endpoint is reachable
- Response has expected structure
- Status code is in success range

### Skipped Test (⊘)

```
[SKIP] Rate limiting detection - No rate limit triggered (may be disabled)
```

- Test condition not met (e.g., feature disabled)
- Not a failure; acceptable in test environment
- May need verification in production

### Failed Test (✗)

```
[FAIL] Health endpoint alive - Unexpected status: 503
```

- Endpoint responded but with unexpected status
- OR endpoint was unreachable
- Requires investigation and fix

### Timeout (✗)

```
[FAIL] Health endpoint - Request timed out after 10 seconds
```

- Endpoint not responding within timeout window
- Indicates performance issue or deployment problem
- See "Performance Issues" in remediation section

## Debugging Failed Tests

### Enable Verbose Output

```bash
VERBOSE=1 ./scripts/smoke-test-suite.sh https://prod.example.com
```

This will print:
- Full curl requests
- Full response bodies
- Timing information
- Headers

### Manual Endpoint Testing

Test a specific endpoint manually:

```bash
# Health check
curl -v https://prod.example.com/api/health

# With pretty-printed output
curl -s https://prod.example.com/api/health | jq .

# With timing info
curl -w "\n%{time_total}s\n" https://prod.example.com/api/health

# With auth token
curl -H "Authorization: Bearer YOUR_TOKEN" https://prod.example.com/api/audit
```

### Check Server Status

```bash
# SSH into server if available
# Check logs
tail -f /var/log/app.log

# Check process
ps aux | grep node

# Check port
lsof -i :3000
```

### Vercel-Specific Debugging

```bash
# Check deployment status
vercel projects list
vercel deployments list

# View build logs
vercel logs [DEPLOYMENT_ID]

# Check environment variables
vercel env list

# Roll back if needed
vercel rollback
```

## Remediation Steps

### Issue: "db_unreachable"

**Symptom**: Health endpoint returns 503 with `"error": "db_unreachable"`

**Root Causes**:
- Supabase is down
- `SUPABASE_SERVICE_ROLE_KEY` not set
- Database connection string incorrect

**Remediation**:
```bash
# 1. Verify env vars are set
echo $SUPABASE_SERVICE_ROLE_KEY  # Should not be empty

# 2. Check Supabase status
# Visit: https://status.supabase.com/

# 3. If vars missing, set them in Vercel
vercel env set SUPABASE_SERVICE_ROLE_KEY <key>
vercel redeploy

# 4. Check database directly (if you have psql)
psql $DATABASE_URL -c "SELECT 1;"
```

### Issue: "rate_limiter_misconfigured"

**Symptom**: Health returns `"error": "rate_limiter_misconfigured"`

**Root Causes**:
- `UPSTASH_REDIS_REST_URL` not set
- Redis URL is invalid or unreachable

**Remediation**:
```bash
# 1. Check if rate limiting is required
# If not needed in development, you can set a dummy value
vercel env set UPSTASH_REDIS_REST_URL "https://dummy.upstash.io"

# 2. For production, configure Upstash Redis
# Visit: https://console.upstash.com/
# Create a new Redis database
# Copy REST URL and token
vercel env set UPSTASH_REDIS_REST_URL <url>
vercel env set UPSTASH_REDIS_REST_TOKEN <token>

# 3. Redeploy
vercel redeploy
```

### Issue: "Unexpected status: 401"

**Symptom**: Authenticated endpoint returns 401 when token is provided

**Root Causes**:
- Token has expired
- Token has wrong format
- Authorization middleware has issues

**Remediation**:
```bash
# 1. Verify token format
# Should be: "Bearer eyJhbGc..."
echo "Authorization: Bearer $AUTH_TOKEN"

# 2. Check token expiry
# Decode JWT to see expiry (use https://jwt.io or CLI tool)

# 3. Get a fresh token
# Use your auth provider's token refresh endpoint

# 4. Test with verbose output
VERBOSE=1 ./scripts/smoke-test-suite.sh https://prod.example.com $NEW_TOKEN
```

### Issue: "Timeout after 10 seconds"

**Symptom**: Response takes longer than 10 seconds or times out

**Root Causes**:
- Server overloaded
- Database query slow
- Network latency
- Blocking operation in middleware

**Remediation**:
```bash
# 1. Increase timeout for manual testing
CURL_TIMEOUT=30 ./scripts/smoke-test-suite.sh https://prod.example.com

# 2. Check server metrics
# Vercel Analytics: https://vercel.com/[project]/analytics
# Check CPU, Memory, Request count

# 3. Check database performance
# Supabase Dashboard -> Reports -> Slow Queries

# 4. If consistently slow, may need to scale
vercel scale [project]

# 5. Check for blocking operations
# Review recent changes, look for new database queries
```

### Issue: "Invalid JSON response"

**Symptom**: Response is not valid JSON, or response body is empty

**Root Causes**:
- Endpoint returns HTML error page
- Endpoint returns empty response
- Encoding issue

**Remediation**:
```bash
# 1. See what the actual response is
curl -v https://prod.example.com/api/health 2>&1 | head -50

# 2. Check content-type header
curl -i https://prod.example.com/api/health | grep -i content-type

# 3. If HTML error, look for message in response
curl -s https://prod.example.com/api/health | head -20

# 4. Check logs
vercel logs | grep "api/health"
```

### Issue: "CORS headers missing"

**Symptom**: Frontend cannot access API due to missing CORS headers

**Root Causes**:
- CORS middleware not configured
- CORS headers filtered by CDN
- Preflight OPTIONS request failing

**Remediation**:
```bash
# 1. Test CORS preflight
curl -v -X OPTIONS \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  https://prod.example.com/api/health

# 2. Check next.config.js for CORS configuration
grep -i cors next.config.js

# 3. If missing, add CORS headers in route
# See: app/api/health/route.ts or lib/security/cors.ts

# 4. Redeploy after fix
vercel redeploy
```

## Performance Tuning

### Optimizing Response Times

If response times are consistently >1 second:

```bash
# 1. Identify slow endpoints
./scripts/test-all-endpoints.sh https://prod.example.com | grep "Average"

# 2. Check detailed timing
curl -w "
  time_namelookup:  %{time_namelookup}\n
  time_connect:     %{time_connect}\n
  time_appconnect:  %{time_appconnect}\n
  time_pretransfer: %{time_pretransfer}\n
  time_redirect:    %{time_redirect}\n
  time_starttransfer: %{time_starttransfer}\n
  -----------\n
  time_total:       %{time_total}\n" \
  https://prod.example.com/api/health

# 3. Optimize slow endpoint
# - Add database indexes
# - Cache results
# - Reduce query scope
# - Use CDN for static responses

# 4. Re-test
./scripts/smoke-test-suite.sh https://prod.example.com
```

### Reducing Request Latency

```bash
# 1. Check if CDN is caching responses
curl -i https://prod.example.com/api/health | grep -i cache

# 2. Consider enabling edge caching for public endpoints
# See: next.config.js rewrite headers

# 3. Use Next.js ISR for expensive calculations
# See: Route Handlers with revalidate()

# 4. Profile database queries
# Supabase Dashboard -> Logs -> Query Analysis
```

## Continuous Monitoring

### Setting Up Automated Smoke Tests

#### GitHub Actions Example

```yaml
name: Smoke Tests

on:
  schedule:
    # Run every hour
    - cron: '0 * * * *'
  workflow_dispatch:

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      
      - name: Run smoke tests
        run: npm run test tests/smoke/deployment.test.ts
        env:
          SMOKE_TEST_URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
          SMOKE_TEST_TOKEN: ${{ secrets.DEPLOYMENT_AUTH_TOKEN }}
      
      - name: Run bash smoke tests
        run: ./scripts/smoke-test-suite.sh ${{ env.PRODUCTION_URL }}
        env:
          PRODUCTION_URL: https://tdealer01-crypto-dsg-control-plane.vercel.app
```

#### Uptime Monitoring Service Example

Use services like Better Uptime, Datadog, or New Relic:

```bash
# Set up monitoring for key endpoints
GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health
GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status

# Alert if status != 200
# Alert if response time > 2000ms
# Alert if down for > 5 minutes
```

### Log Aggregation

Monitor Vercel logs for errors:

```bash
# Set up log alerts
vercel logs --follow | grep -i "error\|fail\|exception"

# Save logs for analysis
vercel logs > deployment-logs.txt
```

## Maintenance & Updates

### Updating Tests When Endpoints Change

If you add a new endpoint:

1. Add test case to `tests/smoke/deployment.test.ts`:
```typescript
it('GET /api/new-endpoint should return 200', async () => {
  const response = await httpRequest('GET', '/api/new-endpoint');
  expect(response.status).toBe(200);
});
```

2. Add curl test to `scripts/test-all-endpoints.sh`:
```bash
test_endpoint "GET" "/api/new-endpoint" \
  "Description of new endpoint" \
  "" "false"
```

3. Add function to `scripts/smoke-test-suite.sh`:
```bash
test_new_endpoint() {
  local test_name="New endpoint test"
  ((TESTS_RUN++))
  # ...
}
```

### Regular Validation Schedule

- **Pre-deployment**: Always run full suite
- **Post-deployment**: Run within 5 minutes of deploy
- **Hourly**: Automated monitoring (production)
- **Daily**: Review logs and metrics
- **Weekly**: Review test coverage, add missing tests
- **Monthly**: Performance analysis and tuning

## Common Issues & FAQs

**Q: Tests pass locally but fail in production?**
A: Environment variables likely missing or different. Check `vercel env list` against `.env.example`.

**Q: Tests timeout intermittently?**
A: Database may be cold-starting. Wait a few minutes and retry. Consider enabling connection pooling in Supabase.

**Q: How often should I run smoke tests?**
A: Minimum: post-deployment. Recommended: hourly for production. Critical: before any major changes.

**Q: Can I skip certain tests?**
A: Yes, but recommend running all tests at least once per deployment. Some can be made optional for staging.

**Q: What's the expected response time?**
A: Health/Status should be <1 second. Readiness may take up to 5 seconds due to environment checks.

## Support

For issues with smoke tests:

1. Enable `VERBOSE=1` mode
2. Check response bodies for error messages
3. Review Vercel logs
4. Check Supabase status
5. Consult CLAUDE.md deployment section
6. Review RUNBOOK_DEPLOY.md for recovery procedures

---

**Last Updated**: 2026-06-07
**Relevant PRs**: See version control history
**Status**: Ready for production use
