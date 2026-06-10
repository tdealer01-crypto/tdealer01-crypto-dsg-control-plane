import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  captureLiveDOM,
  persistManifest,
  verifySafeDomIntentOrFail,
  executeVerifiedCommand,
  buildAndPersistManifest,
  type RawDomElement,
  type SafeDomCommand,
  type SafeDomManifest,
} from '../../lib/executors/browserbase-safe-dom-integration';

// Mock Supabase client
const mockSupabaseData: Record<string, Record<string, any>> = {};

vi.mock('../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== 'safe_dom_manifests') {
        throw new Error(`unexpected_table:${table}`);
      }

      return {
        insert: (row: Record<string, any>) => {
          const id = `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          mockSupabaseData[id] = {
            id,
            ...row,
            created_at: row.created_at ?? new Date().toISOString(),
          };
          return {
            select: (fields: string) => ({
              single: async () => {
                return {
                  data: mockSupabaseData[id],
                  error: null,
                };
              },
            }),
          };
        },
        select: (fields: string) => ({
          eq: (column: string, value: string) => ({
            eq: (column2: string, value2: string) => ({
              single: async () => {
                // Find the first matching record with both conditions
                const record = Object.values(mockSupabaseData).find(
                  (r) => r[column] === value && r[column2] === value2,
                );
                if (!record) {
                  return {
                    data: null,
                    error: { message: 'Not found' },
                  };
                }
                return {
                  data: record,
                  error: null,
                };
              },
            }),
          }),
        }),
      };
    },
  }),
}));

describe('Safe DOM Browserbase Integration', () => {
  const testSessionId = 'session-test-001';
  const testFrameId = 'frame-test-001';
  const testFrameUrl = 'https://example.com/form';
  const testOrgId = 'org-test-001';

  beforeEach(() => {
    // Clear mock data
    Object.keys(mockSupabaseData).forEach((key) => delete mockSupabaseData[key]);
    // Set API key for tests
    process.env.BROWSERBASE_API_KEY = 'test-key';
  });

  afterEach(() => {
    // Clean up
    delete process.env.BROWSERBASE_API_KEY;
  });

  describe('captureLiveDOM', () => {
    it('should capture DOM structure from Browserbase', async () => {
      const dom = await captureLiveDOM(testSessionId);

      expect(dom).toBeInstanceOf(Array);
      expect(dom.length).toBeGreaterThan(0);
      expect(dom[0].tagName).toBe('html');
    });

    it('should throw error when API key is missing', async () => {
      const original = process.env.BROWSERBASE_API_KEY;
      delete process.env.BROWSERBASE_API_KEY;

      await expect(captureLiveDOM(testSessionId)).rejects.toThrow('Browserbase API key not configured');

      process.env.BROWSERBASE_API_KEY = original;
    });
  });

  describe('persistManifest', () => {
    it('should persist manifest to database', async () => {
      const elements = [
        {
          tagName: 'button',
          id: 'submit-btn',
          className: 'btn',
          path: 'button#submit-btn.btn',
          allowedInteractions: ['click'],
          safe: true,
        },
      ];

      const manifestId = await persistManifest(
        testSessionId,
        testFrameId,
        testFrameUrl,
        elements,
        testOrgId,
      );

      expect(manifestId).toBeDefined();
      expect(mockSupabaseData[manifestId]).toBeDefined();
      expect(mockSupabaseData[manifestId].session_id).toBe(testSessionId);
      expect(mockSupabaseData[manifestId].frame_id).toBe(testFrameId);
    });

    it('should set default expiration to 5 minutes', async () => {
      const elements = [
        {
          tagName: 'button',
          id: 'test-btn',
          className: '',
          path: 'button#test-btn',
          allowedInteractions: ['click'],
          safe: true,
        },
      ];

      const manifestId = await persistManifest(
        testSessionId,
        testFrameId,
        testFrameUrl,
        elements,
        testOrgId,
      );

      const record = mockSupabaseData[manifestId];
      const expiresAt = new Date(record.expires_at);
      const createdAt = new Date(record.created_at);
      const diffMinutes = (expiresAt.getTime() - createdAt.getTime()) / (1000 * 60);

      expect(diffMinutes).toBeGreaterThanOrEqual(4.9);
      expect(diffMinutes).toBeLessThanOrEqual(5.1);
    });
  });

  describe('verifySafeDomIntentOrFail', () => {
    beforeEach(async () => {
      const elements = [
        {
          tagName: 'button',
          id: 'submit-btn',
          className: 'btn primary',
          path: 'div#root.container > button#submit-btn.btn',
          allowedInteractions: ['click'],
          safe: true,
        },
        {
          tagName: 'input',
          id: 'username-field',
          className: 'form-control',
          path: 'div#root.container > input#username-field',
          allowedInteractions: ['type'],
          safe: true,
        },
      ];

      await persistManifest(
        testSessionId,
        testFrameId,
        testFrameUrl,
        elements,
        testOrgId,
      );
    });

    it('should verify allowed click action on button', async () => {
      const command: SafeDomCommand = {
        elementId: 'submit-btn',
        action: 'click',
      };

      const manifest = await verifySafeDomIntentOrFail(testSessionId, testFrameId, command);

      expect(manifest).toBeDefined();
      expect(manifest.sessionId).toBe(testSessionId);
    });

    it('should verify allowed type action on input', async () => {
      const command: SafeDomCommand = {
        elementId: 'username-field',
        action: 'type',
        value: 'testuser',
      };

      const manifest = await verifySafeDomIntentOrFail(testSessionId, testFrameId, command);

      expect(manifest).toBeDefined();
      expect(manifest.sessionId).toBe(testSessionId);
    });

    it('should block disallowed action on element', async () => {
      const command: SafeDomCommand = {
        elementId: 'submit-btn',
        action: 'type', // type is not allowed on button
      };

      await expect(verifySafeDomIntentOrFail(testSessionId, testFrameId, command)).rejects.toThrow(
        'not allowed',
      );
    });

    it('should reject unknown element ID', async () => {
      const command: SafeDomCommand = {
        elementId: 'unknown-elem',
        action: 'click',
      };

      await expect(verifySafeDomIntentOrFail(testSessionId, testFrameId, command)).rejects.toThrow(
        'not found',
      );
    });

    it('should reject expired manifest', async () => {
      // Create an expired manifest
      const elements = [
        {
          tagName: 'button',
          id: 'expired-btn',
          className: '',
          path: 'button#expired-btn',
          allowedInteractions: ['click'],
          safe: true,
        },
      ];

      const testExpiredSessionId = 'session-expired-001';
      const manifestId = await persistManifest(
        testExpiredSessionId,
        testFrameId,
        testFrameUrl,
        elements,
        testOrgId,
      );

      // Manually set expires_at to the past
      const record = mockSupabaseData[manifestId];
      record.expires_at = new Date(Date.now() - 60000).toISOString(); // 1 minute ago

      const command: SafeDomCommand = {
        elementId: 'expired-btn',
        action: 'click',
      };

      await expect(verifySafeDomIntentOrFail(testExpiredSessionId, testFrameId, command)).rejects.toThrow(
        'expired',
      );
    });

    it('should reject manifest for different frame ID', async () => {
      const command: SafeDomCommand = {
        elementId: 'submit-btn',
        action: 'click',
      };

      await expect(verifySafeDomIntentOrFail(testSessionId, 'wrong-frame-id', command)).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('executeVerifiedCommand', () => {
    it('should execute verified command through Browserbase', async () => {
      const command: SafeDomCommand = {
        elementId: 'submit-btn',
        action: 'click',
      };

      const result = await executeVerifiedCommand(testSessionId, command);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.sessionId).toBe(testSessionId);
      expect(result.command).toEqual(command);
      expect(result.executedAt).toBeDefined();
    });

    it('should throw error when API key is missing', async () => {
      const original = process.env.BROWSERBASE_API_KEY;
      delete process.env.BROWSERBASE_API_KEY;

      const command: SafeDomCommand = {
        elementId: 'submit-btn',
        action: 'click',
      };

      await expect(executeVerifiedCommand(testSessionId, command)).rejects.toThrow(
        'Browserbase API key not configured',
      );

      process.env.BROWSERBASE_API_KEY = original;
    });
  });

  describe('buildAndPersistManifest', () => {
    it('should build and persist manifest end-to-end', async () => {
      const manifest = await buildAndPersistManifest(
        testSessionId,
        testFrameUrl,
        testFrameId,
        testOrgId,
      );

      expect(manifest).toBeDefined();
      expect(manifest.sessionId).toBe(testSessionId);
      expect(manifest.frameId).toBe(testFrameId);
      expect(manifest.frameUrl).toBe(testFrameUrl);
      expect(manifest.elements).toBeInstanceOf(Array);
      expect(manifest.elements.length).toBeGreaterThan(0);
      expect(manifest.createdAt).toBeDefined();
      expect(manifest.expiresAt).toBeDefined();
    });

    it('should extract clickable elements from DOM', async () => {
      const manifest = await buildAndPersistManifest(
        testSessionId,
        testFrameUrl,
        testFrameId,
        testOrgId,
      );

      // Should have at least the submit button
      const clickableElements = manifest.elements.filter((elem) =>
        elem.allowedInteractions.includes('click'),
      );

      expect(clickableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Cross-session tampering protection', () => {
    it('should prevent executing commands from different session', async () => {
      const elements = [
        {
          tagName: 'button',
          id: 'btn-1',
          className: '',
          path: 'button#btn-1',
          allowedInteractions: ['click'],
          safe: true,
        },
      ];

      // Create manifest for session A
      await persistManifest(
        'session-a',
        testFrameId,
        testFrameUrl,
        elements,
        testOrgId,
      );

      // Try to execute command against session B
      const command: SafeDomCommand = {
        elementId: 'btn-1',
        action: 'click',
      };

      await expect(verifySafeDomIntentOrFail('session-b', testFrameId, command)).rejects.toThrow(
        'not found',
      );
    });

    it('should track unique session/frame combinations', async () => {
      const elements = [
        {
          tagName: 'button',
          id: 'shared-btn-id',
          className: '',
          path: 'button#shared-btn-id',
          allowedInteractions: ['click'],
          safe: true,
        },
      ];

      // Create two separate manifests with same button ID but different frames
      const id1 = await persistManifest(
        testSessionId,
        'frame-1',
        'https://example.com/1',
        elements,
        testOrgId,
      );

      const id2 = await persistManifest(
        testSessionId,
        'frame-2',
        'https://example.com/2',
        elements,
        testOrgId,
      );

      expect(id1).not.toBe(id2);

      // Verify they are retrievable separately
      const command: SafeDomCommand = {
        elementId: 'shared-btn-id',
        action: 'click',
      };

      const manifest1 = await verifySafeDomIntentOrFail(testSessionId, 'frame-1', command);
      const manifest2 = await verifySafeDomIntentOrFail(testSessionId, 'frame-2', command);

      expect(manifest1.frameId).toBe('frame-1');
      expect(manifest2.frameId).toBe('frame-2');
    });
  });
});
