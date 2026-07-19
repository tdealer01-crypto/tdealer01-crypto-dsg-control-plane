import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Upstash packages before any module import so the source file never
// tries to open a real network connection.
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60_000 }),
    })),
    {
      fixedWindow: vi.fn().mockReturnValue('fixed-window-limiter'),
    },
  ),
}));

// ─── getRateLimitKey ──────────────────────────────────────────────────────────

describe('getRateLimitKey', () => {
  let getRateLimitKey: (request: Request, prefix: string) => string;

  beforeEach(async () => {
    vi.resetModules();
    ({ getRateLimitKey } = await import('../../../lib/security/rate-limit'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    expect(getRateLimitKey(req, 'api')).toBe('api:1.2.3.4');
  });

  it('prepends the given prefix to the key', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(getRateLimitKey(req, 'myprefix')).toBe('myprefix:10.0.0.1');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-real-ip': '5.6.7.8' },
    });
    expect(getRateLimitKey(req, 'api')).toBe('api:5.6.7.8');
  });

  it('falls back to "unknown" when neither header is present', () => {
    const req = new Request('http://localhost/');
    expect(getRateLimitKey(req, 'api')).toBe('api:unknown');
  });

  it('takes the first IP from a comma-separated x-forwarded-for list', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '11.11.11.11, 22.22.22.22, 33.33.33.33' },
    });
    expect(getRateLimitKey(req, 'api')).toBe('api:11.11.11.11');
  });

  it('trims whitespace around the first IP in x-forwarded-for', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' },
    });
    expect(getRateLimitKey(req, 'api')).toBe('api:1.2.3.4');
  });
});

// ─── applyRateLimit (in-memory path) ─────────────────────────────────────────

