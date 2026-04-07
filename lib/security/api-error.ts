import { NextResponse } from 'next/server';

const INTERNAL_SERVER_ERROR = 'Internal server error';
const SENSITIVE_KEY_PATTERN = /(authorization|cookie|token|secret|password|api[-_]?key|session|email)/i;

function maskValue(value: string) {
  if (value.length <= 6) return '[REDACTED]';
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

function redactSensitive(value: unknown): unknown {
  if (value == null) return value;

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      ...(value as Error & { code?: string }).code ? { code: (value as Error & { code?: string }).code } : {},
    };
  }

  if (typeof value === 'string') {
    return maskValue(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactSensitive(entry));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, entry]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        acc[key] = '[REDACTED]';
        return acc;
      }

      acc[key] = redactSensitive(entry);
      return acc;
    }, {});
  }

  return value;
}

export function internalErrorMessage() {
  return INTERNAL_SERVER_ERROR;
}

export function toSafeErrorResponse(status = 500) {
  if (status >= 500) {
    return { error: INTERNAL_SERVER_ERROR };
  }

  return { error: 'Request failed' };
}

export function logApiError(route: string, error: unknown, details?: Record<string, unknown>) {
  console.error(`[${route}]`, {
    error: redactSensitive(error),
    ...(details ? redactSensitive(details) as Record<string, unknown> : {}),
  });
}

export function handleApiError(
  route: string,
  error: unknown,
  options?: {
    details?: Record<string, unknown>;
    status?: number;
    headers?: HeadersInit;
  },
) {
  const status = options?.status ?? 500;
  logApiError(route, error, options?.details);
  return NextResponse.json(toSafeErrorResponse(status), {
    status,
    headers: options?.headers,
  });
}
