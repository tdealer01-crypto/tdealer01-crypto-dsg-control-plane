/**
 * Correlation Context Management
 *
 * Provides AsyncLocalStorage for distributed tracing via correlation_id.
 * Enables request tracing across async boundaries (middleware → API → DB → audit logs).
 */

import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

export interface CorrelationContext {
  correlationId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  orgId?: string;
  email?: string;
  idempotencyKey?: string;
}

// Global AsyncLocalStorage for correlation context
const correlationStorage = new AsyncLocalStorage<CorrelationContext>();

/**
 * Initialize correlation context for a request
 * @param overrides Partial context to override defaults
 */
export function initCorrelationContext(overrides: Partial<CorrelationContext> = {}) {
  const context: CorrelationContext = {
    correlationId: overrides.correlationId || randomUUID(),
    traceId: overrides.traceId,
    spanId: overrides.spanId,
    userId: overrides.userId,
    orgId: overrides.orgId,
    email: overrides.email,
    idempotencyKey: overrides.idempotencyKey,
  };

  return correlationStorage.run(context, () => {
    return context.correlationId;
  });
}

/**
 * Run a function within a correlation context
 * @param context Correlation context
 * @param fn Function to run
 */
export function runWithCorrelationContext<T>(
  context: CorrelationContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return correlationStorage.run(context, fn);
}

/**
 * Get the current correlation context
 * @returns Current correlation context or undefined if not in a context
 */
export function getCorrelationContext(): CorrelationContext | undefined {
  return correlationStorage.getStore();
}

/**
 * Get the current correlation ID
 * @returns Current correlation ID or a new one if not in a context
 */
export function getCorrelationId(): string {
  return correlationStorage.getStore()?.correlationId || randomUUID();
}

/**
 * Update correlation context (e.g., after auth)
 * @param updates Partial updates to the current context
 */
export function updateCorrelationContext(updates: Partial<CorrelationContext>) {
  const current = correlationStorage.getStore();
  if (current) {
    Object.assign(current, updates);
  }
}

/**
 * Extract correlation headers from a request
 * @param headers Request headers
 * @returns Partial correlation context from headers
 */
export function extractCorrelationHeaders(headers: Record<string, string | string[]>): Partial<CorrelationContext> {
  const headerValue = (key: string) => {
    const val = headers[key.toLowerCase()];
    return Array.isArray(val) ? val[0] : val;
  };

  return {
    correlationId: headerValue('x-correlation-id') || headerValue('x-request-id'),
    traceId: headerValue('traceparent')?.split('-')[1],
    spanId: headerValue('traceparent')?.split('-')[2],
    userId: headerValue('x-user-id'),
    orgId: headerValue('x-org-id'),
    email: headerValue('x-user-email'),
    idempotencyKey: headerValue('idempotency-key'),
  };
}

/**
 * Build correlation headers for outbound requests (W3C Trace Context)
 * @returns Headers object with correlation/trace info
 */
export function buildCorrelationHeaders(): Record<string, string> {
  const ctx = getCorrelationContext();
  if (!ctx) return {};

  const headers: Record<string, string> = {
    'x-correlation-id': ctx.correlationId,
  };

  if (ctx.userId) {
    headers['x-user-id'] = ctx.userId;
  }

  if (ctx.orgId) {
    headers['x-org-id'] = ctx.orgId;
  }

  if (ctx.email) {
    headers['x-user-email'] = ctx.email;
  }

  if (ctx.traceId && ctx.spanId) {
    // W3C Trace Context format: traceparent: 00-<trace-id>-<span-id>-<trace-flags>
    headers['traceparent'] = `00-${ctx.traceId}-${ctx.spanId}-01`;
  }

  return headers;
}
