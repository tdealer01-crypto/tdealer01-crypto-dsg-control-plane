import { NextResponse, type NextRequest } from 'next/server';
import {
  StructuredLogger,
  createLogger,
  extractRequestContext,
  generateRequestId,
  type LogContext,
} from './structured-logger';

/**
 * Timing tracker for performance metrics
 */
export class TimingTracker {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Mark a timing point
   */
  mark(name: string) {
    this.marks.set(name, Date.now());
  }

  /**
   * Get duration from start
   */
  duration(): number {
    return Date.now() - this.startTime;
  }

  /**
   * Get duration between marks
   */
  durationSince(mark: string): number {
    const markTime = this.marks.get(mark);
    if (!markTime) return -1;
    return Date.now() - markTime;
  }

  /**
   * Get all timings
   */
  getTimings(): Record<string, number> {
    const result: Record<string, number> = {};
    this.marks.forEach((time, name) => {
      result[name] = Date.now() - time;
    });
    return result;
  }
}

/**
 * Request context tracker
 */
export interface RequestContextData {
  requestId: string;
  logger: StructuredLogger;
  timing: TimingTracker;
  context: LogContext;
}

/**
 * Global request context storage (use with caution in async contexts)
 */
const requestContextMap = new WeakMap<Request, RequestContextData>();

/**
 * Create request context
 */
export function createRequestContext(request: Request): RequestContextData {
  const requestId = generateRequestId();
  const baseContext = extractRequestContext(request);

  const context: LogContext = {
    requestId,
    ...baseContext,
  };

  const logger = createLogger(context);
  const timing = new TimingTracker();

  return { requestId, logger, timing, context };
}

/**
 * Store request context (for Next.js async context)
 */
export function storeRequestContext(request: Request, data: RequestContextData): void {
  requestContextMap.set(request, data);
}

/**
 * Retrieve stored request context
 */
export function getRequestContext(request: Request): RequestContextData | undefined {
  return requestContextMap.get(request);
}

/**
 * Wrapper for API route handlers with comprehensive logging
 */
export function withApiLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  options?: {
    name?: string;
    logRequestBody?: boolean;
    logResponseBody?: boolean;
  }
): T {
  return (async (...args: any[]) => {
    const request = args[0] as Request | NextRequest;
    const context = createRequestContext(request);
    const { logger, timing } = context;

    try {
      timing.mark('handler-start');

      if (options?.logRequestBody && request.method !== 'GET') {
        logger.debug(`Incoming ${request.method} request`, {
          method: request.method,
          endpoint: context.context.endpoint,
        });
      }

      const response = await handler(...args);

      timing.mark('handler-end');
      const duration = timing.durationSince('handler-start');

      logger.logApiRequest(
        request.method,
        context.context.endpoint || 'unknown',
        response.status,
        duration
      );

      return response;
    } catch (error) {
      timing.mark('error');
      const duration = timing.durationSince('handler-start');

      logger.error(
        `Handler error in ${options?.name || 'api-handler'}`,
        error,
        { duration }
      );

      return NextResponse.json(
        { error: 'Internal server error' },
        {
          status: 500,
          headers: { 'X-Request-ID': context.requestId },
        }
      );
    }
  }) as T;
}

/**
 * Input validation helper with logging
 */
export function validateInput(
  logger: StructuredLogger,
  input: Record<string, unknown>,
  schema: Record<string, { required: boolean; type: string }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  Object.entries(schema).forEach(([field, rule]) => {
    const value = input[field];

    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required field: ${field}`);
    }

    if (value !== undefined && value !== null) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type && rule.type !== 'any') {
        errors.push(`Invalid type for ${field}: expected ${rule.type}, got ${actualType}`);
      }
    }
  });

  if (errors.length > 0) {
    logger.warn('Input validation failed', { errors, input });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Database operation wrapper with logging
 */
export async function withDatabaseLogging<T>(
  logger: StructuredLogger,
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  const timing = new TimingTracker();
  timing.mark('db-start');

  try {
    const result = await fn();
    const duration = timing.durationSince('db-start');

    logger.logDatabaseOperation(operation, table, duration, true);
    return result;
  } catch (error) {
    const duration = timing.durationSince('db-start');

    logger.logDatabaseOperation(operation, table, duration, false);
    logger.error(`Database error in ${operation} on ${table}`, error);

    throw error;
  }
}

/**
 * Stripe API call wrapper with logging
 */
export async function withStripeLogging<T>(
  logger: StructuredLogger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const timing = new TimingTracker();
  timing.mark('stripe-start');

  try {
    const result = await fn();
    const duration = timing.durationSince('stripe-start');

    logger.info('Stripe API call', {
      operation,
      duration,
      success: true,
    });

    return result;
  } catch (error) {
    const duration = timing.durationSince('stripe-start');

    logger.error(`Stripe error in ${operation}`, error, { duration });

    throw error;
  }
}

/**
 * Wrap response with proper headers and logging
 */
export function createApiResponse<T extends Record<string, unknown>>(
  data: T,
  options?: {
    status?: number;
    headers?: Record<string, string>;
    requestId?: string;
    logger?: StructuredLogger;
  }
): NextResponse<T> {
  const status = options?.status ?? 200;
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.requestId && { 'X-Request-ID': options.requestId }),
    ...options?.headers,
  };

  if (options?.logger) {
    options.logger.logApiRequest(
      'response',
      `${status}`,
      status,
      0
    );
  }

  return NextResponse.json(data, { status, headers });
}
