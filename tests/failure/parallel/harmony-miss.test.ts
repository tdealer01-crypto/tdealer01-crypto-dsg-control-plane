import { describe, it, expect, beforeEach } from 'vitest';
import { HarmonyEngine } from '@/lib/parallel/harmony-engine';
import type { SafeDomCommand } from '@/lib/dsg/safe-dom/types';

describe('Harmony Engine - Miss Handling', () => {
  let harmony: HarmonyEngine;

  beforeEach(() => {
    harmony = new HarmonyEngine();
    harmony.clear();
  });

  describe('manifest miss scenarios', () => {
    it('should return null when no heuristic or embedding match', () => {
      const cmd: SafeDomCommand = {
        frameId: 'unknown-frame',
        elementId: 'unknown-element',
        operation: 'click'
      };

      const result = harmony.findBestMatch(cmd);

      expect(result.manifest).toBeNull();
      expect(result.source).toBe('miss');
    });

    it('should handle empty index gracefully', () => {
      const cmd: SafeDomCommand = {
        frameId: 'f1',
        elementId: 'e1',
        operation: 'click'
      };

      const result = harmony.findBestMatch(cmd);

      expect(result.manifest).toBeNull();
      expect(result.latency).toBeGreaterThanOrEqual(0);
    });

    it('should miss on low similarity embedding match', () => {
      // Add a click command
      const cmd1: SafeDomCommand = {
        frameId: 'f1',
        elementId: 'e1',
        operation: 'click',
        value: 'submit'
      };
      const manifest1 = [{ selector: 'button.submit', text: 'Submit' }];

      harmony.addToIndex(cmd1, manifest1, 'contract-1');

      // Query with completely different operation
      const cmd2: SafeDomCommand = {
        frameId: 'f2',
        elementId: 'e2',
        operation: 'press',
        value: 'Escape'
      };

      const result = harmony.findBestMatch(cmd2);

      // Should miss since similarity is below threshold
      expect(result.source).toBe('miss');
      expect(result.manifest).toBeNull();
    });

    it('should track miss stats', () => {
      const cmd: SafeDomCommand = {
        frameId: 'missing',
        elementId: 'missing',
        operation: 'click'
      };

      for (let i = 0; i < 5; i++) {
        harmony.findBestMatch(cmd);
      }

      const stats = harmony.getStats();
      expect(stats.misses).toBe(5);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('graceful degradation', () => {
    it('should default to BLOCK decision on miss', () => {
      const cmd: SafeDomCommand = {
        frameId: 'unknown',
        elementId: 'unknown',
        operation: 'click'
      };

      const result = harmony.findBestMatch(cmd);

      // On miss, caller should block
      expect(result.manifest).toBeNull();
      // Safety principle: miss = block
    });

    it('should still return metadata on miss', () => {
      const cmd: SafeDomCommand = {
        frameId: 'f1',
        elementId: 'e1',
        operation: 'click'
      };

      const result = harmony.findBestMatch(cmd);

      expect(result).toHaveProperty('latency');
      expect(result).toHaveProperty('source');
      expect(result.source).toBe('miss');
    });
  });
});
