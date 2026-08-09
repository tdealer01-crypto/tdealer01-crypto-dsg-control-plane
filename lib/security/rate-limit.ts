import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createClient } from 'redis';

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

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function blockedResult(windowMs: number): RateLimitResult {
  return { allowed: false, remaining: 0, resetAt: Date.now() + windowMs };
}

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

let upstashRedis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();
let warnedNoDistributedRedis = false;

type StandardRedisClient = ReturnType<typeof createClient>;
let standardRedisClient: StandardRedisClient | null = null;
let standardRedisConnectPromise: Promise<StandardRedisClient> | null = null;

function getUpstashRedis(): Redis | null {
  if (upstashRedis) return upstashRedis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  upstashRedis = new Redis({ url, token });
  return upstashRedis;
}

function getUpstashLimiter(prefix: string, limit: number, windowMs: number): Ratelimit | null {
  const redis = getUpstashRedis();
  if (!redis) return null;
  const key = `${prefix}:${limit}:${windowMs}`;
  if (!limiters.has(key)) {
    const windowSec = `${Math.ceil(windowMs / 1000)} s` as `${number} s`;
    limiters.set(key, new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(limit, windowSec),
      prefix: `rl:${prefix}`,
    }));
  }
  return limiters.get(key)!;
}

function getStandardRedisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  return url || null;
}

async function getStandardRedisClient(): Promise<StandardRedisClient | null> {
  const url = getStandardRedisUrl();
  if (!url) return null;

  if (!standardRedisClient) {
    standardRedisClient = createClient({ url });
    standardRedisClient.on('error', (error) => {
      console.error('[rate-limit] Redis client error', error);
    });
  }

  if (standardRedisClient.isReady) return standardRedisClient;

  if (!standardRedisConnectPromise) {
    standardRedisConnectPromise = standardRedisClient.connect()
      .then(() => standardRedisClient!)
      .catch((error) => {
        standardRedisConnectPromise = null;
        throw error;
      });
  }

  return standardRedisConnectPromise;
}

async function applyStandardRedisRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const client = await getStandardRedisClient();
  if (!client) throw new Error('standard_redis_not_configured');

  const script = `
    local count = redis.call('INCR', KEYS[1])
    if count == 1 then
      redis.call('PEXPIRE', KEYS[1], ARGV[1])
    end
    local ttl = redis.call('PTTL', KEYS[1])
    return {count, ttl}
  `;

  const result = await client.eval(script, {
    keys: [`rl:${options.key}`],
    arguments: [String(options.windowMs)],
  });

  if (!Array.isArray(result) || result.length < 2) {
    throw new Error('invalid_redis_rate_limit_response');
  }

  const count = Number(result[0]);
  const ttl = Math.max(Number(result[1]), 0);
  if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
    throw new Error('invalid_redis_rate_limit_values');
  }

  return {
    allowed: count <= options.limit,
    remaining: Math.max(options.limit - count, 0),
    resetAt: Date.now() + ttl,
  };
}

export function getRateLimitKey(request: Request, prefix: string) {
  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const realIp = request.headers.get('x-real-ip') || '';
  const ip = forwardedFor.split(',')[0]?.trim() || realIp || 'unknown';
  return `${prefix}:${ip}`;
}

export async function applyRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const prefix = options.key.split(':')[0] || 'default';
  const upstashLimiter = getUpstashLimiter(prefix, options.limit, options.windowMs);

  if (upstashLimiter) {
    try {
      const { success, remaining, reset } = await upstashLimiter.limit(options.key);
      return { allowed: success, remaining, resetAt: reset };
    } catch (error) {
      console.error('[rate-limit] Upstash limiter error', error);
      return isProduction() ? blockedResult(options.windowMs) : applyMemoryRateLimit(options);
    }
  }

  if (getStandardRedisUrl()) {
    try {
      return await applyStandardRedisRateLimit(options);
    } catch (error) {
      console.error('[rate-limit] Redis limiter error', error);
      return isProduction() ? blockedResult(options.windowMs) : applyMemoryRateLimit(options);
    }
  }

  if (!warnedNoDistributedRedis) {
    console.warn('[rate-limit] No distributed Redis configured');
    warnedNoDistributedRedis = true;
  }

  return isProduction() ? blockedResult(options.windowMs) : applyMemoryRateLimit(options);
}

export function buildRateLimitHeaders(result: RateLimitResult, limit: number) {
  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
}

export function isRateLimiterConfigured(): boolean {
  const upstashConfigured = !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
  return upstashConfigured || !!getStandardRedisUrl();
}
