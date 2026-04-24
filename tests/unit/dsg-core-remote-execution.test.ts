import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeOnDSGCore } from '../../lib/dsg-core';

describe('executeOnDSGCore in remote mode', () => {
  afterEach(() => {
    delete process.env.DSG_CORE_MODE;
    delete process.env.DSG_CORE_URL;
    vi.unstubAllGlobals();
  });

  it('calls remote core /execute in remote mode', async () => {
    process.env.DSG_CORE_MODE = 'remote';
    process.env.DSG_CORE_URL = 'https://core.example.com';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, source: 'remote' }),
    });
    vi.stubGlobal('fetch', fetchMock as any);

    const result = await executeOnDSGCore({
      agent_id: 'agent-1',
      action: 'run',
      payload: { context: { risk_score: 0.2 } },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://core.example.com/execute',
      expect.objectContaining({ method: 'POST' })
    );
    expect((result as any).source).toBe('remote');
  });
});
