import { describe, it, expect } from 'vitest';
import { sha256, normalizeArgs, buildCommandEnvelope, isExpired } from '../../../lib/commands/normalize';

describe('sha256', () => {
  it('returns sha256: prefix', () => {
    expect(sha256('hello')).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('is deterministic for same input', () => {
    expect(sha256('test')).toBe(sha256('test'));
  });

  it('differs for different inputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'));
  });

  it('handles empty string', () => {
    expect(sha256('')).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('normalizeArgs — device.open_url', () => {
  it('normalizes a valid https URL', () => {
    const result = normalizeArgs('device.open_url', { url: 'https://example.com/path' });
    expect(result).toMatchObject({ url: 'https://example.com/path', scheme: 'https' });
  });

  it('rejects non-https scheme', () => {
    expect(() => normalizeArgs('device.open_url', { url: 'ftp://example.com' })).toThrow('Unsupported URL scheme');
  });
});

describe('normalizeArgs — device.open_app', () => {
  it('extracts packageName', () => {
    const result = normalizeArgs('device.open_app', { packageName: 'com.example.app' });
    expect(result).toMatchObject({ packageName: 'com.example.app' });
  });

  it('falls back to target', () => {
    const result = normalizeArgs('device.open_app', { target: 'com.fallback' });
    expect(result).toMatchObject({ packageName: 'com.fallback' });
  });
});

describe('normalizeArgs — file.*', () => {
  it('marks .env path as sensitive', () => {
    const result = normalizeArgs('file.list_root', { path: '/sdcard/.env' });
    expect(result).toMatchObject({ sensitive: true });
  });

  it('marks non-sensitive path correctly', () => {
    const result = normalizeArgs('file.preview', { path: '/sdcard/photos/pic.jpg' });
    expect(result).toMatchObject({ sensitive: false });
  });

  it('marks api_key path as sensitive', () => {
    const result = normalizeArgs('file.select', { path: '/sdcard/my_api_key.txt' });
    expect(result).toMatchObject({ sensitive: true });
  });
});

describe('buildCommandEnvelope', () => {
  it('returns a valid envelope for an ALLOW-class tool', () => {
    const env = buildCommandEnvelope({ toolName: 'device.open_url', args: { url: 'https://example.com' } });
    expect(env.version).toBe('dsg.command/1');
    expect(env.tool.name).toBe('device.open_url');
    expect(env.idempotency.digest).toMatch(/^sha256:/);
    expect(typeof env.commandId).toBe('string');
  });

  it('blocks a tool matching a blocked pattern', () => {
    expect(() => buildCommandEnvelope({ toolName: 'shell.exec' as never, args: {} })).toThrow();
  });

  it('blocks file with sensitive path', () => {
    const env = buildCommandEnvelope({ toolName: 'file.list_root', args: { path: '/sdcard/private.key' } });
    expect(env.executionState).toBe('blocked');
  });

  it('produces deterministic idempotency key for same inputs', () => {
    const a = buildCommandEnvelope({ toolName: 'device.open_app', args: { packageName: 'com.test' }, deviceId: 'dev1' });
    const b = buildCommandEnvelope({ toolName: 'device.open_app', args: { packageName: 'com.test' }, deviceId: 'dev1' });
    expect(a.idempotency.key).toBe(b.idempotency.key);
  });
});

describe('isExpired', () => {
  it('returns true for a past timestamp', () => {
    expect(isExpired(new Date(Date.now() - 1000).toISOString())).toBe(true);
  });

  it('returns false for a future timestamp', () => {
    expect(isExpired(new Date(Date.now() + 60_000).toISOString())).toBe(false);
  });
});
