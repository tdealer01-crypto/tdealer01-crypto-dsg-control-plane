import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeOnDSGCore, getDSGCoreHealth } from '../../lib/dsg-core';

describe('dsg-core internal mode', () => {
  afterEach(() => {
    delete process.env.DSG_CORE_URL;
    delete process.env.DSG_CORE_MODE;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns internal health when DSG_CORE_URL is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const health = await getDSGCoreHealth();
    expect(health.ok).toBe(true);
    expect((health as any).mode).toBe('internal');
  });

  it('uses internal runtime gate to execute when DSG_CORE_URL is not configured', async () => {
    vi.stubGlobal('fetch', vi.fn());

    const result = await executeOnDSGCore({
      agent_id: 'agent-1',
      action: 'scan',
      payload: { context: { risk_score: 0.92 } },
    });

    expect(result.decision).toBe('BLOCK');
    expect(result.source).toBe('internal');
    expect(result.policy_version).toBe('internal-runtime-gate-v1');
  });
});
