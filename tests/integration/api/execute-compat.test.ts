import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../lib/agent-auth', () => ({
  resolveAgentFromApiKey: vi.fn(),
}));
vi.mock('../../../lib/spine/engine', () => ({
  executeSpineIntent: vi.fn(),
  issueSpineIntent: vi.fn(),
}));
vi.mock('../../../lib/security/rate-limit', () => ({
  applyRateLimit: vi.fn(async () => ({ allowed: true, resetAt: Date.now() + 60_000 })),
  buildRateLimitHeaders: vi.fn(() => ({})),
  getRateLimitKey: vi.fn(() => 'test'),
}));
vi.mock('../../../lib/usage/quota', () => ({
  checkQuota: vi.fn(),
  incrementQuota: vi.fn(),
}));

describe('/api/execute compatibility route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports OPTIONS, POST, and force-dynamic', async () => {
    const compatRoute = await import('../../../app/api/execute/route');

    expect(typeof compatRoute.OPTIONS).toBe('function');
    expect(typeof compatRoute.POST).toBe('function');
    expect(compatRoute.dynamic).toBe('force-dynamic');
  });
});
