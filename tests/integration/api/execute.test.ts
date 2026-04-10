import { vi } from 'vitest';

describe('/api/execute', () => {
  it('returns 401 when bearer token is missing', async () => {
    vi.resetModules();
    const { POST } = await import('../../../app/api/execute/route');
    const req = new Request('http://localhost/api/execute', {
      method: 'POST',
      body: JSON.stringify({ agent_id: 'a' }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Missing Bearer token' });
  }, 15_000);
});
