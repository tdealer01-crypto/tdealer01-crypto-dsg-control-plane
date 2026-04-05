import { afterEach, describe, expect, it } from 'vitest';
import { validateAuthConfig } from '../../lib/auth/preflight';

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'APP_URL',
  'NEXT_PUBLIC_APP_URL',
] as const;

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

function resetEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key];
    if (typeof value === 'undefined') {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function applyValidBaseline() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
  process.env.APP_URL = 'https://app.example.com';
  delete process.env.NEXT_PUBLIC_APP_URL;
}

afterEach(() => {
  resetEnv();
});

describe('validateAuthConfig', () => {
  it('returns ok=true when required auth config is present', () => {
    applyValidBaseline();

    const result = validateAuthConfig();

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('returns missing-supabase-url error when Supabase URL is missing', () => {
    applyValidBaseline();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const result = validateAuthConfig();

    expect(result.ok).toBe(false);
    expect(result.errors.some((entry) => entry.code === 'missing-supabase-url')).toBe(true);
  });

  it('returns missing-anon-key error when anon/publishable keys are both missing', () => {
    applyValidBaseline();
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    const result = validateAuthConfig();

    expect(result.ok).toBe(false);
    expect(result.errors.some((entry) => entry.code === 'missing-anon-key')).toBe(true);
  });

  it('returns missing-service-key error when service role key is missing', () => {
    applyValidBaseline();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const result = validateAuthConfig();

    expect(result.ok).toBe(false);
    expect(result.errors.some((entry) => entry.code === 'missing-service-key')).toBe(true);
  });

  it('returns missing-app-url as warning by default, not as blocking error', () => {
    applyValidBaseline();
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const result = validateAuthConfig();

    expect(result.ok).toBe(true);
    expect(result.errors.some((entry) => entry.code === 'missing-app-url')).toBe(false);
    expect(result.warnings.some((entry) => entry.code === 'missing-app-url')).toBe(true);
  });

  it('returns missing-app-url as blocking error when requireAppUrl=true', () => {
    applyValidBaseline();
    delete process.env.APP_URL;
    delete process.env.NEXT_PUBLIC_APP_URL;

    const result = validateAuthConfig({ requireAppUrl: true });

    expect(result.ok).toBe(false);
    expect(result.errors.some((entry) => entry.code === 'missing-app-url')).toBe(true);
  });
});
