import * as Sentry from '@sentry/nextjs';
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

export function isMissingEnvConfigError(error: unknown, envVarNames: string[]) {
  if (!(error instanceof Error)) return false;
  return envVarNames.some((name) => error.message.includes(name));
}

export function logApiError(route: string, error: unknown, details?: Record<string, unknown>, status = 500) {
  const payload = {
    error: redactSensitive(error),
    ...(details ? redactSensitive(details) as Record<string, unknown> : {}),
  };

  // 4xx is an expected client condition (not logged in, bad input, not
  // found, etc.) — it is not a server incident. Logging every one of these
  // as an "error" is what produced large, misleading error-log counts (e.g.
  // /api/cases showing 100+ "errors" that were really just anonymous
  // visitors hitting an auth-gated endpoint). Only 5xx is a real failure.
  if (status >= 500) {
    console.error(`[${route}]`, payload);
    if (error instanceof Error) {
      Sentry.captureException(error, { tags: { route }, extra: details });
    }
  } else {
    console.warn(`[${route}]`, payload);
  }
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
  // If the caller didn't specify a status, infer it from a known error
  // shape (e.g. OrgAuthError carries its own `.status`) instead of always
  // defaulting to 500 — returning 500 for what is really a 401 both hides
  // the true condition from the client and miscounts it as a server error.
  const inferredStatus =
    error && typeof error === 'object' && 'status' in error && typeof (error as { status?: unknown }).status === 'number'
      ? (error as { status: number }).status
      : 500;
  const status = options?.status ?? inferredStatus;
  logApiError(route, error, options?.details, status);
  return NextResponse.json(toSafeErrorResponse(status), {
    status,
    headers: options?.headers,
  });
}
