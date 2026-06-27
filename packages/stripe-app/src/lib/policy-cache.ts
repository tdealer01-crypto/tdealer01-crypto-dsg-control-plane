export interface CachedPolicy {
  stripe_account_id: string;
  operation_type: string;
  rule_type?: string;
  conditions: Record<string, unknown>;
  action: 'allow' | 'block' | 'review';
  cached_at: number;
}

export class PolicyCache {
  private cache: Map<string, CachedPolicy> = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutes

  getCacheKey(stripeAccountId: string, operationType: string): string {
    return `policy:${stripeAccountId}:${operationType}`;
  }

  get(stripeAccountId: string, operationType: string): CachedPolicy | null {
    const key = this.getCacheKey(stripeAccountId, operationType);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    const age = Date.now() - cached.cached_at;
    if (age > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached;
  }

  set(
    stripeAccountId: string,
    operationType: string,
    policy: CachedPolicy
  ): void {
    const key = this.getCacheKey(stripeAccountId, operationType);
    this.cache.set(key, {
      ...policy,
      cached_at: Date.now(),
    });
  }

  invalidate(stripeAccountId: string, operationType?: string): void {
    if (operationType) {
      const key = this.getCacheKey(stripeAccountId, operationType);
      this.cache.delete(key);
    } else {
      // Invalidate all policies for account
      const prefix = `policy:${stripeAccountId}:`;
      for (const [key] of this.cache) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const policyCache = new PolicyCache();
