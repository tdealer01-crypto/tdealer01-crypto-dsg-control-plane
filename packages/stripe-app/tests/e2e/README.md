# Stripe App E2E Tests and Performance Benchmarks

This directory contains comprehensive end-to-end tests and performance benchmarks for the Stripe App, covering complete user workflows, UI responsiveness, and system performance.

## Test Structure

### Test Files

- **`stripe-app.spec.ts`** - Main E2E test suite with 45+ test cases organized into the following categories:
  - Dashboard Navigation (6 tests)
  - OAuth Connection Workflow (6 tests)
  - Policy Creation Workflow (9 tests)
  - Audit Trail Display (9 tests)
  - UI Responsiveness (6 tests)
  - Authentication & Authorization (5 tests)
  - Error Handling (3 tests)
  - Mobile Responsiveness (3 tests)
  - Complete User Workflows (5 tests)
  - Performance Benchmarks (7 tests)

### Supporting Files

- **`performance-baseline.ts`** - Performance thresholds and utilities
  - Defines acceptable performance ranges for different operations
  - Provides helpers for calculating statistics and generating reports
  - Supports production, staging, and development environments

- **`benchmark-runner.ts`** - Performance benchmark execution utilities
  - `BenchmarkRunner` - Executes and tracks performance measurements
  - `BenchmarkAggregator` - Combines results across multiple runs
  - `PerformanceProfiler` - Detailed execution profiling
  - `ThresholdValidator` - Validates measurements against thresholds
  - `MemoryTracker` - Tracks memory usage patterns

- **`fixtures.ts`** - Test data and utilities
  - `TestDataGenerator` - Creates realistic test data
  - `TestDataValidator` - Validates test data integrity
  - `TestScenarioBuilder` - Builds complex test scenarios
  - `MockResponseBuilder` - Creates mock API responses
  - Pre-defined test policies, charges, and audit events

## Performance Thresholds

All performance measurements are tracked against defined thresholds:

| Operation | Threshold | Environment |
|-----------|-----------|-------------|
| Dashboard Load | 2000ms | Local |
| Audit Page Load | 1000ms | Local |
| Policy Creation | 1500ms | Local |
| Policy Evaluation | 800ms | Local |
| Form Input Response | 500ms | Local |
| Audit Search | 1200ms | Local |
| Webhook Latency | 2000ms | Local |

For production and staging, thresholds are stricter:
- **Production**: 20-30% more strict than local thresholds
- **Staging**: 10-20% more strict than local thresholds

See `performance-baseline.ts` for environment-specific budgets.

## Running Tests

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test Suite

```bash
# Run only dashboard navigation tests
npx playwright test -g "Dashboard Navigation"

# Run only performance benchmarks
npx playwright test -g "Performance Benchmarks"

# Run only mobile responsiveness tests
npx playwright test -g "Mobile Responsiveness"
```

### Run Against Staging Environment

```bash
export PLAYWRIGHT_STAGING_TEST=true
export PLAYWRIGHT_BASE_URL=https://staging.example.com
npm run test:e2e:staging
```

### Run with Visual Debugging

```bash
npx playwright test --debug
```

### Record Test Video

```bash
npx playwright test --record-video=on
```

## Test Categories

### 1. Dashboard Navigation (6 tests)

Tests the main navigation patterns:
- Loading dashboard
- Displaying connected accounts section
- Showing "Connect Account" button
- Navigating to policies, audit, and settings sections

**Verification**: Page loads, navigation links visible, correct URLs

### 2. OAuth Connection Workflow (6 tests)

Tests Stripe OAuth flow:
- OAuth authorization button visibility
- State parameter generation
- Scope configuration
- Redirect to Stripe OAuth endpoint
- OAuth callback handling
- Session persistence after OAuth

**Verification**: OAuth UI elements present, state parameters included, redirects work

### 3. Policy Creation Workflow (9 tests)

Tests creating and managing policies:
- Policy creation form display
- Form field validation (operation type, max amount, action)
- Form submission
- New policy appearing in list
- Required field validation
- Amount format validation
- Editing policies
- Deleting policies

**Verification**: Form renders, validation works, policies persist, CRUD operations succeed

### 4. Audit Trail Display (9 tests)

Tests audit log features:
- Audit log table display
- Column headers visible
- Pagination controls
- Filtering by operation type
- Filtering by decision
- Filtering by date range
- Searching by Stripe ID
- Clicking audit rows for details
- Exporting audit logs

**Verification**: Data displays, filters work, search responds, export initiates

### 5. UI Responsiveness (6 tests)

Performance tests for UI interactions:
- Dashboard loads in < 2 seconds
- Audit page loads in < 1 second
- Form input responds immediately (< 500ms)
- Success messages display
- Error messages display

**Verification**: Load times meet thresholds, visual feedback is immediate

### 6. Authentication & Authorization (5 tests)

Tests security and access control:
- Unauthenticated users redirected to login
- Authentication required for dashboard
- Authorization enforced for account access
- User account info displayed
- Logout functionality

**Verification**: Protected routes redirect, auth gates work, session management correct

### 7. Error Handling (3 tests)

Tests error recovery:
- API errors handled gracefully
- Network timeouts don't crash UI
- Missing data shows empty state

