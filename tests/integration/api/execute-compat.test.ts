import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('/api/execute compatibility route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('re-exports OPTIONS and POST from spine execute route', async () => {
    const OPTIONS = vi.fn();
    const POST = vi.fn();

    vi.doMock('../../../app/api/spine/execute/route', () => ({
      OPTIONS,
      POST,
      dynamic: 'force-dynamic',
    }));

    const compatRoute = await import('../../../app/api/execute/route');

    expect(compatRoute.OPTIONS).toBe(OPTIONS);
    expect(compatRoute.POST).toBe(POST);
    expect(compatRoute.dynamic).toBe('force-dynamic');
  });
});
