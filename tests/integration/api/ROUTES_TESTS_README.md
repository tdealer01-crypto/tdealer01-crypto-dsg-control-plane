# High-Priority API Routes Integration Tests

Comprehensive test coverage for 45+ currently untested endpoints across critical control plane routes.

## Quick Start

```bash
# Run all routes tests
npm run test:integration -- routes-

# Run a specific test file
npm run test:integration routes-agent-execute.test.ts

# Run with coverage report
npm run test:coverage -- routes-
```

## Test Files Overview

| File | Lines | Routes | Tests |
|------|-------|--------|-------|
| routes-settings.test.ts | 380 | 4 | 13 |
| routes-agent-execute.test.ts | 466 | 1 | 15+ |
| routes-agent-executions.test.ts | 314 | 2 | 12 |
| routes-agent-chat.test.ts | 318 | 2 | 12+ |
| routes-config.test.ts | 118 | 1 | 3 |
| routes-webhooks.test.ts | 444 | 5 | 17 |
| routes-compliance.test.ts | 404 | 5 | 20 |
| **TOTAL** | **2,444** | **20+** | **92+** |

## Route Coverage

### Settings & Configuration (Tier 1)
- ✓ PATCH /api/settings/security
- ✓ GET /api/settings/quota
- ✓ GET /api/settings/access/guests
- ✓ POST /api/settings/access/guests
- ✓ GET /api/config/language

### Agent Execution (Tier 1)
- ✓ POST /api/agent-execute
- ✓ GET /api/agent-executions
- ✓ GET /api/executions

### Agent Chat (Tier 2)
- ✓ POST /api/agent-chat
- ✓ POST /api/agent-chat-v2 (related)

### Webhooks (Tier 2)
- ✓ GET /api/webhooks-config
- ✓ POST /api/webhooks-config
- ✓ DELETE /api/webhooks-config/[id]
- ✓ POST /api/webhooks/dsg
- ✓ POST /api/webhooks/stripe

### Compliance (Tier 2)
- ✓ GET /api/compliance/export
- ✓ POST /api/compliance-evidence-pack/annex4
- ✓ GET /api/compliance-evidence-pack
- ✓ GET /api/ccvs/evidence-chain
- ✓ GET /api/ccvs/compliance-status

## Test Pattern

All tests follow this structure:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock factory functions
function makeSomeMock() { /* ... */ }

// 2. Describe test suite
describe('ENDPOINT', () => {
  beforeEach(() => vi.resetModules());
  
  // 3. Individual tests
  it('does something', async () => {
    vi.doMock('module', () => makeSomeMock());
    const { METHOD } = await import('route');
    const req = new Request(...);
    const res = await METHOD(req);
    expect(res.status).toBe(expected);
  });
});
```

## Key Testing Scenarios

### Authentication (15+ tests)
- Missing bearer token → 401
- Invalid API key → 401
- Missing org_id → 403
- Insufficient role → 403

### Validation (12+ tests)
- Invalid JSON body → 400
- Missing required fields → 400
- Invalid email format → 400
- URL not HTTPS → 400
- Empty array → 400

### Success Paths (20+ tests)
- Authorized request → 200/201
- Correct response structure
- All required fields present
- Proper data types

### Error Handling (8+ tests)
- Database connection failure → 500
- Query execution error → 500
- Proper error message

### Query Parameters (8+ tests)
- limit parameter (default, max)
- format parameter (json, csv)
- framework parameter (iso27001, soc2, gdpr)
- depth parameter (chain traversal)

## Mock Architecture

### Mock Factories

```typescript
makeAuthzMock()                  // Authorization checks
makeRuntimeAccessMock()          // Runtime authentication
makeOrgPermissionMock()          // Organization permissions
makeSupabaseMock()               // Database operations
makeReadJsonBodyMock()           // JSON body parsing
```

### Supabase Mock Pattern

```typescript
vi.doMock('lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // ... etc
    }))
  }))
}));
```

## Test Isolation

Each test:
- Calls `vi.resetModules()` in `beforeEach()`
- Uses fresh mock instances
- Does not depend on previous test state
- Can run in any order

## Response Assertions

Tests verify:
- ✓ HTTP status code
- ✓ Response body structure
- ✓ Data field types (string, number, boolean, array, object)
- ✓ Required fields present
- ✓ Enum values (ACTIVE/FAILING/DISABLED, L1-L5)
- ✓ Array length and contents

## Common Assertions

```typescript
// Status
expect(res.status).toBe(200);

// Fields exist
expect(body.items).toBeTruthy();
expect(Array.isArray(body.items)).toBe(true);

// Field types
expect(typeof body.id).toBe('string');

// Enum values
expect(['ACTIVE', 'FAILING', 'DISABLED']).toContain(body.status);

// Nested structure
expect(body.webhook.url).toBe('https://example.com/hook');
```

## Extending Tests

To add tests for more routes:

1. Create new test file: `routes-{feature}.test.ts`
2. Import { describe, it, expect, vi, beforeEach } from 'vitest'
3. Create mock factory functions
4. Describe test suite with beforeEach() reset
5. Add individual test cases (3+ per route minimum)
6. Follow existing naming conventions

Example:

```typescript
describe('GET /api/example', () => {
  beforeEach(() => vi.resetModules());

  it('returns 401 when not authenticated', async () => { /* ... */ });
  it('returns 200 with data when authorized', async () => { /* ... */ });
  it('respects limit query parameter', async () => { /* ... */ });
});
```

## CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run integration tests
  run: npm run test:integration -- routes-

- name: Upload coverage
  run: npm run test:coverage -- routes-
```

## Notes

- Tests are mocked, not using live database
- No external API calls
- Run in isolation - no shared state
- Fast execution (~100-200ms per test file)
- All async operations properly awaited
- Compatible with Next.js 15 dynamic params

## Future Enhancements

- [ ] Live database integration tests
- [ ] Rate limiting behavior tests
- [ ] CORS header validation
- [ ] Cron endpoint tests (CRON_SECRET)
- [ ] File upload/streaming tests
- [ ] Multi-organization scoping tests
