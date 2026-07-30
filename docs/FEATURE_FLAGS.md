# Feature Flags Registry

This document defines all feature flags available in the DSG control plane. Feature flags enable progressive rollout, canary deployments, and dynamic feature control without requiring a full deployment.

## Overview

Feature flags are configured via environment variables (server-side) and injected into the client at runtime. They can be toggled in Vercel settings or via `.env` files during development.

### Server-Side Usage

```typescript
import { getFeatureFlagServer, vercelFlagClient } from '@/lib/vercel-flags';

// In a server component:
const isEnabled = getFeatureFlagServer('ENABLE_MONITOR_DASHBOARD');

// Or using the client:
const client = vercelFlagClient();
const allFlags = await client.flags();
```

### Client-Side Usage

```typescript
import { useFeatureFlag } from '@/lib/hooks/useFeatureFlag';

// In a client component:
export function MyComponent() {
  const { enabled, loading } = useFeatureFlag('ENABLE_MONITOR_DASHBOARD');
  
  if (loading) return <Skeleton />;
  return enabled ? <Dashboard /> : <Placeholder />;
}
```

## Feature Flags

| Flag | Owner | Description | Default | Target Date | Status |
|------|-------|-------------|---------|-------------|--------|
| `ENABLE_MONITOR_DASHBOARD` | monitor-lead | Enable Monitor pillar dashboard and runtime execution tracking | `true` | 2026-11-30 | Phase 1 |
| `ENABLE_AUDIT_LOG` | audit-lead | Enable Audit pillar and comprehensive audit log features | `false` | 2026-10-31 | Phase 2 |
| `ENABLE_COMPLIANCE_EXPORT` | audit-lead | Enable compliance evidence pack export functionality | `false` | 2026-11-15 | Phase 2 |
| `ENABLE_BILLING_UI` | optimize-lead | Enable Optimize pillar billing UI and cost tracking | `true` | 2026-11-30 | Phase 1 |
| `ENABLE_DELIVERY_PROOF` | optimize-lead | Enable Delivery Proof scanning and report generation | `true` | 2026-11-30 | Phase 1 |

## Rollout Strategy

### Phase 1 (Current)
- **Duration**: Weeks 1-2
- **Rollout**: 10% → 25% → 50%
- **Flags**:
  - `ENABLE_MONITOR_DASHBOARD` (Already 100% enabled)
  - `ENABLE_BILLING_UI` (Already 100% enabled)
  - `ENABLE_DELIVERY_PROOF` (Already 100% enabled)

### Phase 2
- **Duration**: Weeks 3-4
- **Rollout**: 10% → 25% → 50% → 100%
- **Flags**:
  - `ENABLE_AUDIT_LOG` (Currently 0% — prep for rollout)
  - `ENABLE_COMPLIANCE_EXPORT` (Currently 0% — prep for rollout)

### Phase 3+
- Future flags for additional pillar features
- Gradual rollout based on canary metrics

## Environment Variables

Feature flags are controlled via environment variables named `FEATURE_FLAG_<FLAG_NAME>`.

### Development (.env.local)
```bash
FEATURE_FLAG_ENABLE_MONITOR_DASHBOARD=true
FEATURE_FLAG_ENABLE_AUDIT_LOG=false
FEATURE_FLAG_ENABLE_BILLING_UI=true
FEATURE_FLAG_ENABLE_DELIVERY_PROOF=true
FEATURE_FLAG_ENABLE_COMPLIANCE_EXPORT=false
```

### Vercel Settings
In Vercel project settings, add environment variables in the format:
```
FEATURE_FLAG_ENABLE_MONITOR_DASHBOARD = true
```

For preview/staging deployments, you can override specific flags to test new features.

## Rollout Monitoring

Each flag should be monitored for:
- **Error Rate**: Spike indicates feature bug
- **Latency**: New feature may add overhead
- **User Feedback**: Feature-specific issues
- **Canary Metrics**: Success criteria from feature owner

### Kill Switch Protocol

If a flag needs to be disabled urgently:

1. Set the environment variable to `false` in Vercel
2. Redeploy or wait for next deployment (if auto-updated)
3. Notify the feature owner and team
4. Create a post-mortem if critical issues were detected

## Adding New Flags

To add a new feature flag:

1. **Update `lib/vercel-flags.ts`**:
   ```typescript
   type FeatureFlagName =
     | 'ENABLE_MONITOR_DASHBOARD'
     | 'ENABLE_AUDIT_LOG'
     | 'ENABLE_NEW_FEATURE';  // Add here

   const DEFAULT_FLAGS: Record<FeatureFlagName, boolean> = {
     ENABLE_MONITOR_DASHBOARD: true,
     ENABLE_AUDIT_LOG: false,
     ENABLE_NEW_FEATURE: false,  // Add here
   };
   ```

2. **Update this document** with flag details, owner, and rollout timeline

3. **Create feature tests** that verify behavior with and without the flag

4. **Document in PR** what the flag controls and rollout strategy

5. **Set environment variable** in Vercel before deploying to production

## Testing Flags

### Unit Tests
```typescript
import { getFeatureFlagServer } from '@/lib/vercel-flags';

describe('Feature Flag Tests', () => {
  it('returns correct value when enabled', () => {
    process.env.FEATURE_FLAG_ENABLE_MONITOR_DASHBOARD = 'true';
    expect(getFeatureFlagServer('ENABLE_MONITOR_DASHBOARD')).toBe(true);
  });
});
```

### E2E Tests
```typescript
test('Monitor dashboard is hidden when flag is disabled', async ({ page }) => {
  page.context().addInitScript(() => {
    window.__featureFlags = { ENABLE_MONITOR_DASHBOARD: false };
  });
  await page.goto('/dashboard');
  await expect(page.locator('[data-testid="monitor-dashboard"]')).not.toBeVisible();
});
```

## Migration and Cleanup

Once a feature is fully rolled out (100% of users):

1. **Identify cleanup window**: Typically 2-4 weeks after 100% rollout
2. **Remove flag checks** from code (keep fallback code path for safety)
3. **Update documentation** to mark flag as removed
4. **Remove from Vercel settings** after 30 days

Example cleanup:
```typescript
// Before:
if (featureFlag) {
  return <NewComponent />;
} else {
  return <LegacyComponent />;
}

// After 100% rollout:
return <NewComponent />;
```

## Related Documentation

- [Vercel Integration](./vercel-integration.md)
- [Deployment Runbook](./RUNBOOK_DEPLOY.md)
- [Environment Setup](./ENV_SETUP.md)
