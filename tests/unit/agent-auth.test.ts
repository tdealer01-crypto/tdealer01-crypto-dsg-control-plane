import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingleMock = vi.fn();
const eqApiKeyMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const eqIdMock = vi.fn(() => ({ eq: eqApiKeyMock }));

vi.mock('../../lib/supabase-server', () => ({
  getSupabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: eqIdMock,
      })),
    })),
  })),
}));

describe('resolveAgentFromApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns agent data when id and api_key_hash match', async () => {
    const agentRow = {
      id: 'agent-1',
      org_id: 'org-1',
      policy_id: 'policy-1',
      status: 'active',
      monthly_limit: 1000,
    };
    maybeSingleMock.mockResolvedValue({ data: agentRow, error: null });

    const { resolveAgentFromApiKey } = await import('../../lib/agent-auth');
    const result = await resolveAgentFromApiKey('agent-1', 'my-api-key');

    expect(result).toEqual(agentRow);
  });

  it('returns null when no matching agent is found', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const { resolveAgentFromApiKey } = await import('../../lib/agent-auth');
    const result = await resolveAgentFromApiKey('agent-1', 'wrong-key');

    expect(result).toBeNull();
  });

  it('returns null on database error', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'DB error' } });

    const { resolveAgentFromApiKey } = await import('../../lib/agent-auth');
    const result = await resolveAgentFromApiKey('agent-1', 'any-key');

    expect(result).toBeNull();
  });

  it('hashes the api key with sha256 before querying', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const { resolveAgentFromApiKey } = await import('../../lib/agent-auth');
    await resolveAgentFromApiKey('agent-1', 'test-key');

    // The second eq call receives the sha256 hash — verify it is a 64-char hex string
    const hashArg = eqApiKeyMock.mock.calls[0]?.[1];
    expect(hashArg).toMatch(/^[0-9a-f]{64}$/);
    expect(hashArg).not.toBe('test-key');
  });
});
