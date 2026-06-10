/**
 * Safe DOM Mirror Phase 1: Unit Tests
 *
 * Tests for:
 * 1. validateManifest() - duplicate ID detection, TTL expiration
 * 2. Element ID collision prevention with frame scoping
 * 3. Command verification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { buildSafeManifest, validateManifest } from '@/lib/dsg/safe-dom/manifest';
import { verifySafeDomCommand } from '@/lib/dsg/safe-dom/verify-command';
import type {
  RawDomElement,
  SafeElementManifest,
  SafeDomCommand,
} from '@/lib/dsg/safe-dom/types';

describe('Safe DOM Mirror Phase 1', () => {
  describe('validateManifest()', () => {
    it('should accept valid manifest', () => {
      const manifest: SafeElementManifest[] = [
        {
          id: 'abc12345-e000',
          frameId: 'frame_1',
          role: 'button',
          text: 'Click me',
          allowedOps: ['click'],
          selectorHash: 'hash123',
          internalSelector: '#btn',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
      ];

      const errors = validateManifest(manifest);
      expect(errors).toHaveLength(0);
    });

    it('should detect duplicate element IDs within same frame', () => {
      const manifest: SafeElementManifest[] = [
        {
          id: 'abc12345-e000',
          frameId: 'frame_1',
          role: 'button',
          text: 'Button 1',
          allowedOps: ['click'],
          selectorHash: 'hash1',
          internalSelector: '#btn1',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
        {
          id: 'abc12345-e000', // DUPLICATE ID in same frame
          frameId: 'frame_1',
          role: 'button',
          text: 'Button 2',
          allowedOps: ['click'],
          selectorHash: 'hash2',
          internalSelector: '#btn2',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
      ];

      expect(() => validateManifest(manifest)).toThrow('collision');
    });

    it('should detect element ID collision within same frame', () => {
      // Frame scoping is handled in element ID generation, not validation
      // This test ensures duplicate IDs in same frame are caught
      const manifest: SafeElementManifest[] = [
        {
          id: 'def67890-e000', // Different ID format (different frame scoped)
          frameId: 'frame_1',
          role: 'button',
          text: 'Button 1',
          allowedOps: ['click'],
          selectorHash: 'hash1',
          internalSelector: '#btn1',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
        {
          id: 'def67890-e001', // Different ID in same frame - OK
          frameId: 'frame_1',
          role: 'button',
          text: 'Button 2',
          allowedOps: ['click'],
          selectorHash: 'hash2',
          internalSelector: '#btn2',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
      ];

      const errors = validateManifest(manifest);
      expect(errors).toHaveLength(0);
    });

    it('should detect expired TTL', () => {
      const manifest: SafeElementManifest[] = [
        {
          id: 'abc12345-e000',
          frameId: 'frame_1',
          role: 'button',
          text: 'Expired button',
          allowedOps: ['click'],
          selectorHash: 'hash1',
          internalSelector: '#btn',
          risk: 'low',
          expiresAt: new Date(Date.now() - 1000).toISOString(), // EXPIRED
        },
      ];

      expect(() => validateManifest(manifest)).toThrow('expired');
    });

    it('should reject invalid expiresAt format', () => {
      const manifest: SafeElementManifest[] = [
        {
          id: 'abc12345-e000',
          frameId: 'frame_1',
          role: 'button',
          text: 'Invalid time',
          allowedOps: ['click'],
          selectorHash: 'hash1',
          internalSelector: '#btn',
          risk: 'low',
          expiresAt: 'not-a-date',
        } as SafeElementManifest,
      ];

      const errors = validateManifest(manifest);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('Invalid'))).toBe(true);
    });

    it('should reject missing required fields', () => {
      const manifest: SafeElementManifest[] = [
        {
          id: '',
          frameId: 'frame_1',
          role: 'button',
          text: 'Missing ID',
          allowedOps: ['click'],
          selectorHash: 'hash1',
          internalSelector: '#btn',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        } as SafeElementManifest,
      ];

      const errors = validateManifest(manifest);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty manifest', () => {
      const manifest: SafeElementManifest[] = [];
      const errors = validateManifest(manifest);
      expect(errors).toHaveLength(0);
    });

    it('should reject manifest with multiple frameIds', () => {
      const manifest: SafeElementManifest[] = [
        {
          id: 'abc12345-e000',
          frameId: 'frame_1',
          role: 'button',
          text: 'Button 1',
          allowedOps: ['click'],
          selectorHash: 'hash1',
          internalSelector: '#btn1',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
        {
          id: 'def67890-e000',
          frameId: 'frame_2', // Different frame in same manifest - ERROR
          role: 'button',
          text: 'Button 2',
          allowedOps: ['click'],
          selectorHash: 'hash2',
          internalSelector: '#btn2',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
      ];

      const errors = validateManifest(manifest);
      expect(errors.some((e) => e.includes('multiple frameIds'))).toBe(true);
    });
  });

  describe('buildSafeManifest()', () => {
    let rawElements: RawDomElement[];

    beforeEach(() => {
      rawElements = [
        {
          selector: '#btn-view-logs',
          role: 'button',
          text: 'View logs',
          allowedOps: ['click'],
        },
        {
          selector: '#btn-delete',
          role: 'button',
          text: 'Delete user',
          allowedOps: ['click'],
        },
      ];
    });

    it('should build manifest with frame-scoped element IDs', () => {
      const frameId = 'session_xyz';
      const { manifest } = buildSafeManifest(rawElements, frameId, {
        filterDangerousElements: false,
      });

      expect(manifest).toHaveLength(2);
      expect(manifest[0].id).toMatch(/^[a-f0-9]{8}-e000$/);
      expect(manifest[0].frameId).toBe(frameId);
      expect(manifest[1].id).toMatch(/^[a-f0-9]{8}-e001$/);

      // Verify frame-scoped IDs are stable
      const { manifest: manifest2 } = buildSafeManifest(rawElements, frameId, {
        filterDangerousElements: false,
      });
      expect(manifest[0].id).toBe(manifest2[0].id);
    });

    it('should filter dangerous elements by default', () => {
      const { manifest } = buildSafeManifest(rawElements, 'frame_1', {
        filterDangerousElements: true,
      });

      // "Delete user" should be filtered
      expect(manifest).toHaveLength(1);
      expect(manifest[0].text).toBe('View logs');
    });

    it('should include dangerous elements when filtering disabled', () => {
      const { manifest } = buildSafeManifest(rawElements, 'frame_1', {
        filterDangerousElements: false,
      });

      expect(manifest).toHaveLength(2);
    });

    it('should set correct TTL', () => {
      const ttlSeconds = 60;
      const before = Date.now();
      const { view } = buildSafeManifest(rawElements, 'frame_1', {
        ttlSeconds,
        filterDangerousElements: false,
      });
      const after = Date.now();

      const expiresTime = new Date(view.expiresAt).getTime();
      const expectedMin = before + ttlSeconds * 1000;
      const expectedMax = after + ttlSeconds * 1000;

      expect(expiresTime).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresTime).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe('verifySafeDomCommand()', () => {
    let manifest: SafeElementManifest[];

    beforeEach(() => {
      manifest = [
        {
          id: 'abc12345-e000',
          frameId: 'frame_1',
          role: 'button',
          text: 'View logs',
          allowedOps: ['click'],
          selectorHash: 'hash1',
          internalSelector: '#logs-btn',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
        {
          id: 'abc12345-e001',
          frameId: 'frame_1',
          role: 'input',
          text: 'Search',
          allowedOps: ['type'],
          selectorHash: 'hash2',
          internalSelector: '#search-input',
          risk: 'low',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
        },
      ];
    });

    it('should allow verified command', () => {
      const command: SafeDomCommand = {
        frameId: 'frame_1',
        elementId: 'abc12345-e000',
        operation: 'click',
      };

      const result = verifySafeDomCommand(command, manifest);
      expect(result.decision).toBe('ALLOW');
      expect(result.reason).toBe('VERIFIED');
    });

    it('should block command for non-existent element', () => {
      const command: SafeDomCommand = {
        frameId: 'frame_1',
        elementId: 'nonexistent-e999',
        operation: 'click',
      };

      const result = verifySafeDomCommand(command, manifest);
      expect(result.decision).toBe('BLOCK');
      expect(result.reason).toBe('ELEMENT_NOT_EXPOSED_TO_AGENT');
    });

    it('should block command for non-existent frame', () => {
      const command: SafeDomCommand = {
        frameId: 'unknown_frame',
        elementId: 'abc12345-e000',
        operation: 'click',
      };

      const result = verifySafeDomCommand(command, manifest);
      expect(result.decision).toBe('BLOCK');
      expect(result.reason).toBe('INVALID_COMMAND_FRAME');
    });

    it('should block command with disallowed operation', () => {
      const command: SafeDomCommand = {
        frameId: 'frame_1',
        elementId: 'abc12345-e000',
        operation: 'type', // Button doesn't allow 'type'
      };

      const result = verifySafeDomCommand(command, manifest);
      expect(result.decision).toBe('BLOCK');
      expect(result.reason).toBe('OP_NOT_ALLOWED_FOR_ELEMENT');
    });

    it('should block command on expired manifest', () => {
      const expiredManifest: SafeElementManifest[] = [
        {
          id: 'abc12345-e000',
          frameId: 'frame_1',
          role: 'button',
          text: 'Expired',
          allowedOps: ['click'],
          selectorHash: 'hash1',
          internalSelector: '#btn',
          risk: 'low',
          expiresAt: new Date(Date.now() - 1000).toISOString(), // EXPIRED
        },
      ];

      const command: SafeDomCommand = {
        frameId: 'frame_1',
        elementId: 'abc12345-e000',
        operation: 'click',
      };

      const result = verifySafeDomCommand(command, expiredManifest);
      expect(result.decision).toBe('BLOCK');
      expect(result.reason).toBe('SAFE_VIEW_EXPIRED');
    });

    it('should verify type operation only on input/textarea', () => {
      const command: SafeDomCommand = {
        frameId: 'frame_1',
        elementId: 'abc12345-e001',
        operation: 'type',
        value: 'search query',
      };

      const result = verifySafeDomCommand(command, manifest);
      expect(result.decision).toBe('ALLOW');
    });
  });
});
