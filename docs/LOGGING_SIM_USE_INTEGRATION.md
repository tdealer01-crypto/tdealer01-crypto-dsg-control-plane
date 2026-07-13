# DSG Logging + sim-use Integration Guide

## Overview

This guide explains the integrated logging system and LINE sim-use adapter for the DSG Control Plane Android Executor.

### What's Included

1. **Structured Logging** (`lib/logging/logger.ts`)
   - Centralized logger with DEBUG, INFO, WARN, ERROR, CRITICAL levels
   - Automatic sensitive data redaction
   - Multi-sink output: Console, Sentry, PostHog
   - Context inheritance for audit trails

2. **sim-use Integration** (`lib/integrations/sim-use.ts`)
   - Query SIM card usage data from LINE sim-use API
   - In-memory caching with configurable TTL
   - Test/dev mode with mock data (no API key required)
   - Audit logging for compliance

3. **Android Executor Enhancement** (`lib/executors/android-executor.ts`)
   - Integrated logging at every execution phase
   - Parallel SIM usage queries alongside actions
   - Complete audit context (agentId, userId, requestId, sessionId)
   - Full trace with SIM data included

---

## Quick Start (Development)

### 1. Environment Setup

```bash
# The .env.local file is already created with test/dev defaults
# Verify it exists:
cat .env.local

# Expected output:
# LOG_LEVEL=INFO
# SIM_USE_API_ENDPOINT=https://sim-use.line.biz/api/v1
# SIM_USE_API_KEY=sk_test_dev_mode_placeholder_change_me
# POSTHOG_API_KEY=phc_dev_placeholder_add_your_key
```

### 2. Run Test Demo

```bash
# Test the integration with mock data (no real API needed)
npm run test:logging

# Output shows:
# ✅ Logging at all levels
# ✅ Sensitive data redaction
# ✅ Context inheritance
# ✅ SIM usage query (returns mock data)
# ✅ Error logging
# ✅ Android executor simulation
```

### 3. Start Development Server

```bash
# Start with logging enabled
npm run dev

# The application now has:
# - Structured logging output to console
# - Sentry integration for error tracking
# - PostHog for analytics (if key configured)
# - sim-use queries working with mock data
```

---

## Configuration

### Environment Variables

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `LOG_LEVEL` | `INFO` | Log level (DEBUG, INFO, WARN, ERROR, CRITICAL) | `LOG_LEVEL=INFO` |
| `SIM_USE_API_KEY` | `sk_test_dev...` | LINE sim-use API key | `sk_test_xxx` or real key |
| `SIM_USE_API_ENDPOINT` | `https://sim-use.line.biz/api/v1` | sim-use API endpoint | Production or custom |
| `POSTHOG_API_KEY` | `phc_dev...` | PostHog API key (optional) | `phc_xxx` |

### Dev Mode Detection

The sim-use adapter automatically detects dev/test mode when:
- API key is empty
- API key contains `placeholder`
- API key starts with `sk_test_dev`

In dev mode:
- ✅ Returns realistic mock SIM data
- ✅ No network calls to real API
- ✅ Perfect for testing and development

### Production Setup

```bash
# 1. Update .env.local with real credentials:
LOG_LEVEL=WARN
SIM_USE_API_KEY=sk_live_xxxxxxxxxxxx  # Real key from LINE
POSTHOG_API_KEY=phc_xxxxxxxxxxxx

# 2. Or set Vercel environment variables:
vercel env add SIM_USE_API_KEY
vercel env add POSTHOG_API_KEY

# 3. Deploy
npm run build
vercel --prod
```

---

## Usage Examples

### Basic Logging

```typescript
import { createLogger } from '@/lib/logging/logger';

const logger = createLogger('my-module');

// Different log levels
logger.debug('Detailed information for debugging');
logger.info('Important information');
logger.warn('Warning about something');
logger.error('An error occurred', error);
logger.critical('Critical system failure', error);
```

### With Audit Context

```typescript
const logger = createLogger('my-feature');

const auditContext = {
  agentId: 'agent-123',
  userId: 'user-456',
  requestId: 'req-789',
  sessionId: 'sess-abc',
};

logger.info('User action executed', auditContext, {
  action: 'clicked_button',
  targetId: 'button-xyz',
});

// Output includes:
// - [INFO] [timestamp] [req-789] User action executed
// - Context: agentId, userId, requestId, sessionId
// - Metadata: action, targetId
```

### SIM Usage Query

```typescript
import { simUseAdapter } from '@/lib/integrations/sim-use';

const result = await simUseAdapter.queryUsage('08012345678', {
  agentId: 'agent-1',
  userId: 'user-1',
  requestId: 'req-1',
});

if (result.ok && result.data) {
  console.log(`Data Usage: ${result.data.dataPercentage}%`);
  console.log(`Call Minutes: ${result.data.callMinutesUsed}/${result.data.callMinutesLimit}`);
  console.log(`SMS: ${result.data.smsUsed}/${result.data.smsLimit}`);
}
```

### Android Executor Integration

```typescript
import { executeAndroidSafeDomCommand } from '@/lib/executors/android-executor';

const result = await executeAndroidSafeDomCommand({
  appPackage: 'com.line.app',
  frameId: 'frame-1',
  command: { elementId: 'btn-1', operation: 'click' },
  actionDescriptor: { ... },
  
  // NEW: Audit context
  auditContext: {
    agentId: 'hermes-1',
    userId: 'user-1',
    requestId: 'req-1',
  },
  
  // NEW: Enable SIM usage query
  querySIMUsage: true,
  simId: '08012345678',
});

// Result trace includes SIM data:
// {
//   ok: true,
//   trace: {
//     appPackage: 'com.line.app',
//     commandOperation: 'click',
//     simUsageQueried: true,
//     simDataPercentage: 70,
//     simStatus: 'active',
//     ...
//   }
// }
```

