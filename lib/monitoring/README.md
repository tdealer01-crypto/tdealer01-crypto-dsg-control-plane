# DSG Monitoring System

**Phase 1: Foundation - Silent Monitoring (Non-Breaking)**

This directory contains the monitoring system for tracking agent executions, token usage, and tool calls.

## Overview

The monitoring system captures execution events without affecting the main execution flow. All monitoring operations are:
- **Async** - don't block execution
- **Non-breaking** - failures don't affect main flow
- **Optional** - can be disabled via `MONITORING_ENABLED` environment variable

## Components

### EventEmitter (`event-emitter.ts`)

Core service for capturing execution events.

```typescript
import { MonitoringEmitter } from '@/lib/monitoring/event-emitter';

const emitter = new MonitoringEmitter();

// Capture execution
const execution = await emitter.captureExecution({
  agent_id: 'agent_123',
  org_id: 'org_456',
  user_id: 'user_789',
});

// Record token usage
await emitter.recordTokenUsage(
  'claude-opus',
  100,      // input tokens
  50,       // output tokens
  0.01      // cost in USD
);

// Record tool call
const toolCall = await emitter.recordToolCall(
  'web_search',
  { query: 'AI agents' },
  'low'     // risk level
);

// Complete execution
await emitter.completeExecution('success');
```

**Key Methods:**
- `captureExecution()` - Create execution record
- `emitEvent()` - Emit monitoring event
- `recordToolCall()` - Track tool invocation
- `completeToolCall()` - Finish tool tracking
- `recordTokenUsage()` - Track token consumption
- `completeExecution()` - Mark execution complete

### ExecutionHooks (`execution-hooks.ts`)

Fire-and-forget event bus for integration into execution pipeline.

```typescript
import { monitoringBus } from '@/lib/monitoring/execution-hooks';

// Initialize
const executionId = await monitoringBus.initializeExecution({
  agentId: 'agent_123',
  orgId: 'org_456',
  userId: 'user_789',
});

// Fire events (async, non-blocking)
await monitoringBus.onTokenUsage({
  modelName: 'claude-opus',
  inputTokens: 100,
  outputTokens: 50,
  costUsd: 0.01,
});

// Record tool call
const toolId = await monitoringBus.onToolCall({
  toolName: 'web_search',
  toolInput: { query: 'test' },
  riskLevel: 'low',
});

// Mark execution complete
await monitoringBus.onExecutionComplete({
  status: 'success',
});
```

## Database Schema

### monitoring_executions
Tracks agent execution sessions.

```sql
execution_id    UUID PRIMARY KEY
agent_id        UUID NOT NULL        -- which agent ran
org_id          UUID NOT NULL        -- organization isolation
user_id         UUID                 -- who triggered it
start_time      TIMESTAMP            -- when started
end_time        TIMESTAMP            -- when finished
status          TEXT                 -- running|success|failure|blocked
input_tokens    INTEGER              -- tokens sent
output_tokens   INTEGER              -- tokens received
total_tokens    INTEGER GENERATED    -- total tokens (virtual)
model_name      TEXT                 -- which model used
total_cost_usd  NUMERIC              -- execution cost
metadata        JSONB                -- additional context
error_message   TEXT                 -- if failed
created_at      TIMESTAMP            -- record creation time
updated_at      TIMESTAMP            -- last update time
```

### monitoring_events
Tracks individual events during execution.

```sql
event_id        UUID PRIMARY KEY
execution_id    UUID REFERENCES monitoring_executions
event_type      TEXT                 -- execution_start|execution_end|tool_call|...
timestamp       TIMESTAMP            -- when event occurred
actor_id        TEXT                 -- who/what triggered event
metadata        JSONB                -- event details
created_at      TIMESTAMP
```

### monitoring_tool_calls
Tracks all tool invocations.

```sql
tool_call_id    UUID PRIMARY KEY
execution_id    UUID REFERENCES monitoring_executions
tool_name       TEXT                 -- which tool
tool_input      JSONB                -- what was called with
tool_output     JSONB                -- what it returned
risk_level      TEXT                 -- low|medium|high|critical
approval_status TEXT                 -- auto-approved|pending|approved|rejected
approval_reason TEXT                 -- why approved/rejected
started_at      TIMESTAMP
completed_at    TIMESTAMP
duration_ms     INTEGER GENERATED    -- how long it took
metadata        JSONB
created_at      TIMESTAMP
```

### monitoring_token_usage
Tracks token consumption per execution.

