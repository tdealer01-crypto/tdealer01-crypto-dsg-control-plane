import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureExceptionMock = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureException: captureExceptionMock,
}));

describe('internalErrorMessage', () => {
  it('returns the internal server error string', async () => {
    const { internalErrorMessage } = await import('../../../lib/security/api-error');
    expect(internalErrorMessage()).toBe('Internal server error');
  });
});

describe('toSafeErrorResponse', () => {
  beforeEach(async () => {
    vi.resetModules();
  });

  it('returns internal server error body for 5xx status', async () => {
    const { toSafeErrorResponse } = await import('../../../lib/security/api-error');
    expect(toSafeErrorResponse(500)).toEqual({ error: 'Internal server error' });
    expect(toSafeErrorResponse(503)).toEqual({ error: 'Internal server error' });
  });

  it('returns request failed body for 4xx status', async () => {
    const { toSafeErrorResponse } = await import('../../../lib/security/api-error');
    expect(toSafeErrorResponse(400)).toEqual({ error: 'Request failed' });
    expect(toSafeErrorResponse(403)).toEqual({ error: 'Request failed' });
  });

  it('defaults to internal server error when no status is provided', async () => {
    const { toSafeErrorResponse } = await import('../../../lib/security/api-error');
    expect(toSafeErrorResponse()).toEqual({ error: 'Internal server error' });
  });
});

describe('logApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Sentry.captureException when error is an Error instance', async () => {
    const { logApiError } = await import('../../../lib/security/api-error');
    const err = new Error('boom');
    logApiError('/api/test', err);

    expect(captureExceptionMock).toHaveBeenCalledWith(err, expect.objectContaining({ tags: { route: '/api/test' } }));
  });

  it('does not call Sentry.captureException for non-Error values', async () => {
    const { logApiError } = await import('../../../lib/security/api-error');
    logApiError('/api/test', 'plain string error');

    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('redacts sensitive keys in details before logging', async () => {
    const { logApiError } = await import('../../../lib/security/api-error');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logApiError('/api/test', new Error('e'), {
      authorization: 'Bearer secret-token',
      requestPath: '/api/execute/action',
    });

    const loggedArg = consoleSpy.mock.calls[0]?.[1] as Record<string, unknown>;
    const details = loggedArg as { authorization?: string; requestPath?: string };
    expect(details.authorization).toBe('[REDACTED]');
    // Non-sensitive key with value >6 chars is not redacted at the key level
    expect(details.requestPath).not.toBe('[REDACTED]');

    consoleSpy.mockRestore();
  });
});

describe('handleApiError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a 500 response by default', async () => {
    const { handleApiError } = await import('../../../lib/security/api-error');
    const res = handleApiError('/api/test', new Error('oops'));

    expect(res.status).toBe(500);
  });

  it('returns the provided status code', async () => {
    const { handleApiError } = await import('../../../lib/security/api-error');
    const res = handleApiError('/api/test', new Error('not found'), { status: 404 });

    expect(res.status).toBe(404);
  });

  it('response body contains safe error message for 5xx', async () => {
    const { handleApiError } = await import('../../../lib/security/api-error');
    const res = handleApiError('/api/test', new Error('secret db details'), { status: 500 });
    const body = await res.json();

    expect(body.error).toBe('Internal server error');
    expect(JSON.stringify(body)).not.toContain('secret db details');
  });

  it('response body contains request failed for 4xx', async () => {
    const { handleApiError } = await import('../../../lib/security/api-error');
    const res = handleApiError('/api/test', 'bad input', { status: 400 });
    const body = await res.json();

    expect(body.error).toBe('Request failed');
  });

  it('sets response headers when provided', async () => {
    const { handleApiError } = await import('../../../lib/security/api-error');
    const res = handleApiError('/api/test', new Error('e'), {
      headers: { 'Cache-Control': 'no-store' },
    });

    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });
});
