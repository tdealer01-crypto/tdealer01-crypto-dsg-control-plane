# Phase 9A — Test Harness

Central test infrastructure for all E2E scenarios and connector simulation.

## Structure

```
tests/harness/
  ├── connector-simulator/      # Simulate connector behavior (GitHub, Vercel, Stripe)
  ├── oauth-simulator/          # Simulate OAuth flows (success, cancel, error)
  ├── event-bus/                # Verify event ordering and loss detection
  ├── rollback/                 # Test state restoration across components
  ├── health/                   # Connector health checks and monitoring
  ├── utils/                    # Shared test utilities
  └── fixtures/                 # Mock data and fixtures
```

## Purpose

Every connector will run through this harness. Ensures:
- Consistent test environment
- Fault injection capability
- Evidence collection (ledger, audit trail)
- Deterministic assertions

## Usage

```typescript
import { TestHarness } from './harness';

const harness = new TestHarness();
await harness.start();
// Run scenario
const result = await harness.execute(scenario);
await harness.verify(); // Check ledger, audit, event bus
```

## Success Criteria (Phase 9)

- ✅ E2E passes all main scenarios
- ✅ Rollback restores state correctly
- ✅ Event Bus doesn't lose events under load
- ✅ Ledger and Audit verification complete
- ✅ Replay produces consistent results
- ✅ Dashboard displays real execution data