```sql
token_id        UUID PRIMARY KEY
execution_id    UUID REFERENCES monitoring_executions
model_name      TEXT                 -- which model used
input_tokens    INTEGER              -- tokens in
output_tokens   INTEGER              -- tokens out
cost_usd        NUMERIC              -- cost for this batch
timestamp       TIMESTAMP
metadata        JSONB
created_at      TIMESTAMP
```

## Configuration

### Environment Variables

```bash
# Enable/disable monitoring globally
MONITORING_ENABLED=true|false (default: false)

# Data retention
MONITORING_RETENTION_DAYS=30 (default: 30)

# Performance tuning
MONITORING_BATCH_SIZE=100
MONITORING_FLUSH_INTERVAL_MS=5000
```

## Integration

### Into /api/execute

```typescript
import { monitoringBus } from '@/lib/monitoring/execution-hooks';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Initialize monitoring
    const executionId = await monitoringBus.initializeExecution({
      agentId: body.agent_id,
      orgId: body.org_id,
      userId: body.user_id,
      metadata: { endpoint: '/api/execute' },
    });

    // Execute (existing code)
    const decision = await executeSpine(body);

    // Record token usage
    await monitoringBus.onTokenUsage({
      modelName: decision.model,
      inputTokens: decision.inputTokens,
      outputTokens: decision.outputTokens,
      costUsd: decision.cost,
    });

    // Return response (unchanged)
    return NextResponse.json(decision);
  } catch (error) {
    // Record error
    await monitoringBus.onExecutionComplete({
      status: 'failure',
      errorMessage: error.message,
    });
    throw error;
  }
}
```

### Into Approval Gates

```typescript
import { monitoringBus } from '@/lib/monitoring/execution-hooks';

export async function evaluateGate(toolName, policy) {
  // Record tool call
  const toolId = await monitoringBus.onToolCall({
    toolName,
    toolInput: toolData,
    riskLevel: assessRisk(toolName),
  });

  // Evaluate policy (existing code)
  const decision = await evaluatePolicy(policy);

  // Record approval
  if (toolId) {
    await monitoringBus.onToolComplete({
      toolCallId: toolId,
      toolOutput: {},
      approvalStatus: decision.approved ? 'approved' : 'rejected',
    });
  }

  return decision;
}
```

## Fail-Safe Behavior

**If monitoring is disabled:**
- Zero overhead (no database calls)
- Execution continues normally
- No user-visible changes

**If monitoring fails:**
- Errors are logged but not thrown
- Execution continues normally
- Main flow unaffected

**If database is down:**
- Monitoring records fail silently
- Execution continues normally
- No cascading failures

## Testing

### Unit Tests
```bash
npm run test:unit -- tests/unit/monitoring
```

### Integration Tests
```bash
npm run test:integration -- tests/integration/monitoring
```

## Performance

**Per-execution overhead:**
- Monitoring setup: < 0.1ms
- Event emission: < 0.1ms (async)
- Database insert: ~5-10ms (async, non-blocking)
- **Total impact on main flow: < 1ms**

## Compliance & Security

### Data Isolation (RLS)
- Users can only see executions from their organization
- Users can see their own execution details

### Data Retention
- Default: 30 days
- Configurable via `MONITORING_RETENTION_DAYS`
- Older data archived or deleted per policy

### Sensitive Data
- Tool inputs/outputs sanitized automatically
- Credentials not captured
- PII masked when detected

## Roadmap

**Phase 1 (Complete):** Foundation
- [x] Database schema
- [x] Event capture services
- [x] Non-breaking integration
- [x] Tests

**Phase 2 (Next):** Dashboard & Metrics
- [ ] API routes for monitoring data
- [ ] React components
- [ ] Charts & analytics

**Phase 3 (Future):** Real-time
- [ ] WebSocket streaming
- [ ] Real-time dashboard updates
- [ ] Alert system

## Troubleshooting

### No monitoring data appearing?

1. Check `MONITORING_ENABLED=true` environment variable
2. Verify migration applied: `supabase migration list`
3. Check Supabase logs for errors
4. Review application logs for warnings

### Database migration failed?

```bash
# Check migration status
supabase migration list

# Apply manually
supabase migration up

# Or reset (dev only)
supabase db reset
```

### Performance issues?

1. Check database indices exist
2. Monitor query performance
3. Consider archiving old data
4. Adjust `MONITORING_BATCH_SIZE`

## References

- [Design Document](../../../docs/monitoring-design.md)
- [Integration Strategy](../../../docs/integration-strategy.md)
- [User Workflow](../../../docs/user-workflow.md)
