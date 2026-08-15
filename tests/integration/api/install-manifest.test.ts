import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/install/manifest/route';

describe('GET /api/install/manifest', () => {
  it('publishes only supported installation states', async () => {
    const response = GET();
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBe(1);
    expect(Array.isArray(body.channels)).toBe(true);

    const byId = Object.fromEntries(
      body.channels.map((channel: { id: string }) => [channel.id, channel]),
    );

    expect(byId.web.status).toBe('ready');
    expect(byId.web.installMode).toBe('one-click');
    expect(byId.web.href).toBe('/demo');

    expect(byId.api.status).toBe('ready');
    expect(byId.api.href).toBe('/dashboard/api-keys');

    expect(byId.mcp.status).toBe('guided');
    expect(byId.mcp.installMode).toBe('manual');

    expect(byId.github.status).toBe('planned');
    expect(byId.github.installMode).not.toBe('one-click');

    expect(byId.vercel.status).toBe('planned');
    expect(byId.vercel.installMode).not.toBe('one-click');
  });

  it('never exposes an empty install destination', async () => {
    const body = await GET().json();
    for (const channel of body.channels) {
      expect(channel.href).toEqual(expect.any(String));
      expect(channel.href.trim().length).toBeGreaterThan(0);
      expect(channel.firstValue.trim().length).toBeGreaterThan(0);
    }
  });
});
