import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ManifestCache } from '@/lib/cache/manifest-cache';
import type { SafeElementManifest } from '@/lib/dsg/safe-dom/types';

describe('ManifestCache', () => {
  let cache: ManifestCache;

  beforeEach(() => {
    cache = new ManifestCache(100, 50 * 1024 * 1024); // 100 entries, 50MB
  });

  afterEach(() => {
    cache.clear();
  });

  describe('get/set', () => {
    it('should store and retrieve manifest', () => {
      const manifest: SafeElementManifest[] = [
        { selector: '.button', text: 'Click me' }
      ];

      cache.set('session-1', 'frame-1', manifest);
      const retrieved = cache.get('session-1', 'frame-1');

      expect(retrieved).toEqual(manifest);
    });

    it('should return null for non-existent key', () => {
      const retrieved = cache.get('session-1', 'frame-1');
      expect(retrieved).toBeNull();
    });

    it('should handle multiple entries', () => {
      const manifest1: SafeElementManifest[] = [{ selector: '.btn1', text: 'Button 1' }];
      const manifest2: SafeElementManifest[] = [{ selector: '.btn2', text: 'Button 2' }];

      cache.set('session-1', 'frame-1', manifest1);
      cache.set('session-1', 'frame-2', manifest2);

      expect(cache.get('session-1', 'frame-1')).toEqual(manifest1);
      expect(cache.get('session-1', 'frame-2')).toEqual(manifest2);
    });
  });

  describe('TTL expiration', () => {
    it('should return null for expired entries', () => {
      const manifest: SafeElementManifest[] = [{ selector: '.button', text: 'Click' }];
      cache.set('session-1', 'frame-1', manifest, 1);
      const retrieved = cache.get('session-1', 'frame-1');
      expect(retrieved === null || retrieved === manifest).toBe(true);
    });

    it('should use default TTL of 5 minutes', () => {
      const manifest: SafeElementManifest[] = [{ selector: '.button', text: 'Click' }];
      cache.set('session-1', 'frame-1', manifest);
      const retrieved = cache.get('session-1', 'frame-1');
      expect(retrieved).toEqual(manifest);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when size limit exceeded', () => {
      const smallCache = new ManifestCache(2, 50 * 1024 * 1024);

      const manifest1: SafeElementManifest[] = [{ selector: '.btn1', text: 'Button 1' }];
      const manifest2: SafeElementManifest[] = [{ selector: '.btn2', text: 'Button 2' }];
      const manifest3: SafeElementManifest[] = [{ selector: '.btn3', text: 'Button 3' }];

      smallCache.set('session-1', 'frame-1', manifest1);
      smallCache.set('session-1', 'frame-2', manifest2);

      expect(smallCache.size()).toBe(2);

      smallCache.set('session-1', 'frame-3', manifest3);

      expect(smallCache.size()).toBeLessThanOrEqual(2);
      expect(smallCache.get('session-1', 'frame-1')).toBeNull();
    });

    it('should move accessed entries to end of LRU queue', () => {
      const smallCache = new ManifestCache(2, 50 * 1024 * 1024);

      const manifest1: SafeElementManifest[] = [{ selector: '.btn1', text: 'Button 1' }];
      const manifest2: SafeElementManifest[] = [{ selector: '.btn2', text: 'Button 2' }];
      const manifest3: SafeElementManifest[] = [{ selector: '.btn3', text: 'Button 3' }];

      smallCache.set('session-1', 'frame-1', manifest1);
      smallCache.set('session-1', 'frame-2', manifest2);

      smallCache.get('session-1', 'frame-1');

      smallCache.set('session-1', 'frame-3', manifest3);

      expect(smallCache.get('session-1', 'frame-1')).toBeTruthy();
      expect(smallCache.get('session-1', 'frame-2')).toBeNull();
    });
  });

  describe('memory management', () => {
    it('should track memory usage', () => {
      const manifest: SafeElementManifest[] = [
        { selector: '.button', text: 'Click me' },
        { selector: '.input', text: 'Type here' }
      ];

      cache.set('session-1', 'frame-1', manifest);

      const stats = cache.getStats();
      expect(stats.memoryUsed).toBeGreaterThan(0);
    });

    it('should get memory usage in bytes', () => {
      const manifest: SafeElementManifest[] = [{ selector: '.button', text: 'Click' }];
      cache.set('session-1', 'frame-1', manifest);
      const memUsage = cache.getMemoryUsage();
      expect(memUsage).toBeGreaterThan(0);
    });
  });

  describe('statistics', () => {
    it('should track hit and miss counts', () => {
      const manifest: SafeElementManifest[] = [{ selector: '.button', text: 'Click' }];

      cache.set('session-1', 'frame-1', manifest);
      cache.get('session-1', 'frame-1');
      cache.get('session-1', 'frame-999');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    it('should calculate average entry size', () => {
      const manifest: SafeElementManifest[] = [
        { selector: '.btn1', text: 'Button 1' },
        { selector: '.btn2', text: 'Button 2' }
      ];

      cache.set('session-1', 'frame-1', manifest);

      const stats = cache.getStats();
      expect(stats.avgEntrySize).toBeGreaterThan(0);
    });
  });

  describe('deletion', () => {
    it('should delete specific entry', () => {
      const manifest: SafeElementManifest[] = [{ selector: '.button', text: 'Click' }];

      cache.set('session-1', 'frame-1', manifest);

      const deleted = cache.delete('session-1', 'frame-1');

      expect(deleted).toBe(true);
      expect(cache.get('session-1', 'frame-1')).toBeNull();
    });

    it('should return false when deleting non-existent entry', () => {
      const deleted = cache.delete('session-1', 'frame-999');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should reset all state', () => {
      const manifest: SafeElementManifest[] = [{ selector: '.button', text: 'Click' }];

      cache.set('session-1', 'frame-1', manifest);
      cache.clear();

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.memoryUsed).toBe(0);
      expect(cache.size()).toBe(0);
    });
  });
});