**Verification**: UI remains functional, error messages appropriate, no crashes

### 8. Mobile Responsiveness (3 tests)

Tests mobile viewport behavior:
- Dashboard renders on mobile (375x667)
- Buttons are touch-friendly (30px+ minimum)
- Form input works on mobile devices

**Verification**: Layout adapts, touch targets adequate, input functional

### 9. Complete User Workflows (5 tests)

End-to-end workflows combining multiple features:
- Connect account → Create policy → View audit
- OAuth flow with callback
- Policy creation → Evaluation → Audit trail
- Bulk operations with filtering
- Settings configuration

**Verification**: Multi-step workflows complete, data flows correctly

### 10. Performance Benchmarks (7 tests)

Comprehensive performance testing:
- Dashboard load performance (3 runs)
- Audit page load performance (3 runs)
- Policy creation time
- Form input response time
- Audit search performance
- Webhook processing latency
- Performance metrics summary

**Verification**: Operations meet threshold requirements, metrics logged

## Test Output

Tests generate detailed performance reports:

```
╔════════════════════════════════════════════════════════════╗
║         STRIPE APP E2E PERFORMANCE BASELINE REPORT         ║
╠════════════════════════════════════════════════════════════╣
║ Environment: local                                         ║
║ Timestamp: 2024-06-06T20:00:00.000Z                       ║
║ Suite: stripe-app-e2e                                      ║
╠════════════════════════════════════════════════════════════╣

✓ dashboardLoadBenchmark:
  Average:  1543ms        (threshold: 2000ms)
  Median:   1521ms
  Min:      1480ms
  Max:      1625ms
  P95:      1618ms
  P99:      1624ms
  Samples:  3

...
```

## Environment Variables

Configure test behavior with environment variables:

```bash
# Base URL for tests (default: http://localhost:3001)
export PLAYWRIGHT_BASE_URL=http://localhost:3001

# Enable staging-specific tests
export PLAYWRIGHT_STAGING_TEST=true

# Chromium executable path (for custom browser)
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium

# Test credentials for authentication
export E2E_TEST_EMAIL=test@example.com
export E2E_TEST_PASSWORD=your_password
```

## Debugging

### View Test Traces

```bash
npx playwright show-trace trace.zip
```

### Run Single Test

```bash
npx playwright test -g "should load dashboard in <2 seconds"
```

### Interactive Debug Mode

```bash
npx playwright test --debug
```

### Inspect Element During Test

```bash
# Add to test:
await page.pause();
```

## Performance Analysis

### Generate Performance Report

Tests automatically generate performance metrics. View final report:

```bash
npm run test:e2e 2>&1 | grep -A 100 "Performance Metrics Summary"
```

### Compare Performance Across Runs

Use the `BenchmarkAggregator` to compare performance:

```typescript
const aggregator = new BenchmarkAggregator();
aggregator.addSuite(run1Results);
aggregator.addSuite(run2Results);
console.log(aggregator.formatComparison());
```

### Export Metrics

Export test metrics for analysis:

```bash
# JSON format
npm run test:e2e > test-results.json

# CSV format (requires post-processing with benchmark-runner)
# Update test file to call exportAsCSV()
```

## Best Practices

1. **Isolate tests** - Each test should be independent
2. **Use fixtures** - Leverage `TestDataGenerator` for consistent data
3. **Check thresholds** - Always verify performance meets expectations
4. **Handle timeouts** - Use `.catch(() => false)` for optional elements
5. **Log measurements** - Record all performance data for trending
6. **Skip when needed** - Use `test.skip()` for environment-dependent tests
7. **Clean up** - Close contexts and pages in finally blocks

## Continuous Integration

Tests run automatically in CI:

```yaml
# .github/workflows/e2e-playwright-docker.yml
- run: npm run test:e2e
  if: matrix.node-version == 18
```

Tests fail if:
- Any E2E test fails
- Performance thresholds exceeded
- Critical errors in error handling

## Known Limitations

1. **OAuth Callback** - Real OAuth flow may require authentication
2. **Stripe Integration** - Tests use mock data, not real Stripe accounts
3. **Staging Tests** - Require valid environment configuration
4. **Performance** - Thresholds may vary based on system load

## Maintenance

### Update Thresholds

Edit `PERF_THRESHOLDS` in `stripe-app.spec.ts` or update `DEFAULT_THRESHOLDS` in `performance-baseline.ts`.

### Add New Tests

1. Create test case with descriptive name
2. Use existing fixtures from `fixtures.ts`
3. Record performance metrics
4. Add assertions for success criteria

### Update Performance Budgets

Environment-specific budgets are in `PERFORMANCE_BUDGETS` in `performance-baseline.ts`.

## Related Files

- Playwright config: `../../playwright.config.ts`
- E2E workflow: `../../.github/workflows/e2e-playwright-docker.yml`
- Test utilities: `./fixtures.ts`, `./performance-baseline.ts`, `./benchmark-runner.ts`

## Support

For issues or questions:

1. Check test output for specific failures
2. Review performance baseline thresholds
3. Verify environment configuration
4. Check browser/Playwright version compatibility
5. Review traces and videos from failed tests

## Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Performance Testing Guide](../../docs/PERFORMANCE.md)
- [CI/CD Workflows](../../.github/workflows/)