---

## Sensitive Data Protection

### Automatic Redaction

The logger automatically masks sensitive fields:

```
Authorization → [REDACTED]
Cookie → [REDACTED]
Token → [REDACTED]
Secret → [REDACTED]
Password → [REDACTED]
API-Key → [REDACTED]
Session → [REDACTED]
Email → [REDACTED]
```

### Example

```typescript
logger.info('User login', {
  userId: 'user-123',
  authToken: 'sk_live_very_secret_token_xyz',
  password: 'my-password',
});

// Output shows:
// authToken: sk**xyz (masked)
// password: [REDACTED]
```

---

## Log Sinks

### Console
All logs are printed to console with timestamp and level:
```
[INFO] [2026-07-13T11:20:02.894Z] Message here
[WARN] [2026-07-13T11:20:02.895Z] Warning here
[ERROR] [2026-07-13T11:20:02.896Z] Error here
```

### Sentry
Errors and critical issues are sent to Sentry:
- Requires: `SENTRY_DSN` environment variable
- Reports: ERROR and CRITICAL level logs
- Includes: Stack traces, context, metadata

### PostHog
Analytics events are sent to PostHog:
- Requires: `POSTHOG_API_KEY` environment variable
- Reports: INFO, WARN, ERROR, CRITICAL events
- Tracks: User actions, system events, errors

---

## Testing

### Run Unit Tests
```bash
# Test logging + sim-use functionality
npm run test:unit

# Expected: 14/14 tests pass
```

### Run Integration Demo
```bash
# Show full logging + sim-use flow
npm run test:logging

# Shows:
# ✅ Log levels
# ✅ Sensitive data redaction
# ✅ Context inheritance
# ✅ SIM usage queries (mock data)
# ✅ Error logging
# ✅ Android executor simulation
```

### Manual Testing
```bash
# Start dev server
npm run dev

# Make requests and check:
# 1. Console logs appear with timestamps
# 2. Errors go to Sentry (if configured)
# 3. Events appear in PostHog dashboard (if configured)
```

---

## Troubleshooting

### Logs not appearing?
```bash
# Check LOG_LEVEL is set
echo $LOG_LEVEL  # Should be: DEBUG, INFO, WARN, ERROR, or CRITICAL

# Check .env.local is loaded
cat .env.local
```

### SIM query fails?
```bash
# In dev mode, should return mock data
# In production, check:
# 1. SIM_USE_API_KEY is configured
# 2. SIM_USE_API_ENDPOINT is correct
# 3. Network access to LINE API

# Check adapter stats
simUseAdapter.getStats()  // Returns cache size, query count, etc.
```

### PostHog not capturing events?
```bash
# Check POSTHOG_API_KEY is set (and not placeholder)
echo $POSTHOG_API_KEY  # Should start with 'phc_'

# Verify PostHog dashboard is receiving events
# https://us.posthog.com/project/479488
```

### Sensitive data not redacted?
```bash
# Check field name matches pattern:
# /(authorization|cookie|token|secret|password|api[-_]?key|session|email)/i

# If not matching, add to SENSITIVE_KEY_PATTERN in logger.ts
```

---

## Architecture

### Data Flow

```
Request
  ↓
Android Executor receives command
  ↓
Log execution start (DEBUG)
  ↓
Query SIM usage (parallel, if enabled)
  ↓
Evaluate policies
  ↓
Log policy decision (INFO/WARN)
  ↓
Execute action on device
  ↓
Capture screenshot (if enabled)
  ↓
Log execution complete (INFO)
  ↓
Include SIM data in trace
  ↓
Response with full trace + audit context
```

### Components

```
┌─────────────────────────────────────┐
│  Android Executor                   │
│  (lib/executors/android-executor.ts)│
│                                     │
│  • Appium/WebDriver integration    │
│  • Policy evaluation               │
│  • Command verification            │
└────────────┬────────────────────────┘
             │
             ├─→ Logging (new)
             │   └─ createLogger()
             │      └ DSGLogger instance
             │
             └─→ sim-use queries (new)
                 └─ SimUseAdapter
                    └ Mock or API
```

### Classes

**DSGLogger**
- Methods: debug(), info(), warn(), error(), critical()
- Features: Sensitive data redaction, context inheritance, multi-sink output
- Sinks: Console, Sentry, PostHog

**SimUseAdapter**
- Methods: queryUsage(), isDataThresholdReached(), getStats(), clearCache()
- Features: Caching, dev/test mode, mock data generation
- Modes: Production (real API) or Test (mock data)

---

## Next Steps

1. **Add real API keys** when ready for production
2. **Monitor Sentry/PostHog** for errors and events
3. **Configure log retention** based on compliance needs
4. **Set up alerts** for ERROR and CRITICAL logs
5. **Review audit logs** regularly for security

---

## Files Changed

- `lib/logging/logger.ts` — Structured logger (270 lines)
- `lib/integrations/sim-use.ts` — SIM-use adapter (400 lines)
- `lib/executors/android-executor.ts` — Enhanced with logging + sim-use
- `scripts/test-logging-sim-use.ts` — Test/demo script (200 lines)
- `.env.local` — Configuration (created, not committed)

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test output: `npm run test:logging`
3. Check log output in console or Sentry dashboard
4. Contact the team for API key requests (LINE sim-use)

---

**Created:** 2026-07-13  
**Version:** 1.0 (Initial Release)  
**Status:** Production-Ready with Dev/Test Mode
