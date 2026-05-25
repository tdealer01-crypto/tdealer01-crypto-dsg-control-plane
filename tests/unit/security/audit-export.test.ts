import { describe, expect, it, vi } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

import { fetchAuditLogsForExport } from '../../../lib/security/audit-export';

function makeChain(result: { data: unknown; error: { message?: string; code?: string } | null }) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockResolvedValue(result);
  return chain;
}

describe('fetchAuditLogsForExport', () => {
  it('returns ok:true with rows on success', async () => {
    const rows = [{ id: 'log-1', decision: 'allow' }];
    mockFrom.mockReturnValue(makeChain({ data: rows, error: null }));

    const result = await fetchAuditLogsForExport('org-1', 50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toEqual(rows);
    }
  });

  it('returns empty rows when data is null', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));

    const result = await fetchAuditLogsForExport('org-1', 50);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rows).toEqual([]);
    }
  });

  it('returns relation-missing when error contains "relation"', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'relation does not exist' } }));

    const result = await fetchAuditLogsForExport('org-1', 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('relation-missing');
    }
  });

  it('returns relation-missing when error contains "does not exist"', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'table does not exist' } }));

    const result = await fetchAuditLogsForExport('org-1', 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('relation-missing');
    }
  });

  it('returns relation-missing when error code is PGRST205', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'query error', code: 'PGRST205' } }));

    const result = await fetchAuditLogsForExport('org-1', 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('relation-missing');
    }
  });

  it('returns query-error for generic DB errors', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'connection timeout' } }));

    const result = await fetchAuditLogsForExport('org-1', 50);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('query-error');
    }
  });

  it('passes orgId filter to query', async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await fetchAuditLogsForExport('org-42', 10);
    expect(chain.eq as ReturnType<typeof vi.fn>).toHaveBeenCalledWith('org_id', 'org-42');
  });
});
