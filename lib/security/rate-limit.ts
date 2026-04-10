import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

type Bucket = { count: number; resetAt: number };
const memBuckets = new Map<string, Bucket>();
const MAX_MEM_BUCKETS = 10_000;

function applyMemoryRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  if (memBuckets.size > MAX_MEM_BUCKETS) {
    for (const [key, bucket] of Array.from(memBuckets.entries())) {
      if (now >= bucket.resetAt) memBuckets.delete(key);
    }
  }

  const existing = memBuckets.get(options.key);
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + options.windowMs;
    memBuckets.set(options.key, { count: 1, resetAt });
    return { allowed: true, remaining: Math.max(options.limit - 1, 0), resetAt };
  }
  if (existing.count >= options.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  memBuckets.set(options.key, existing);
  return { allowed: true, remaining: Math.max(options.limit - existing.count, 0), resetAt: existing.resetAt };
}

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();
let warnedNoRedis = false;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redis = new Redis({ url, token });
  return redis;
}

function getLimiter(prefix: string, limit: number, windowMs: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const key = `${prefix}:${limit}:${windowMs}`;
  if (!limiters.has(key)) {
    const windowSec = `${Math.ceil(windowMs / 1000)} s` as `${number} s`;
    limiters.set(key, new Ratelimit({
      redis: r,
      limiter: Ratelimit.fixedWindow(limit, windowSec),
      prefix: `rl:${prefix}`,
    }));
  }
  return limiters.get(key)!;
}

export function getRateLimitKey(request: Request, prefix: string) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const realIp = request.headers.get('x-real-ip') || '';
  const ip = forwardedFor.split(',')[0]?.trim() || realIp || 'unknown';
  return `${prefix}:${ip}`;
}

export async function applyRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const prefix = options.key.split(':')[0] || 'default';
  const limiter = getLimiter(prefix, options.limit, options.windowMs);

  if (!limiter) {
    if (!warnedNoRedis) {
      console.warn('[rate-limit] UPSTASH_REDIS_REST_URL not set — using in-memory fallback (not effective on serverless)');
      warnedNoRedis = true;
    }
    return applyMemoryRateLimit(options);
  }

  try {
    const { success, remaining, reset } = await limiter.limit(options.key);
    return { allowed: success, remaining, resetAt: reset };
  } catch {
    return applyMemoryRateLimit(options);
  }
}

export function buildRateLimitHeaders(result: RateLimitResult, limit: number) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}
