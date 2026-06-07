import { randomUUID } from 'crypto';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogContext = {
  requestId?: string;
  userId?: string;
  orgId?: string;
  agentId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  userAgent?: string;
  ipAddress?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type LogEntry = {
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, unknown>;
};

/**
 * Generate a unique request ID for tracing
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract request context from Request object
 */
export function extractRequestContext(request: Request): Partial<LogContext> {
  return {
    method: request.method,
    endpoint: new URL(request.url).pathname,
    userAgent: request.headers.get('user-agent') ?? undefined,
    ipAddress: request.headers.get('x-forwarded-for') ??
               request.headers.get('cf-connecting-ip') ??
               undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Redact sensitive values from log context
 */
function redactSensitiveValue(value: unknown): unknown {
  if (value == null) return value;

  if (typeof value === 'string') {
    if (value.length <= 6) return '[REDACTED]';
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  if (Array.isArray(value)) {
    return value.map(v => redactSensitiveValue(v));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .reduce<Record<string, unknown>>((acc, [key, val]) => {
        const sensitivePattern = /(authorization|cookie|token|secret|password|api[-_]?key|session|auth|bearer|jwt|apikey)/i;
        if (sensitivePattern.test(key)) {
          acc[key] = '[REDACTED]';
        } else {
          acc[key] = redactSensitiveValue(val);
        }
        return acc;
      }, {});
  }

  return value;
}

/**
 * Format error for logging
 */
function formatErrorForLogging(error: unknown) {
  if (!(error instanceof Error)) {
    return { name: 'UnknownError', message: String(error) };
  }

  return {
    name: error.name || 'Error',
    message: error.message,
    stack: error.stack,
    code: (error as Error & { code?: string }).code,
  };
}

/**
 * Core logger class with structured logging support
 */
export class StructuredLogger {
  private context: LogContext;

  constructor(initialContext: LogContext = {}) {
    this.context = {
      timestamp: new Date().toISOString(),
      requestId: initialContext.requestId || generateRequestId(),
      ...initialContext,
    };
  }

  /**
   * Add or update context values
   */
  withContext(updates: Partial<LogContext>): this {
    this.context = { ...this.context, ...updates };
    return this;
  }

  /**
   * Get current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  /**
   * Log at debug level
   */
  debug(message: string, metadata?: Record<string, unknown>) {
    this.log('debug', message, metadata);
  }

  /**
   * Log at info level
   */
  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata);
  }

  /**
   * Log at warn level
   */
  warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, metadata);
  }

  /**
   * Log at error level
   */
  error(message: string, error?: unknown, metadata?: Record<string, unknown>) {
    const logEntry: LogEntry = {
      level: 'error',
      message,
      context: redactSensitiveValue(this.context) as LogContext,
      ...(error && { error: formatErrorForLogging(error) }),
      ...(metadata && { metadata: redactSensitiveValue(metadata) as Record<string, unknown> }),
    };

    this.outputLog(logEntry);
  }

  /**
   * Log API request
   */
  logApiRequest(method: string, endpoint: string, statusCode: number, duration: number) {
    this.info('API request', {
      method,
      endpoint,
      statusCode,
      duration,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(event: string, severity: 'info' | 'warn' | 'error', details?: Record<string, unknown>) {
    const level = severity === 'info' ? 'info' : severity === 'warn' ? 'warn' : 'error';
    this.log(level, `Security: ${event}`, details);
  }

  /**
   * Log database operation
   */
  logDatabaseOperation(operation: string, table: string, duration: number, success: boolean) {
    this.info('Database operation', {
      operation,
      table,
      duration,
      success,
    });
  }

  /**
   * Log Stripe webhook
   */
  logStripeWebhook(eventId: string, eventType: string, success: boolean) {
    this.info('Stripe webhook', {
      eventId,
      eventType,
      success,
    });
  }

  /**
   * Private log method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    const logEntry: LogEntry = {
      level,
      message,
      context: redactSensitiveValue(this.context) as LogContext,
      ...(metadata && { metadata: redactSensitiveValue(metadata) as Record<string, unknown> }),
    };

    this.outputLog(logEntry);
  }

  /**
   * Output log entry
   */
  private outputLog(entry: LogEntry) {
    const output = {
      level: entry.level,
      message: entry.message,
      context: entry.context,
      ...(entry.error && { error: entry.error }),
      ...(entry.metadata && { metadata: entry.metadata }),
    };

    if (entry.level === 'error') {
      console.error(JSON.stringify(output));
    } else if (entry.level === 'warn') {
      console.warn(JSON.stringify(output));
    } else if (entry.level === 'info') {
      console.info(JSON.stringify(output));
    } else {
      console.debug(JSON.stringify(output));
    }
  }
}

/**
 * Create a logger instance for a specific operation
 */
export function createLogger(context?: LogContext): StructuredLogger {
  return new StructuredLogger(context);
}

/**
 * Global logger instance (singleton)
 */
let globalLogger: StructuredLogger | null = null;

export function getGlobalLogger(): StructuredLogger {
  if (!globalLogger) {
    globalLogger = new StructuredLogger();
  }
  return globalLogger;
}

export function setGlobalLoggerContext(context: Partial<LogContext>) {
  getGlobalLogger().withContext(context);
}
