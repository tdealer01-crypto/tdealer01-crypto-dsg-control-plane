import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Supabase server credential selection', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers SUPABASE_SECRET_KEY when both credentials are present', async () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_modern');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'legacy-service-role');

    const { getSupabaseServerCredential, hasSupabaseServerCredential } = await import('../../lib/supabase-server');

    expect(getSupabaseServerCredential()).toBe('sb_secret_modern');
    expect(hasSupabaseServerCredential()).toBe(true);
  });

  it('falls back to SUPABASE_SERVICE_ROLE_KEY for compatibility', async () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'legacy-service-role');

    const { getSupabaseServerCredential, hasSupabaseServerCredential } = await import('../../lib/supabase-server');

    expect(getSupabaseServerCredential()).toBe('legacy-service-role');
    expect(hasSupabaseServerCredential()).toBe(true);
  });

  it('returns null and false when no privileged backend credential exists', async () => {
    const { getSupabaseServerCredential, hasSupabaseServerCredential } = await import('../../lib/supabase-server');

    expect(getSupabaseServerCredential()).toBeNull();
    expect(hasSupabaseServerCredential()).toBe(false);
  });
});
