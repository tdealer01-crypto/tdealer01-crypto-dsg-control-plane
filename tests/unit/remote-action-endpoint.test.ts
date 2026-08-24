import { afterEach, describe, expect, it, vi } from 'vitest';
import { openRemoteEndpoint, sealRemoteEndpoint } from '@/lib/remote-action/crypto';
import { relayRemoteAction, validateRemoteEndpoint } from '@/lib/remote-action/relay';

describe('Remote Action Endpoint', () => {
  const previousKey = process.env.REMOTE_ACTION_ENDPOINT_KEY;
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.REMOTE_ACTION_ENDPOINT_KEY;
    else process.env.REMOTE_ACTION_ENDPOINT_KEY = previousKey;
    process.env.NODE_ENV = previousNodeEnv;
    vi.restoreAllMocks();
  });

  it('encrypts endpoint URLs at rest and decrypts them for relay only', () => {
    process.env.REMOTE_ACTION_ENDPOINT_KEY = Buffer.alloc(32, 7).toString('base64');
    const endpoint = 'https://remote.example/session/opaque-id';
    const sealed = sealRemoteEndpoint(endpoint);

    expect(sealed.ciphertext).not.toContain(endpoint);
    expect(openRemoteEndpoint(sealed.ciphertext, sealed.iv)).toBe(endpoint);
  });

  it('rejects non-HTTPS production endpoints and embedded basic credentials', () => {
    process.env.NODE_ENV = 'production';
    expect(() => validateRemoteEndpoint('http://example.com/session')).toThrow('https');
    expect(() => validateRemoteEndpoint('https://user:pass@example.com/session')).toThrow('username/password');
  });

  it('relays a plan-bound action without takeover or pause semantics', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const envelope = JSON.parse(String(init?.body));
      expect(envelope.execution).toEqual({
        executionId: 'exec-1',
        planHash: 'plan-sha256',
        agentId: 'agent-codex',
      });
      expect(envelope.action.kind).toBe('pointer.click');
      return new Response(JSON.stringify({ ok: true, evidence: { frameHash: 'sha256:test' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }));

    const out = await relayRemoteAction({
      endpoint: 'https://remote.example/session/opaque-id',
      sessionId: 'session-1',
      execution: { executionId: 'exec-1', planHash: 'plan-sha256', agentId: 'agent-codex' },
      action: { kind: 'pointer.click', payload: { x: 10, y: 20 } },
    });

    expect(out.result.ok).toBe(true);
    expect(out.result.evidence).toEqual({ frameHash: 'sha256:test' });
  });
});
