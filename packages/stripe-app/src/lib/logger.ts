/**
 * Logger utility for Stripe App
 *
 * Provides structured logging with request tracking, security event logging,
 * and performance metrics.
 */

export interface LoggerConfig {
  requestId: string;
  endpoint: string;
  userId?: string;
  stripeAccountId?: string;
}

export class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  private log(level: string, message: string, data?: Record<string, unknown>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      requestId: this.config.requestId,
      endpoint: this.config.endpoint,
      ...this.config,
      ...data,
    };
    console.log(JSON.stringify(logEntry));
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log('warn', message, data);
  }

  error(message: string, err?: unknown, data?: Record<string, unknown>) {
    const errorData = {
      ...data,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    };
    this.log('error', message, errorData);
  }

  debug(message: string, data?: Record<string, unknown>) {
    if (process.env.DEBUG) {
      this.log('debug', message, data);
    }
  }

  logApiRequest(method: string, path: string, data?: Record<string, unknown>) {
    this.info(`${method} ${path}`, {
      ...data,
      method,
      path,
    });
  }

  logWebhookEvent(eventType: string, eventId: string) {
    this.info('Webhook event received', {
      eventType,
      eventId,
    });
  }

  logWebhookProcessing(eventId: string, eventType: string, status: string, latencyMs: number) {
    this.info('Webhook processed', {
      eventId,
      eventType,
      status,
      latencyMs,
    });
  }

  logSignatureVerificationFailure(data: Record<string, unknown>) {
    this.logSecurityEvent('Webhook signature verification failed', 'high', data);
  }

  logSecurityEvent(message: string, severity: 'low' | 'medium' | 'high', data?: Record<string, unknown>) {
    this.log('security', message, {
      severity,
      ...data,
    });
  }
}

export function createLogger(config: LoggerConfig): Logger {
  return new Logger(config);
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
