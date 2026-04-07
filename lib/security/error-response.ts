import { NextResponse } from 'next/server';
import { logApiError, toSafeErrorResponse } from './api-error';

type ErrorResponseOptions = {
  status?: number;
  message?: string;
  headers?: HeadersInit;
};

export function logServerError(error: unknown, label = 'server-error', details?: Record<string, unknown>) {
  logApiError(label, error, details);
}

export function serverErrorResponse(options: ErrorResponseOptions = {}) {
  const {
    status = 500,
    message,
    headers,
  } = options;

  return NextResponse.json({ error: message ?? toSafeErrorResponse(status).error }, { status, headers });
}
