import { POST } from '../../../app/api/demo/bootstrap/route';

describe('/api/demo/bootstrap', () => {
  it('returns 410 because demo bootstrap was removed', async () => {
    const res = await POST();
    expect(res.status).toBe(410);

    const payload = await res.json();
    expect(payload).toMatchObject({
      ok: false,
      code: 'DEMO_BOOTSTRAP_REMOVED',
    });
  });
});
