import { describe, expect, it } from 'vitest';

describe('/api/execute compatibility route', () => {
  it('re-exports OPTIONS and POST from spine execute route', async () => {
    const compatRoute = await import('../../../app/api/execute/route');
    const spineRoute = await import('../../../app/api/spine/execute/route');

    expect(compatRoute.dynamic).toBe('force-dynamic');
    expect(compatRoute.OPTIONS).toBe(spineRoute.OPTIONS);
    expect(compatRoute.POST).toBe(spineRoute.POST);
  });
});
