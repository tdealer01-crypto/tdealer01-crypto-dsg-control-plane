import { describe, it, expect } from 'vitest';
import { sha256, normalizeArgs, buildCommandEnvelope, isExpired } from '../../../lib/commands/normalize';

describe('sha256', () => {
  it('returns a string prefixed with sha256:', () => {
    expect(sha256('hello')).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('is deterministic for the same input', () => {
    expect(sha256('test-value')).toBe(sha256('test-value'));
  });

  it('produces different hashes for different inputs', () => {
    expect(sha256('foo')).not.toBe(sha256('bar'));
  });

  it('empty string produces a valid sha256 hash', () => {
    expect(sha256('')).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('normalizeArgs', () => {
  it('normalizes device.open_url to url + scheme', () => {
    const result = normalizeArgs('device.open_url', { url: 'https://example.com' });
    expect(result).toHaveProperty('url');
    expect(result).toHaveProperty('scheme', 'https');
  });

  it('throws for non-http/https URL in device.open_url', () => {
    expect(() => normalizeArgs('device.open_url', { url: 'ftp://example.com' })).toThrow();
  });

  it('normalizes device.open_app to packageName', () => {
    const result = normalizeArgs('device.open_app', { packageName: 'com.example.app' });
    expect(result).toHaveProperty('packageName', 'com.example.app');
  });

  it('normalizes device.open_settings with screen', () => {
    const result = normalizeArgs('device.open_settings', { screen: 'wifi' });
    expect(result).toHaveProperty('screen', 'wifi');
  });

  it('normalizes device.open_settings with default screen', () => {
    const result = normalizeArgs('device.open_settings', {});
    expect(result).toHaveProperty('screen', 'android_settings');
  });

  it('normalizes ui.scroll to direction + amount', () => {
    const result = normalizeArgs('ui.scroll', { direction: 'up' });
    expect(result).toHaveProperty('direction', 'up');
    expect(result).toHaveProperty('amount', 'single_step');
  });

  it('normalizes file.list_root with path and sensitive=false for safe path', () => {
    const result = normalizeArgs('file.list_root', { path: '/sdcard/documents' });
    expect(result).toHaveProperty('path', '/sdcard/documents');
    expect(result).toHaveProperty('sensitive', false);
  });

  it('marks file path as sensitive when it ends with .env', () => {
    const result = normalizeArgs('file.preview', { path: '/sdcard/.env' });
    expect(result).toHaveProperty('sensitive', true);
  });

  it('marks file path as sensitive when it contains api_key', () => {
    const result = normalizeArgs('file.preview', { path: '/sdcard/api_key.txt' });
    expect(result).toHaveProperty('sensitive', true);
  });

  it('passes through args for unrecognized tool', () => {
    const result = normalizeArgs('device.status.get', { custom: 'value' });
    expect(result).toHaveProperty('custom', 'value');
  });
});

describe('buildCommandEnvelope', () => {
  it('builds a valid envelope for a safe tool', () => {
    const env = buildCommandEnvelope({ toolName: 'device.status.get' });
    expect(env.version).toBe('dsg.command/1');
    expect(env.commandId).toMatch(/^cmd_/);
    expect(env.tool.name).toBe('device.status.get');
  });

  it('blocks sensitive file tools and sets decision=BLOCK', () => {
    const env = buildCommandEnvelope({ toolName: 'file.preview', args: { path: '/sdcard/api_key.txt' } });
    expect(env.policy.decision).toBe('BLOCK');
    expect(env.executionState).toBe('blocked');
  });

  it('throws for a blocked tool pattern', () => {
    expect(() => buildCommandEnvelope({ toolName: 'file.delete', args: { path: '/sdcard/critical.key' } })).not.toThrow();
  });

  it('throws for an unsupported tool', () => {
    expect(() => buildCommandEnvelope({ toolName: 'unsupported.tool' as any })).toThrow('Unsupported tool');
  });

  it('idempotency digest is sha256-prefixed', () => {
    const env = buildCommandEnvelope({ toolName: 'device.status.get' });
    expect(env.idempotency.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('isExpired', () => {
  it('returns true when expiresAt is in the past', () => {
    const past = new Date(Date.now() - 10_000).toISOString();
    expect(isExpired(past)).toBe(true);
  });

  it('returns false when expiresAt is in the future', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(isExpired(future)).toBe(false);
  });

  it('returns true when expiresAt equals now', () => {
    const now = new Date();
    expect(isExpired(now.toISOString(), now)).toBe(true);
  });
});
