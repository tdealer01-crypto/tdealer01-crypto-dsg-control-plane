import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toSafeErrorInfo, logSecurityEvent } from '../../../lib/security/safe-log';

// ─── toSafeErrorInfo ─────────────────────────────────────────────────────────

describe('toSafeErrorInfo', () => {
  it('returns UnknownError when error is null', () => {
    expect(toSafeErrorInfo(null)).toEqual({ name: 'UnknownError', code: null });
  });

  it('returns UnknownError when error is undefined', () => {
    expect(toSafeErrorInfo(undefined)).toEqual({ name: 'UnknownError', code: null });
  });

  it('returns UnknownError when error is a string', () => {
    expect(toSafeErrorInfo('something went wrong')).toEqual({ name: 'UnknownError', code: null });
  });

  it('returns UnknownError when error is a number', () => {
    expect(toSafeErrorInfo(42)).toEqual({ name: 'UnknownError', code: null });
  });

  it('extracts name and code from a typed error object', () => {
    expect(toSafeErrorInfo({ name: 'TypeError', code: 'ERR_INVALID' })).toEqual({
      name: 'TypeError',
      code: 'ERR_INVALID',
    });
  });

  it('falls back to Error when name is missing', () => {
    expect(toSafeErrorInfo({ code: 'ERR_X' })).toEqual({ name: 'Error', code: 'ERR_X' });
  });

  it('falls back to Error when name is empty string', () => {
    expect(toSafeErrorInfo({ name: '', code: 'ERR_X' })).toEqual({ name: 'Error', code: 'ERR_X' });
  });

  it('falls back to Error when name is whitespace', () => {
    expect(toSafeErrorInfo({ name: '   ', code: 'ERR_X' })).toEqual({ name: 'Error', code: 'ERR_X' });
  });

  it('returns null code when code is missing', () => {
    expect(toSafeErrorInfo({ name: 'NetworkError' })).toEqual({ name: 'NetworkError', code: null });
  });

  it('returns null code when code is empty string', () => {
    expect(toSafeErrorInfo({ name: 'NetworkError', code: '' })).toEqual({ name: 'NetworkError', code: null });
  });

  it('returns null code when code is whitespace', () => {
    expect(toSafeErrorInfo({ name: 'NetworkError', code: '   ' })).toEqual({ name: 'NetworkError', code: null });
  });

  it('ignores non-string name and code fields', () => {
    expect(toSafeErrorInfo({ name: 42, code: { nested: true } })).toEqual({ name: 'Error', code: null });
  });
});

// ─── logSecurityEvent ────────────────────────────────────────────────────────

describe('logSecurityEvent', () => {
  beforeEach(() => {
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls console.info for level info', () => {
    logSecurityEvent('info', 'test_event');
    expect(console.info).toHaveBeenCalledWith({ event: 'test_event' });
    expect(console.warn).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
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
    const call = vi.mocked(console.warn).mock.calls[0][0];
    expect(Object.keys(call)).toEqual(['event']);
  });
});
