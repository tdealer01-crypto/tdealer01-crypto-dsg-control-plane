/**
 * Manifest Cache with LRU Eviction and TTL Expiration
 *
 * Caches SafeElementManifest arrays with per-entry TTL and memory management.
 * Evicts oldest entries when cache size or memory limits exceeded.
 * Tracks hit rate, latency, and memory usage.
 */

import type { SafeElementManifest } from '@/lib/dsg/safe-dom/types';
import { LRUEvictionPolicy } from './lru-policy';

interface ManifestCacheEntry<T> {
  value: T;
  expiresAt: number; // timestamp in ms
  size: number; // approximate memory size in bytes
  hitCount: number;
  createdAt: number;
  lastAccessedAt: number;
}

export interface CacheStats {
  hitCount: number;
  missCount: number;
  evictionCount: number;
  memoryUsed: number;
  entriesCount: number;
  hitRate: number; // percentage (0-100)
  avgEntrySize: number;
  avgLatency: number; // milliseconds
  expirationEvictions: number;
}

/**
 * ManifestCache: LRU cache with TTL expiration for SafeElementManifest arrays
 *
 * Per-agent cache limits:
 * - maxSize: 100 entries per agent
 * - maxMemory: 50MB total across all agents
 * - TTL: configurable per entry (default 5 minutes)
 *
 * Eviction strategy:
 * 1. Remove expired entries (TTL check)
 * 2. Remove oldest entries (LRU) when size limit exceeded
 * 3. Remove oldest entries when memory limit exceeded
 */
export class ManifestCache {
  private cache = new Map<string, ManifestCacheEntry<SafeElementManifest[]>>();
  private lru: LRUEvictionPolicy = new LRUEvictionPolicy();
  private maxSize: number;
  private maxMemory: number;

  private stats = {
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    expirationEvictions: 0,
    totalLatency: 0,
    latencyCount: 0,
  };

  private memoryUsed = 0;

  /**
   * Initialize manifest cache
   * @param maxSize Maximum number of entries per agent (default 100)
   * @param maxMemory Maximum memory in bytes (default 50MB)
   */
  constructor(maxSize = 100, maxMemory = 50 * 1024 * 1024) {
    this.maxSize = maxSize;
    this.maxMemory = maxMemory;
  }

  /**
   * Estimate size of manifest array in bytes
   */
  private estimateSize(manifest: SafeElementManifest[]): number {
    // Rough estimate: each element ~500 bytes average
    return manifest.length * 500 + JSON.stringify(manifest).length;
  }

  /**
   * Generate cache key from sessionId and frameId
   */
  private generateKey(sessionId: string, frameId: string): string {
    return `${sessionId}:${frameId}`;
  }

  /**
   * Check and remove expired entries
   */
  private pruneExpired(): number {
    let removed = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        this.lru.remove(key);
        this.memoryUsed -= entry.size;
        removed++;
        this.stats.expirationEvictions++;
      }
    }

    return removed;
  }

  /**
   * Evict oldest LRU entry
   */
  private evictLRU(): boolean {
    const key = this.lru.evict();
    if (!key) return false;

    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.memoryUsed -= entry.size;
      this.stats.evictionCount++;
      return true;
    }
    return false;
  }

  /**
   * Ensure cache respects size and memory limits
   */
  private enforceCapacity(): void {
    // First, prune expired entries
    this.pruneExpired();

    // Evict LRU entries if exceeding size limit
    while (this.cache.size > this.maxSize) {
      this.evictLRU();
    }

    // Evict LRU entries if over memory limit
    while (this.memoryUsed > this.maxMemory && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Retrieve cached manifest
   * @param sessionId Session identifier
   * @param frameId Frame identifier
   * @returns Cached manifest or null if not found/expired
   */
  get(sessionId: string, frameId: string): SafeElementManifest[] | null {
    const t0 = performance.now();
    const key = this.generateKey(sessionId, frameId);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.missCount++;
      const latency = performance.now() - t0;
      this.stats.totalLatency += latency;
      this.stats.latencyCount++;
      return null;
    }

    // Check if expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.lru.remove(key);
      this.memoryUsed -= entry.size;
      this.stats.missCount++;
      this.stats.expirationEvictions++;
      const latency = performance.now() - t0;
      this.stats.totalLatency += latency;
      this.stats.latencyCount++;
      return null;
    }

    // Hit: update stats and LRU
    entry.hitCount++;
    entry.lastAccessedAt = Date.now();
    this.lru.touch(key);
    this.stats.hitCount++;
    const latency = performance.now() - t0;
    this.stats.totalLatency += latency;
    this.stats.latencyCount++;

    return entry.value;
  }

  /**
   * Store manifest in cache with TTL
   * @param sessionId Session identifier
   * @param frameId Frame identifier
   * @param manifest The manifest to cache
   * @param ttlMs Time-to-live in milliseconds (default 5 minutes)
   */
  set(sessionId: string, frameId: string, manifest: SafeElementManifest[], ttlMs = 5 * 60 * 1000): void {
    const key = this.generateKey(sessionId, frameId);

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.memoryUsed -= oldEntry.size;
    }

    const size = this.estimateSize(manifest);
    const now = Date.now();

    const entry: ManifestCacheEntry<SafeElementManifest[]> = {
      value: manifest,
      expiresAt: now + ttlMs,
      size,
      hitCount: 0,
      createdAt: now,
      lastAccessedAt: now,
    };

    this.cache.set(key, entry);
    this.lru.register(key);
    this.memoryUsed += size;

    // Enforce capacity limits
    this.enforceCapacity();
  }

  /**
   * Prefetch next expected manifests for a delegation
   * This is a no-op in this implementation (delegates would implement actual prefetch logic)
   * @param agentId Agent identifier
   * @param delegationId Delegation identifier
   */
  async prefetchNextManifests(agentId: string, delegationId: string): Promise<void> {
    // Placeholder for prefetch strategy
    // In a real implementation, this would:
    // 1. Query delegation for next 5 expected commands
    // 2. Fetch their manifests from database
    // 3. Pre-populate cache with 5-minute TTL
    // This runs as a background task, non-blocking
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hitCount + this.stats.missCount;
    const hitRate = total > 0 ? Math.round((this.stats.hitCount / total) * 100) : 0;
    const avgEntrySize =
      this.cache.size > 0 ? Math.round(this.memoryUsed / this.cache.size) : 0;
    const avgLatency =
      this.stats.latencyCount > 0
        ? Math.round((this.stats.totalLatency / this.stats.latencyCount) * 100) / 100
        : 0;

    return {
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      evictionCount: this.stats.evictionCount,
      memoryUsed: this.memoryUsed,
      entriesCount: this.cache.size,
      hitRate,
      avgEntrySize,
      avgLatency,
      expirationEvictions: this.stats.expirationEvictions,
    };
  }

  /**
   * Clear all cached entries and reset statistics
   */
  clear(): void {
    this.cache.clear();
    this.lru.clear();
    this.memoryUsed = 0;
    this.stats = {
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      expirationEvictions: 0,
      totalLatency: 0,
      latencyCount: 0,
    };
  }

  /**
   * Get cache size (number of entries)
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get memory usage in bytes
   */
  getMemoryUsage(): number {
    return this.memoryUsed;
  }

  /**
   * Remove a specific entry
   */
  delete(sessionId: string, frameId: string): boolean {
    const key = this.generateKey(sessionId, frameId);
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.lru.remove(key);
      this.memoryUsed -= entry.size;
      return true;
    }
    return false;
  }
}

// Global manifest cache instance (per process/instance)
export const manifestCache = new ManifestCache();
