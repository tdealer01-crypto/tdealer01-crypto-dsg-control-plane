import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('issueSpineIntent + executeSpineIntent approval flow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('issues a new pending intent and reuses it on second call', async () => {
    const rows: Record<string, any[]> = {
      runtime_approval_requests: [],
      agents: [{ id: 'agt_1', org_id: 'org_1', status: 'active', api_key_hash: 'hash1', monthly_limit: 100 }],
    };

    const from = vi.fn((table: string) => ({
      select: () => ({
        eq: function () {
          return this;
        },
        order: function () {
          return this;
        },
        limit: function () {
          return this;
        },
        maybeSingle: async () => {
          const match = rows[table]?.find(() => true);
          return { data: match ?? null, error: null };
        },
      }),
      insert: (payload: any) => ({
        select: () => ({
          single: async () => {
            const row = { ...payload, id: 'req_001', status: 'pending', expires_at: new Date(Date.now() + 300_000).toISOString() };
            rows[table] = rows[table] || [];
            rows[table].push(row);
            return { data: row, error: null };
          },
        }),
      }),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({ from }),
    }));

    vi.doMock('../../../lib/agent-auth', () => ({
      resolveAgentFromApiKey: vi.fn(async () => ({
        id: 'agt_1', org_id: 'org_1', status: 'active', monthly_limit: 100,
      })),
    }));

    const { issueSpineIntent } = await import('../../../lib/spine/engine');

    const payload = {
      agentId: 'agt_1',
      action: 'scan',
      input: {},
      context: {},
      canonicalRequest: { action: 'scan', input: {}, context: {} },
    } as any;

    const first = await issueSpineIntent({ orgId: 'org_1', apiKey: 'key1', payload });
    expect(first.ok).toBe(true);
    expect(first.status).toBe(200);
    expect(first.body).toHaveProperty('request_id');

    const second = await issueSpineIntent({ orgId: 'org_1', apiKey: 'key1', payload });
    expect(second.ok).toBe(true);
    expect(second.status).toBe(200);
    if (!('reused' in second.body) || !('request_id' in second.body) || !('request_id' in first.body)) {
      throw new Error('Expected pending intent payload in response body');
    }
    expect(second.body.reused).toBe(true);
    expect(second.body.request_id).toBe(first.body.request_id);
  });

  it('returns 409 when intent already consumed', async () => {
    const from = vi.fn(() => ({
      select: () => ({
        eq: function () {
          return this;
        },
        order: function () {
          return this;
        },
        limit: function () {
          return this;
        },
        maybeSingle: async () => ({
          data: { id: 'req_old', status: 'consumed', expires_at: null },
          error: null,
        }),
      }),
    }));

    vi.doMock('../../../lib/supabase-server', () => ({
      getSupabaseAdmin: () => ({ from }),
    }));

    vi.doMock('../../../lib/agent-auth', () => ({
      resolveAgentFromApiKey: vi.fn(async () => ({
        id: 'agt_1', org_id: 'org_1', status: 'active', monthly_limit: 100,
      })),
    }));

    const { issueSpineIntent } = await import('../../../lib/spine/engine');

    const payload = {
      agentId: 'agt_1', action: 'scan', input: {}, context: {},
      canonicalRequest: { action: 'scan', input: {}, context: {} },
    } as any;

    const result = await issueSpineIntent({ orgId: 'org_1', apiKey: 'key1', payload });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    expect(result.body.error).toContain('already consumed');
  });
});
