import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { logSecurityEvent, toSafeErrorInfo } from '../../../lib/security/safe-log';

function asMock(fn: unknown) {
  return fn as MockInstance<(this: unknown, ...args: unknown[]) => unknown>;
}

describe('toSafeErrorInfo', () => {
  it('handles null and undefined as UnknownError', () => {
    expect(toSafeErrorInfo(null)).toEqual({ name: 'UnknownError', message: 'Unknown error' });
    expect(toSafeErrorInfo(undefined)).toEqual({ name: 'UnknownError', message: 'Unknown error' });
  });

  it('handles string and number values as UnknownError', () => {
    expect(toSafeErrorInfo('boom')).toEqual({ name: 'UnknownError', message: 'boom' });
    expect(toSafeErrorInfo(123)).toEqual({ name: 'UnknownError', message: '123' });
  });

  it('extracts Error name and message', () => {
    const error = new TypeError('bad input');
    expect(toSafeErrorInfo(error)).toEqual({ name: 'TypeError', message: 'bad input' });
  });

  it('extracts code from object errors', () => {
    expect(toSafeErrorInfo({ name: 'DbError', message: 'failed', code: 'PGRST205' })).toEqual({
      name: 'DbError',
      message: 'failed',
      code: 'PGRST205',
    });
  });

  it('uses fallbacks for empty fields', () => {
    expect(toSafeErrorInfo({ name: '', message: '   ' })).toEqual({
      name: 'UnknownError',
      message: 'Unknown error',
    });
  });

  it('ignores non-string fields', () => {
    expect(toSafeErrorInfo({ name: 123, message: false, code: 999 })).toEqual({
      name: 'UnknownError',
      message: 'Unknown error',
    });
  });
});

describe('logSecurityEvent', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls console.info for level info', () => {
    logSecurityEvent('info', 'auth_success');
    expect(console.info).toHaveBeenCalledWith({ event: 'auth_success' });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('calls console.warn for level warn', () => {
    logSecurityEvent('warn', 'rate_limit_exceeded');
    expect(console.warn).toHaveBeenCalledWith({ event: 'rate_limit_exceeded' });
    expect(console.info).not.toHaveBeenCalled();
  });

  it('calls console.error for level error', () => {
    logSecurityEvent('error', 'auth_failure');
    expect(console.error).toHaveBeenCalledWith({ event: 'auth_failure' });
    expect(console.info).not.toHaveBeenCalled();
  });

  it('spreads details into the payload when provided', () => {
    logSecurityEvent('info', 'token_verified', { orgId: 'org-1', userId: 'u-1' });
    expect(console.info).toHaveBeenCalledWith({ event: 'token_verified', orgId: 'org-1', userId: 'u-1' });
  });

  it('does not include extra keys when details is undefined', () => {
    logSecurityEvent('warn', 'suspicious_request');
    const call = asMock(console.warn).mock.calls[0][0];
    expect(Object.keys(call as Record<string, unknown>)).toEqual(['event']);
  });
});
