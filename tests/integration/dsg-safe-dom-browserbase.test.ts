import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  captureLiveDOM,
  persistManifest,
  verifySafeDomIntentOrFail,
  executeVerifiedCommand,
  buildAndPersistManifest,
  type SafeDomCommand,
} from '../../lib/executors/browserbase-safe-dom-integration';

const mockSupabaseData: Record<string, Record<string, any>> = {};

vi.mock('../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table !== 'safe_dom_manifests') {
        throw new Error(`unexpected_table:${table}`);
      }

      return {
        insert: (row: Record<string, any>) => {
          const id = `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
          mockSupabaseData[id] = {
            id,
            ...row,
            created_at: row.created_at ?? new Date().toISOString(),
          };
          return {
            select: () => ({
              single: async () => ({ data: mockSupabaseData[id], error: null }),
            }),
          };
        },
        select: () => ({
          eq: (column: string, value: string) => ({
            eq: (column2: string, value2: string) => ({
              single: async () => {
                const record = Object.values(mockSupabaseData).find(
                  (item) => item[column] === value && item[column2] === value2,
                );
                return record
                  ? { data: record, error: null }
                  : { data: null, error: { message: 'Not found' } };
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
    Object.keys(mockSupabaseData).forEach((key) => delete mockSupabaseData[key]);
    process.env.BROWSERBASE_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.BROWSERBASE_API_KEY;
  });

  describe('captureLiveDOM', () => {
    it('fails closed instead of fabricating Browserbase DOM data', async () => {
      await expect(captureLiveDOM(testSessionId)).rejects.toThrow(
        'BROWSERBASE_SAFE_DOM_CAPTURE_NOT_IMPLEMENTED',
      );
    });

    it('fails closed when the Browserbase API key is missing', async () => {
      delete process.env.BROWSERBASE_API_KEY;

      await expect(captureLiveDOM(testSessionId)).rejects.toThrow(
        'BROWSERBASE_API_KEY_NOT_CONFIGURED',
      );
    });
  });

  describe('persistManifest', () => {
    it('persists a supplied verified manifest to the database', async () => {
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

    it('sets the default expiration to about five minutes', async () => {
      const manifestId = await persistManifest(
        testSessionId,
        testFrameId,
        testFrameUrl,
        [
          {
            tagName: 'button',
            id: 'test-btn',
            className: '',
            path: 'button#test-btn',
            allowedInteractions: ['click'],
            safe: true,
          },
        ],
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
      await persistManifest(
        testSessionId,
        testFrameId,
        testFrameUrl,
        [
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
        ],
        testOrgId,
      );
    });

    it('verifies an allowed click action', async () => {
      const command: SafeDomCommand = { elementId: 'submit-btn', action: 'click' };
      const manifest = await verifySafeDomIntentOrFail(testSessionId, testFrameId, command);
      expect(manifest.sessionId).toBe(testSessionId);
    });

    it('verifies an allowed type action', async () => {
      const command: SafeDomCommand = {
        elementId: 'username-field',
        action: 'type',
        value: 'testuser',
      };
      const manifest = await verifySafeDomIntentOrFail(testSessionId, testFrameId, command);
      expect(manifest.sessionId).toBe(testSessionId);
    });

    it('blocks a disallowed action', async () => {
      const command: SafeDomCommand = { elementId: 'submit-btn', action: 'type' };
      await expect(verifySafeDomIntentOrFail(testSessionId, testFrameId, command)).rejects.toThrow(
        'not allowed',
      );
    });

    it('rejects an unknown element ID', async () => {
      const command: SafeDomCommand = { elementId: 'unknown-elem', action: 'click' };
      await expect(verifySafeDomIntentOrFail(testSessionId, testFrameId, command)).rejects.toThrow(
        'not found',
      );
    });

    it('rejects an expired manifest', async () => {
      const expiredSessionId = 'session-expired-001';
      const manifestId = await persistManifest(
        expiredSessionId,
        testFrameId,
        testFrameUrl,
        [
          {
            tagName: 'button',
            id: 'expired-btn',
            className: '',
            path: 'button#expired-btn',
            allowedInteractions: ['click'],
            safe: true,
          },
        ],
        testOrgId,
      );
      mockSupabaseData[manifestId].expires_at = new Date(Date.now() - 60_000).toISOString();

      await expect(
        verifySafeDomIntentOrFail(expiredSessionId, testFrameId, {
          elementId: 'expired-btn',
          action: 'click',
        }),
      ).rejects.toThrow('expired');
    });

    it('rejects a manifest from a different frame', async () => {
      await expect(
        verifySafeDomIntentOrFail(testSessionId, 'wrong-frame-id', {
          elementId: 'submit-btn',
          action: 'click',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('executeVerifiedCommand', () => {
    it('fails closed instead of fabricating Browserbase execution success', async () => {
      await expect(
        executeVerifiedCommand(testSessionId, { elementId: 'submit-btn', action: 'click' }),
      ).rejects.toThrow('BROWSERBASE_SAFE_DOM_EXECUTOR_NOT_IMPLEMENTED');
    });

    it('fails closed when the Browserbase API key is missing', async () => {
      delete process.env.BROWSERBASE_API_KEY;

      await expect(
        executeVerifiedCommand(testSessionId, { elementId: 'submit-btn', action: 'click' }),
      ).rejects.toThrow('BROWSERBASE_API_KEY_NOT_CONFIGURED');
    });
  });

  describe('buildAndPersistManifest', () => {
    it('does not persist a manifest when live DOM capture is unavailable', async () => {
      await expect(
        buildAndPersistManifest(testSessionId, testFrameUrl, testFrameId, testOrgId),
      ).rejects.toThrow('BROWSERBASE_SAFE_DOM_CAPTURE_NOT_IMPLEMENTED');

      expect(Object.keys(mockSupabaseData)).toHaveLength(0);
    });
  });

  describe('Cross-session tampering protection', () => {
    it('prevents commands from using another session manifest', async () => {
      await persistManifest(
        'session-a',
        testFrameId,
        testFrameUrl,
        [
          {
            tagName: 'button',
            id: 'btn-1',
            className: '',
            path: 'button#btn-1',
            allowedInteractions: ['click'],
            safe: true,
          },
        ],
        testOrgId,
      );

      await expect(
        verifySafeDomIntentOrFail('session-b', testFrameId, {
          elementId: 'btn-1',
          action: 'click',
        }),
      ).rejects.toThrow('not found');
    });

    it('tracks unique session/frame combinations', async () => {
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

      const command: SafeDomCommand = { elementId: 'shared-btn-id', action: 'click' };
      const manifest1 = await verifySafeDomIntentOrFail(testSessionId, 'frame-1', command);
      const manifest2 = await verifySafeDomIntentOrFail(testSessionId, 'frame-2', command);
      expect(manifest1.frameId).toBe('frame-1');
      expect(manifest2.frameId).toBe('frame-2');
    });
  });
});
