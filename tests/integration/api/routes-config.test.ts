import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('GET /api/config/language', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns current language and supported languages', async () => {
    vi.doMock('../../../lib/language/language-config', () => ({
      getPreferredLanguage: vi.fn(() => 'en'),
      LANGUAGE_NAMES: {
        en: 'English',
        th: 'Thai',
        zh: 'Chinese',
        ja: 'Japanese',
      },
      LANGUAGE_CODES: {
        en: 'en',
        th: 'th',
        zh: 'zh',
        ja: 'ja',
      },
    }));

    const { GET } = await import('../../../app/api/config/language/route');
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.current).toBe('en');
    expect(body.currentName).toBe('English');
    expect(Array.isArray(body.supported)).toBe(true);
    expect(body.supported.length).toBeGreaterThan(0);
  });

  it('includes language config in response', async () => {
    vi.doMock('../../../lib/language/language-config', () => ({
      getPreferredLanguage: vi.fn(() => 'th'),
      LANGUAGE_NAMES: {
        en: 'English',
        th: 'Thai',
      },
      LANGUAGE_CODES: {
        en: 'en',
        th: 'th',
      },
    }));

    const { GET } = await import('../../../app/api/config/language/route');
    const res = await GET();
    const body = await res.json();

    expect(body.current).toBe('th');
    expect(body.currentName).toBe('Thai');
    expect(body.instruction).toBeDefined();
    expect(body.examples).toBeDefined();
    expect(body.examples.thai).toBe('PREFERRED_LANGUAGE=th');
  });

  it('returns supported languages list', async () => {
    vi.doMock('../../../lib/language/language-config', () => ({
      getPreferredLanguage: vi.fn(() => 'en'),
      LANGUAGE_NAMES: {
        en: 'English',
        th: 'Thai',
        zh: 'Chinese',
      },
      LANGUAGE_CODES: {
        en: 'en',
        th: 'th',
        zh: 'zh',
      },
    }));

    const { GET } = await import('../../../app/api/config/language/route');
    const res = await GET();
    const body = await res.json();

    expect(body.supported).toEqual([
      { code: 'en', name: 'English' },
      { code: 'th', name: 'Thai' },
      { code: 'zh', name: 'Chinese' },
    ]);
  });

  it('includes setup instruction in response', async () => {
    vi.doMock('../../../lib/language/language-config', () => ({
      getPreferredLanguage: vi.fn(() => 'en'),
      LANGUAGE_NAMES: {
        en: 'English',
      },
      LANGUAGE_CODES: {
        en: 'en',
      },
    }));

    const { GET } = await import('../../../app/api/config/language/route');
    const res = await GET();
    const body = await res.json();

    expect(body.instruction).toContain('PREFERRED_LANGUAGE');
    expect(body.instruction).toContain('environment variable');
  });

  it('is public and requires no authentication', async () => {
    // This route should not require auth, just verify it can be called without mocking auth
    vi.doMock('../../../lib/language/language-config', () => ({
      getPreferredLanguage: vi.fn(() => 'en'),
      LANGUAGE_NAMES: { en: 'English' },
      LANGUAGE_CODES: { en: 'en' },
    }));

    const { GET } = await import('../../../app/api/config/language/route');
    const res = await GET();

    expect(res.status).toBe(200);
  });
});