describe('applyRateLimit (in-memory fallback — no Redis)', () => {
  let applyRateLimit: (opts: { key: string; limit: number; windowMs: number }) => Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }>;

  beforeEach(async () => {
    // Force the in-memory path by clearing the Upstash env vars.
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    vi.useFakeTimers();
    vi.resetModules();
    ({ applyRateLimit } = await import('../../../lib/security/rate-limit'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('allows the first request and returns remaining = limit - 1', async () => {
    const result = await applyRateLimit({ key: 'test:ip1', limit: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining on each subsequent request', async () => {
    const opts = { key: 'test:ip2', limit: 5, windowMs: 60_000 };
    await applyRateLimit(opts); // 1st → remaining 4
    const second = await applyRateLimit(opts); // 2nd → remaining 3
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(3);
    const third = await applyRateLimit(opts); // 3rd → remaining 2
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(2);
  });

  it('blocks the request when the limit is reached', async () => {
    const opts = { key: 'test:ip3', limit: 3, windowMs: 60_000 };
    await applyRateLimit(opts); // 1
    await applyRateLimit(opts); // 2
    await applyRateLimit(opts); // 3 — limit reached
    const result = await applyRateLimit(opts); // 4 — should be blocked
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('allows requests again after the window resets', async () => {
    const opts = { key: 'test:ip4', limit: 2, windowMs: 5_000 };
    await applyRateLimit(opts);
    await applyRateLimit(opts);
    const blocked = await applyRateLimit(opts);
    expect(blocked.allowed).toBe(false);

    // Advance time past the window so the bucket expires.
    vi.advanceTimersByTime(6_000);

    const afterReset = await applyRateLimit(opts);
    expect(afterReset.allowed).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });

  it('returns a resetAt timestamp in the future', async () => {
    const now = Date.now();
    const result = await applyRateLimit({ key: 'test:ip5', limit: 10, windowMs: 30_000 });
    expect(result.resetAt).toBeGreaterThan(now);
  });
});

// ─── buildRateLimitHeaders ────────────────────────────────────────────────────

describe('buildRateLimitHeaders', () => {
  let buildRateLimitHeaders: (
    result: { allowed: boolean; remaining: number; resetAt: number },
    limit: number,
  ) => Record<string, string>;

  beforeEach(async () => {
    vi.resetModules();
    ({ buildRateLimitHeaders } = await import('../../../lib/security/rate-limit'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets X-RateLimit-Limit to the given limit', () => {
    const headers = buildRateLimitHeaders({ allowed: true, remaining: 9, resetAt: 1_700_000_000_000 }, 10);
    expect(headers['X-RateLimit-Limit']).toBe('10');
  });

  it('sets X-RateLimit-Remaining to result.remaining', () => {
    const headers = buildRateLimitHeaders({ allowed: true, remaining: 7, resetAt: 1_700_000_000_000 }, 10);
    expect(headers['X-RateLimit-Remaining']).toBe('7');
  });

  it('sets X-RateLimit-Reset to resetAt converted to seconds (floor)', () => {
    const resetAt = 1_700_000_001_500; // 1700000001.5 seconds — should floor to 1700000001
    const headers = buildRateLimitHeaders({ allowed: false, remaining: 0, resetAt }, 10);
    expect(headers['X-RateLimit-Reset']).toBe('1700000001');
  });

  it('returns all three header keys', () => {
    const headers = buildRateLimitHeaders({ allowed: true, remaining: 5, resetAt: 1_700_000_000_000 }, 10);
    expect(Object.keys(headers).sort()).toEqual([
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
    ]);
  });

  it('returns string values even when remaining is 0', () => {
    const headers = buildRateLimitHeaders({ allowed: false, remaining: 0, resetAt: 1_700_000_000_000 }, 10);
    expect(headers['X-RateLimit-Remaining']).toBe('0');
  });
});

// ─── isRateLimiterConfigured ──────────────────────────────────────────────────

// ─── applyRateLimit (Redis path) ────────────────────────────────────────────

describe('applyRateLimit (Redis path — configured)', () => {
  let applyRateLimit: (opts: { key: string; limit: number; windowMs: number }) => Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }>;

  beforeEach(async () => {
    // Set up Redis env vars so Redis path is taken
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'mytoken');
    vi.resetModules();
    ({ applyRateLimit } = await import('../../../lib/security/rate-limit'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns success from Redis limiter', async () => {
    const result = await applyRateLimit({ key: 'test:ip1', limit: 10, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // Mocked to return 9
  });

  it('returns reset timestamp from Redis limiter', async () => {
    const beforeCall = Date.now() + 60_000;
    const result = await applyRateLimit({ key: 'test:ip1', limit: 10, windowMs: 60_000 });
    expect(result.resetAt).toBeGreaterThanOrEqual(beforeCall - 1000); // Within 1s margin
  });

  it('falls back to in-memory when Redis limiter throws', async () => {
    // Mock the Ratelimit constructor to throw on limit() call
    const { Ratelimit } = await import('@upstash/ratelimit');
    const mockRatelimit = vi.mocked(Ratelimit);

    // Override the mocked instance to throw on limit()
    mockRatelimit.mockImplementationOnce(() => ({
      limit: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
    } as any));

    vi.resetModules();
    ({ applyRateLimit } = await import('../../../lib/security/rate-limit'));

    // Should fall back to memory successfully
    const result = await applyRateLimit({ key: 'test:fallback', limit: 5, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });
});

// ─── isRateLimiterConfigured ──────────────────────────────────────────────────

describe('isRateLimiterConfigured', () => {
  let isRateLimiterConfigured: () => boolean;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '');
    ({ isRateLimiterConfigured } = await import('../../../lib/security/rate-limit'));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns false when both env vars are absent', () => {
    expect(isRateLimiterConfigured()).toBe(false);
  });

  it('returns false when only UPSTASH_REDIS_REST_URL is set', () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    expect(isRateLimiterConfigured()).toBe(false);
  });

  it('returns false when only UPSTASH_REDIS_REST_TOKEN is set', () => {
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'mytoken');
    expect(isRateLimiterConfigured()).toBe(false);
  });

  it('returns true when both env vars are set', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.com');
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'mytoken');
    // Re-import so the function reads the freshly-stubbed env vars.
    vi.resetModules();
    ({ isRateLimiterConfigured } = await import('../../../lib/security/rate-limit'));
    expect(isRateLimiterConfigured()).toBe(true);
  });
});
