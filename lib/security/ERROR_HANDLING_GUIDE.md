# Error Handling and Logging Guide

This guide outlines the standards for comprehensive error handling and structured logging across all handlers and API routes.

## Core Principles

1. **Never expose sensitive data** - Log all errors but redact sensitive values (tokens, keys, emails)
2. **Log all operations** - Every API call, database operation, and error should be logged
3. **Structured logging** - Use the `StructuredLogger` class for consistent JSON output
4. **Proper HTTP status codes** - Return semantically correct status codes
5. **Request tracing** - Include request IDs in all logs and responses
6. **Performance metrics** - Track operation durations
7. **Security events** - Log auth failures, rate limits, and permission denials

## Basic Setup

### In API Routes

```typescript
import { NextResponse } from 'next/server';
import { createLogger, generateRequestId, extractRequestContext } from '@/lib/security/structured-logger';
import { TimingTracker } from '@/lib/security/api-middleware';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestId = generateRequestId();
  const timing = new TimingTracker();
  const baseContext = extractRequestContext(request);
  const logger = createLogger({
    requestId,
    endpoint: '/api/your-route',
    ...baseContext,
  });

  try {
    // Your operation here
    logger.info('Operation completed successfully', { /* metadata */ });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Operation failed', error, { /* context */ });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}
```

## Logger Methods

### Basic Logging

```typescript
// Debug level (for detailed tracing)
logger.debug('Detailed operation info', { key: 'value' });

// Info level (for successful operations)
logger.info('Operation completed', { duration: 100 });

// Warning level (for potentially problematic situations)
logger.warn('Retry attempt', { attempt: 1 });

// Error level (for failures)
logger.error('Operation failed', error, { context: 'details' });
```

### Specialized Logging

```typescript
// API requests
logger.logApiRequest('POST', '/api/endpoint', 200, 150); // status, duration in ms

// Security events
logger.logSecurityEvent('Unauthorized access attempt', 'warn', { userId: '123' });

// Database operations
logger.logDatabaseOperation('INSERT', 'users_table', 50, true); // operation, table, duration, success

// Stripe webhooks
logger.logStripeWebhook('evt_123', 'charge.succeeded', true); // eventId, type, success

// Update context for subsequent logs
logger.withContext({ userId: '123', orgId: 'org_456' });
```

## Error Handling Patterns

### Database Errors

```typescript
import { withDatabaseErrorHandling, handleDatabaseError } from '@/lib/database/error-handler';

export async function POST(request: Request) {
  const logger = createLogger({ endpoint: '/api/data' });

  try {
    const result = await withDatabaseErrorHandling(
      async () => {
        return await supabase.from('users').insert({ name: 'John' });
      },
      {
        name: 'insert_user',
        retryable: true,
        maxAttempts: 3,
        requestId,
      }
    );

    logger.info('User created successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    const { statusCode, body } = handleDatabaseError(error, {
      operation: 'insert_user',
      table: 'users',
      requestId,
      orgId,
    });

    return NextResponse.json(body, { status: statusCode });
  }
}
```

### Stripe Errors

```typescript
import { withStripeErrorHandling, handleStripeError } from '@/lib/billing/stripe-error-handler';

export async function POST(request: Request) {
  const logger = createLogger({ endpoint: '/api/billing' });

  try {
    const charge = await withStripeErrorHandling(
      'create_charge',
      async () => {
        return await stripe.charges.create({
          amount: 1000,
          currency: 'usd',
          source: 'tok_visa',
        });
      },
      { requestId, orgId }
    );

    logger.info('Charge created', { chargeId: charge.id });
    return NextResponse.json({ chargeId: charge.id });
  } catch (error) {
    const { statusCode, body } = handleStripeError(error, {
      requestId,
      orgId,
    });

    return NextResponse.json(body, { status: statusCode });
  }
}
```

### Input Validation

```typescript
import { validateInput } from '@/lib/security/api-middleware';

export async function POST(request: Request) {
  const logger = createLogger({ endpoint: '/api/users' });
  const body = await request.json();

  const { valid, errors } = validateInput(logger, body, {
    name: { required: true, type: 'string' },
    email: { required: true, type: 'string' },
    age: { required: false, type: 'number' },
  });

  if (!valid) {
    return NextResponse.json(
      { error: 'Validation failed', details: errors },
      { status: 400 }
    );
  }

  // Proceed with operation
}
```

## Response Headers

Always include these headers in API responses:

```typescript
return NextResponse.json(data, {
  status: 200,
  headers: {
    'X-Request-ID': requestId,           // For request tracing
    'X-Response-Time': `${duration}ms`,  // For performance monitoring
    'Content-Type': 'application/json',
  },
});
```

## Security Event Logging

### Authentication Failures

```typescript
if (!apiKey) {
  logger.logSecurityEvent('Missing API key', 'warn', {
    ip: request.headers.get('x-forwarded-for'),
  });
}
```

### Rate Limit Violations

