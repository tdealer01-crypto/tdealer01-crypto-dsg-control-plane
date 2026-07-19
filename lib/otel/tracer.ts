/**
 * OpenTelemetry Tracer Setup
 *
 * Initializes OpenTelemetry for distributed tracing with correlation_id propagation.
 */

import { getCorrelationId, getCorrelationContext } from '@/lib/audit/correlation-context';

export interface TraceSpan {
  name: string;
  attributes?: Record<string, string | number | boolean>;
  events?: Array<{ name: string; attributes?: Record<string, string | number | boolean> }>;
}

/**
 * Mock tracer for environments without full OTEL SDK
 * Can be replaced with actual @opentelemetry/sdk-trace-node in production
 */
class SimpleTracer {
  private serviceName: string;
  private isEnabled: boolean;

  constructor(serviceName: string = 'dsg-control-plane') {
    this.serviceName = serviceName;
    this.isEnabled = process.env.OTEL_TRACE_ENABLED !== 'false';
  }

  /**
   * Start a new span
   */
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): SimpleSpan {
    return new SimpleSpan(name, this.serviceName, attributes, this.isEnabled);
  }

  /**
   * Get the current active span
   */
  currentSpan(): SimpleSpan | null {
    return SimpleSpan.current;
  }

  /**
   * Run a function within a span context
   */
  async runInSpan<T>(
    name: string,
    fn: (span: SimpleSpan) => Promise<T> | T,
    attributes?: Record<string, string | number | boolean>,
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    try {
      const result = await fn(span);
      span.setStatus({ code: 'OK' });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 'ERROR', message: String(error) });
      throw error;
    } finally {
      span.end();
    }
  }
}

/**
 * Simple span implementation (mock)
 */
class SimpleSpan {
  static current: SimpleSpan | null = null;

  private name: string;
  private serviceName: string;
  private startTime: number;
  private endTime?: number;
  private attributes: Record<string, string | number | boolean>;
  private events: TraceSpan['events'] = [];
  private isEnabled: boolean;

  constructor(
    name: string,
    serviceName: string,
    attributes?: Record<string, string | number | boolean>,
    isEnabled: boolean = true,
  ) {
    this.name = name;
    this.serviceName = serviceName;
    this.startTime = Date.now();
    this.attributes = {
      'service.name': serviceName,
      'span.name': name,
      'correlation_id': getCorrelationId(),
      ...attributes,
    };
    this.isEnabled = isEnabled;

    const previous = SimpleSpan.current;
    SimpleSpan.current = this;

    if (this.isEnabled) {
      this.log(`[SPAN START] ${name}`, this.attributes);
    }
  }

  /**
   * Add an attribute to the span
   */
  setAttribute(key: string, value: string | number | boolean): void {
    this.attributes[key] = value;
  }

  /**
   * Set multiple attributes
   */
  setAttributes(attrs: Record<string, string | number | boolean>): void {
    Object.assign(this.attributes, attrs);
  }

  /**
   * Record an event
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    this.events?.push({ name, attributes });
  }

  /**
   * Record an exception
   */
  recordException(error: Error): void {
    this.addEvent('exception', {
      'exception.type': error.name,
      'exception.message': error.message,
    });
  }

  /**
   * Set span status
   */
  setStatus(status: { code: 'OK' | 'ERROR'; message?: string }): void {
    this.setAttribute('span.status', status.code);
    if (status.message) {
      this.setAttribute('span.status.message', status.message);
    }
  }

  /**
   * End the span
   */
  end(): void {
    this.endTime = Date.now();
    const duration = this.endTime - this.startTime;

    if (this.isEnabled) {
      this.log(`[SPAN END] ${this.name}`, {
        duration_ms: duration,
        ...this.attributes,
      });
    }

    SimpleSpan.current = null;
  }

  /**
   * Get span as JSON
   */
  toJSON() {
    return {
      name: this.name,
      serviceName: this.serviceName,
      startTime: this.startTime,
      endTime: this.endTime,
      duration_ms: this.endTime ? this.endTime - this.startTime : undefined,
      attributes: this.attributes,
      events: this.events,
    };
  }

  /**
   * Log span information
   */
  private log(prefix: string, data: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development' || process.env.OTEL_LOG_ENABLED === 'true') {
      console.log(prefix, JSON.stringify(data, null, 2));
    }
  }
}

/**
 * Global tracer instance
 */
let globalTracer: SimpleTracer | null = null;

/**
 * Initialize the global tracer
 */
export function initTracer(serviceName?: string): SimpleTracer {
  if (!globalTracer) {
    globalTracer = new SimpleTracer(serviceName);
  }
  return globalTracer;
}

/**
 * Get the global tracer instance
 */
export function getTracer(): SimpleTracer {
  if (!globalTracer) {
    globalTracer = new SimpleTracer();
  }
  return globalTracer;
}

/**
 * Run a function within a trace span
 */
export async function withSpan<T>(
  name: string,
  fn: (span: SimpleSpan) => Promise<T> | T,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> {
  const tracer = getTracer();
  return tracer.runInSpan(name, fn, attributes);
}

/**
 * Create a child span
 */
export function createSpan(
  name: string,
  attributes?: Record<string, string | number | boolean>,
): SimpleSpan {
  const tracer = getTracer();
  return tracer.startSpan(name, attributes);
}

/**
 * Get correlation context for outbound requests
 */
export function getTraceContext(): Record<string, string> {
  const ctx = getCorrelationContext();
  if (!ctx) return {};

  return {
    'x-correlation-id': ctx.correlationId,
    'x-trace-id': ctx.traceId || ctx.correlationId,
  };
}

/**
 * Extract trace context from request headers
 */
export function extractTraceContext(headers: Record<string, string | string[]>): Partial<{
  correlationId: string;
  traceId: string;
}> {
  const headerValue = (key: string) => {
    const val = headers[key.toLowerCase()];
    return Array.isArray(val) ? val[0] : val;
  };

  return {
    correlationId: headerValue('x-correlation-id'),
    traceId: headerValue('x-trace-id'),
  };
}
