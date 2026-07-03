import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSupabaseAdminMock = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

function mockBlogRows(rows: Array<{ slug: string; created_at: string | null }> | null, error: unknown = null) {
  const limit = vi.fn().mockResolvedValue({ data: rows, error });
  getSupabaseAdminMock.mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({ limit })),
          })),
        })),
      })),
    })),
  });
}

describe('sitemap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('always includes the static selling/SEO pages', async () => {
    mockBlogRows([]);
    const sitemap = (await import('../../../app/sitemap')).default;
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    for (const path of ['/', '/pricing', '/delivery-proof', '/finance-governance/pricing', '/eu-ai-act', '/blog', '/marketplace']) {
      expect(urls.some((u) => u.endsWith(path))).toBe(true);
    }
  });

  it('appends published blog slugs from marketing_content', async () => {
    mockBlogRows([
      { slug: 'ai-governance-guide', created_at: '2026-06-01T00:00:00Z' },
      { slug: 'eu-ai-act-checklist', created_at: null },
    ]);
    const sitemap = (await import('../../../app/sitemap')).default;
    const urls = (await sitemap()).map((e) => e.url);

    expect(urls.some((u) => u.includes('/blog/ai-governance-guide'))).toBe(true);
    expect(urls.some((u) => u.includes('/blog/eu-ai-act-checklist'))).toBe(true);
  });

  it('falls back to static entries when Supabase throws', async () => {
    getSupabaseAdminMock.mockImplementation(() => {
      throw new Error('supabase unavailable');
    });
    const sitemap = (await import('../../../app/sitemap')).default;
    const entries = await sitemap();

    expect(entries.length).toBeGreaterThanOrEqual(10);
    expect(entries.every((e) => e.url.startsWith('http'))).toBe(true);
  });

  it('robots blocks operator surfaces and points at the sitemap', async () => {
    const robots = (await import('../../../app/robots')).default;
    const result = robots();
    const rule = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rule?.disallow).toContain('/dashboard');
    expect(rule?.disallow).toContain('/api/');
    expect(String(result.sitemap)).toContain('/sitemap.xml');
  });
});