```typescript
if (!rateLimit.allowed) {
  logger.logSecurityEvent('Rate limit exceeded', 'warn', {
    key: getRateLimitKey(request),
    remaining: rateLimit.remaining,
  });
}
```

### Permission Denials

```typescript
if (!user.isAdmin) {
  logger.logSecurityEvent('Unauthorized access attempt', 'error', {
    userId: user.id,
    resource: 'admin_panel',
  });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

## Database Operation Logging

```typescript
import { withDatabaseLogging } from '@/lib/security/api-middleware';

export async function POST(request: Request) {
  const logger = createLogger({ endpoint: '/api/data' });

  const user = await withDatabaseLogging(
    logger,
    'INSERT',
    'users',
    async () => {
      return await supabase.from('users').insert(userData).select().single();
    }
  );

  // Logger automatically logs: operation, table, duration, success
}
```

## Performance Metrics

Use `TimingTracker` for performance monitoring:

```typescript
const timing = new TimingTracker();

timing.mark('database-start');
const result = await database.query();
const dbDuration = timing.durationSince('database-start');

timing.mark('cache-start');
await cache.set(key, result);
const cacheDuration = timing.durationSince('cache-start');

logger.info('Operation completed', {
  databaseDuration: dbDuration,
  cacheDuration: cacheDuration,
  totalDuration: timing.duration(),
});
```

## Error Response Format

### For 4xx Errors (Client Errors)

```json
{
  "error": {
    "message": "User not found",
    "type": "not_found",
    "retryable": false
  }
}
```

### For 5xx Errors (Server Errors)

```json
{
  "error": "Internal server error"
}
```

Never expose stack traces or sensitive details in 5xx responses. Log the full error server-side.

## Sensitive Data Redaction

The logger automatically redacts:
- `authorization`, `cookie`, `token`, `secret`, `password`
- `api_key`, `apikey`, `api-key`
- `session`, `bearer`, `jwt`

Pattern: `/authorization|cookie|token|secret|password|api[-_]?key|session|auth|bearer|jwt|apikey/i`

If you need to redact additional fields:

```typescript
logger.info('Operation', {
  customSecret: '[REDACTED]',
  publicData: 'visible',
});
```

## Webhook Event Logging

For Stripe webhooks and similar:

```typescript
logger.logStripeWebhook(
  event.id,           // 'evt_123abc...'
  event.type,         // 'charge.succeeded'
  true                // success flag
);
```

## Common Errors and Handling

### Connection Errors (5xx Retryable)

```typescript
if (error.code === 'ECONNREFUSED' || error.message.includes('connection')) {
  return NextResponse.json(
    { error: 'Service temporarily unavailable' },
    { status: 503, headers: { 'Retry-After': '60' } }
  );
}
```

### Validation Errors (4xx Non-Retryable)

```typescript
if (error instanceof ValidationError) {
  return NextResponse.json(
    { error: error.message },
    { status: 400 }
  );
}
```

### Authentication Errors (4xx Non-Retryable)

```typescript
if (!authorized) {
  return NextResponse.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}
```

### Permission Errors (4xx Non-Retryable)

```typescript
if (!hasPermission) {
  return NextResponse.json(
    { error: 'Forbidden' },
    { status: 403 }
  );
}
```

## Testing Error Handling

```typescript
// Mock logger in tests
const mockLogger = {
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  logSecurityEvent: jest.fn(),
};

// Test error path
try {
  // Operation that fails
} catch (error) {
  expect(mockLogger.error).toHaveBeenCalledWith(
    expect.stringContaining('failed'),
    expect.any(Error)
  );
}
```

## Monitoring and Alerting

Structured logs should be sent to:
- **Development**: Console (local development)
- **Staging/Production**: Cloud logging service (Sentry, DataDog, CloudWatch, etc.)

Set up alerts for:
- Error rate > 1% of requests
- Response time > 5 seconds (for normal endpoints)
- Rate limit violations (>10 per minute)
- Database connection errors (any occurrence)
- Stripe API errors (any occurrence)
- Security events (any occurrence)

## Migration Checklist

When converting an existing route to this pattern:

- [ ] Add request ID generation
- [ ] Create logger instance with context
- [ ] Wrap operations in try-catch
- [ ] Add input validation
- [ ] Log all key decision points
- [ ] Log all errors with context
- [ ] Return proper HTTP status codes
- [ ] Include request ID in response headers
- [ ] Add performance timing (optional but recommended)
- [ ] Update error response format
- [ ] Test error paths
- [ ] Document any custom logging

## Examples

See these files for comprehensive examples:
- `/app/api/stripe/webhook/route.ts` - Webhook error handling
- `/app/api/spine/execute/route.ts` - Complex operation with timing
- `/lib/security/structured-logger.ts` - Core logger implementation
- `/lib/database/error-handler.ts` - Database error handling
- `/lib/billing/stripe-error-handler.ts` - Stripe error handling
