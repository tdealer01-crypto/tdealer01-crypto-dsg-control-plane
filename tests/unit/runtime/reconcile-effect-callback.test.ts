import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockFrom = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

import { reconcileEffectCallback } from '../../../lib/runtime/reconcile';

function makeChain(finalValue: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockResolvedValue(finalValue);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('reconcileEffectCallback — unit', () => {
  const base = {
    effectId: 'effect-001',
    orgId: 'org-test',
    status: 'succeeded' as const,
    payload: { result: 'ok' },
  };

  it('returns found:false when effect does not exist', async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const result = await reconcileEffectCallback(base);

    expect(result).toEqual({ found: false, alreadyFinal: false });
  });

  it('returns alreadyFinal:true when status is succeeded (idempotent)', async () => {
    const readChain = makeChain({ data: { id: 'effect-001', status: 'succeeded', callback_count: 1 }, error: null });
    mockFrom.mockReturnValue(readChain);

    const result = await reconcileEffectCallback(base);

    expect(result).toEqual({ found: true, alreadyFinal: true });
  });

  it('returns alreadyFinal:true when status is failed (immutable)', async () => {
    const readChain = makeChain({ data: { id: 'effect-001', status: 'failed', callback_count: 1 }, error: null });
    mockFrom.mockReturnValue(readChain);

    const result = await reconcileEffectCallback({ ...base, status: 'succeeded' });

    expect(result).toEqual({ found: true, alreadyFinal: true });
  });

  it('updates status and increments callback_count when pending', async () => {
    const readChain = makeChain({ data: { id: 'effect-001', status: 'pending', callback_count: 0 }, error: null });
    const updateChain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn().mockResolvedValue({ error: null }),
    };
    updateChain.eq.mockReturnValue(updateChain);
    updateChain.update.mockReturnValue(updateChain);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return readChain;
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      };
    });

    const result = await reconcileEffectCallback(base);

    expect(result).toEqual({ found: true, alreadyFinal: false });
  });

  it('throws when DB read fails', async () => {
    const chain = makeChain({ data: null, error: { message: 'connection timeout' } });
    mockFrom.mockReturnValue(chain);

    await expect(reconcileEffectCallback(base)).rejects.toThrow('connection timeout');
  });

  it('accepts failed status', async () => {
    const readChain = makeChain({ data: { id: 'effect-001', status: 'pending', callback_count: 2 }, error: null });
    mockFrom.mockImplementationOnce(() => readChain).mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    });

    const result = await reconcileEffectCallback({ ...base, status: 'failed' });
    expect(result).toEqual({ found: true, alreadyFinal: false });
  });

  it('scopes read query by org_id to prevent cross-org access', async () => {
    const chain = makeChain({ data: null, error: null });
    const eqSpy = vi.fn().mockReturnValue(chain);
    chain.eq = eqSpy;
    mockFrom.mockReturnValue(chain);

    await reconcileEffectCallback({ ...base, orgId: 'org-specific' });

    const eqCalls = eqSpy.mock.calls.map(([col]) => col);
    expect(eqCalls).toContain('org_id');
  });
});
