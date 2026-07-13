import * as Sentry from '@sentry/nextjs';
import { PostHog } from 'posthog-node';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';

export interface LogContext {
  requestId?: string;
  agentId?: string;
  userId?: string;
  sessionId?: string;
  frameId?: string;
  traceId?: string;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  metadata?: Record<string, unknown>;
  error?: Error;
  timestamp: string;
}

/**
 * Redacts sensitive fields from logs.
 * Masks values for: authorization, cookie, token, secret, password, api-key, session, email.
 */
function redactSensitive(obj: unknown): unknown {
  if (obj == null) return obj;

  if (obj instanceof Error) {
    return {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
  }

  if (typeof obj === 'string') {
    if (obj.length <= 6) return '[REDACTED]';
    return `${obj.slice(0, 2)}***${obj.slice(-2)}`;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitive(item));
  }

  if (typeof obj === 'object') {
    const SENSITIVE_PATTERN = /(authorization|cookie|token|secret|password|api[-_]?key|session|email)/i;
    return Object.entries(obj as Record<string, unknown>).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        acc[key] = SENSITIVE_PATTERN.test(key) ? '[REDACTED]' : redactSensitive(value);
        return acc;
      },
      {}
    );
  }

  return obj;
}

/**
 * Centralized structured logger for DSG Control Plane.
 *
 * Logs to:
 * - console (all levels)
 * - Sentry (ERROR, CRITICAL)
 * - PostHog (analytics events)
 * - Audit trail (structured JSON, can be persisted to DB)
 */
export class DSGLogger {
  private posthog?: PostHog;
  private minLevel: LogLevel;

  constructor(minLevel: LogLevel = 'INFO') {
    this.minLevel = minLevel;
    if (process.env.POSTHOG_API_KEY && !process.env.POSTHOG_API_KEY.includes('placeholder')) {
      this.posthog = new PostHog(process.env.POSTHOG_API_KEY);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 };
    return levels[level] >= levels[this.minLevel];
  }

  private buildLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      context,
      metadata: metadata ? (redactSensitive(metadata) as Record<string, unknown>) : undefined,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  private writeToConsole(entry: LogEntry): void {
    const prefix = `[${entry.level}] [${entry.timestamp}]`;
    const contextStr = entry.context?.requestId ? ` [${entry.context.requestId}]` : '';

    const logFn = {
      DEBUG: console.debug,
      INFO: console.info,
      WARN: console.warn,
      ERROR: console.error,
      CRITICAL: console.error,
    }[entry.level];

    logFn(`${prefix}${contextStr} ${entry.message}`, {
      context: entry.context,
      metadata: entry.metadata,
    });
  }

  private sendToSentry(entry: LogEntry): void {
    if (entry.level !== 'ERROR' && entry.level !== 'CRITICAL') return;

    if (entry.error) {
      Sentry.captureException(entry.error, {
        level: entry.level === 'CRITICAL' ? 'fatal' : 'error',
        tags: {
          level: entry.level,
          agentId: entry.context?.agentId as string | undefined,
        },
        contexts: {
          log: entry.context,
        },
        extra: entry.metadata,
      });
    } else {
      Sentry.captureMessage(entry.message, {
        level: entry.level === 'CRITICAL' ? 'fatal' : 'error',
        tags: {
          level: entry.level,
          agentId: entry.context?.agentId as string | undefined,
        },
        contexts: {
          log: entry.context,
        },
      });
    }
  }

  private sendToPostHog(entry: LogEntry): void {
    if (!this.posthog) return;

    try {
      this.posthog.capture({
        distinctId: entry.context?.agentId || entry.context?.userId || 'unknown',
        event: `dsg_log_${entry.level.toLowerCase()}`,
        properties: {
          message: entry.message,
          level: entry.level,
          context: entry.context,
          metadata: entry.metadata,
          timestamp: entry.timestamp,
        },
      });
    } catch (err) {
      console.warn('[Logger] Failed to send to PostHog:', err);
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('DEBUG')) return;
    const entry = this.buildLogEntry('DEBUG', message, context, metadata);
    this.writeToConsole(entry);
  }

  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('INFO')) return;
    const entry = this.buildLogEntry('INFO', message, context, metadata);
    this.writeToConsole(entry);
    this.sendToPostHog(entry);
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('WARN')) return;
    const entry = this.buildLogEntry('WARN', message, context, metadata);
    this.writeToConsole(entry);
    this.sendToPostHog(entry);
  }

  error(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog('ERROR')) return;
    const err = error instanceof Error ? error : undefined;
    const entry = this.buildLogEntry('ERROR', message, context, metadata, err);
    this.writeToConsole(entry);
    this.sendToSentry(entry);
    this.sendToPostHog(entry);
  }

  critical(
    message: string,
    error?: Error | unknown,
    context?: LogContext,
    metadata?: Record<string, unknown>
  ): void {
    if (!this.shouldLog('CRITICAL')) return;
    const err = error instanceof Error ? error : undefined;
    const entry = this.buildLogEntry('CRITICAL', message, context, metadata, err);
    this.writeToConsole(entry);
    this.sendToSentry(entry);
    this.sendToPostHog(entry);
  }

  /**
   * Create a child logger with pre-filled context.
   */
  withContext(baseContext: LogContext): DSGLogger {
    const parent = this;
    return {
      debug: (msg, ctx, meta) => parent.debug(msg, { ...baseContext, ...ctx }, meta),
      info: (msg, ctx, meta) => parent.info(msg, { ...baseContext, ...ctx }, meta),
      warn: (msg, ctx, meta) => parent.warn(msg, { ...baseContext, ...ctx }, meta),
      error: (msg, err, ctx, meta) => parent.error(msg, err, { ...baseContext, ...ctx }, meta),
      critical: (msg, err, ctx, meta) => parent.critical(msg, err, { ...baseContext, ...ctx }, meta),
      withContext: (ctx) => parent.withContext({ ...baseContext, ...ctx }),
      flush: () => parent.flush(),
    } as DSGLogger;
  }

  /**
   * Flush any pending logs (e.g., PostHog queue).
   */
  async flush(): Promise<void> {
    if (this.posthog) {
      await this.posthog.shutdown();
    }
  }
}

/**
 * Global logger instance.
 */
export const logger = new DSGLogger(
  (process.env.LOG_LEVEL as LogLevel) || 'INFO'
);

/**
 * Create a named logger for a specific module.
 */
export function createLogger(moduleName: string): DSGLogger {
  return logger.withContext({ module: moduleName });
}
