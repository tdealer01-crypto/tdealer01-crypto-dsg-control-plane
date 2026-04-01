import { describe, it, expect, vi } from 'vitest';

describe('/api/access/request rate limit', () => {
  it('blocks duplicate spam after threshold', async () => {
    const consume = vi.fn().mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 }).mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 }).mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 }).mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 60 });
    vi.doMock('../../../lib/security/rate-limit', () => ({ consumeRateLimit: consume }));
    vi.doMock('../../../lib/supabase-server', () => ({ getSupabaseAdmin: () => ({ from: () => ({ insert: async () => ({ error: null }) }) }) }));
    const { POST } = await import('../../../app/api/access/request/route');
    for (let i = 0; i < 3; i++) { const ok = await POST(new Request('http://localhost/api/access/request', { method: 'POST', body: JSON.stringify({ email: 'x@a.com', org_id: 'org1' }) }) as any); expect(ok.status).toBe(200); }
    const blocked = await POST(new Request('http://localhost/api/access/request', { method: 'POST', body: JSON.stringify({ email: 'x@a.com', org_id: 'org1' }) }) as any);
    expect(blocked.status).toBe(429);
  });
});
