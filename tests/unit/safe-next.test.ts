import { describe, expect, it } from 'vitest';
import { getSafeNext } from '../../lib/auth/safe-next';

describe('getSafeNext', () => {
  it('returns default for null/undefined', () => {
    expect(getSafeNext(null)).toBe('/dashboard/executions');
    expect(getSafeNext(undefined)).toBe('/dashboard/executions');
  });

  it('returns default for non-path values', () => {
    expect(getSafeNext('https://evil.com')).toBe('/dashboard/executions');
    expect(getSafeNext('evil.com')).toBe('/dashboard/executions');
  });

  it('blocks protocol-relative URLs', () => {
    expect(getSafeNext('//evil.com')).toBe('/dashboard/executions');
    expect(getSafeNext('//evil.com/path')).toBe('/dashboard/executions');
  });

  it('allows valid paths', () => {
    expect(getSafeNext('/dashboard')).toBe('/dashboard');
    expect(getSafeNext('/dashboard/executions')).toBe('/dashboard/executions');
  });
});
