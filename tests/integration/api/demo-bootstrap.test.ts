import { POST } from '../../../app/api/demo/bootstrap/route';

describe('/api/demo/bootstrap', () => {
  it('is disabled by default in tests', async () => {
    const req = new Request('http://localhost/api/demo/bootstrap', { method: 'POST' });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });
});
