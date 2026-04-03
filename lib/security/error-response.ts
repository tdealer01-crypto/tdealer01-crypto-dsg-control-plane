import { NextResponse } from 'next/server';

type ErrorResponseOptions = {
  status?: number;
  message?: string;
  headers?: HeadersInit;
  logLabel?: string;
};

export function logServerError(error: unknown, label = 'server-error') {
  console.error(`[${label}]`, error);
}

export function serverErrorResponse(options: ErrorResponseOptions = {}) {
  const {
    status = 500,
    message = 'Internal server error',
    headers,
  } = options;

  return NextResponse.json({ error: message }, { status, headers });
}
