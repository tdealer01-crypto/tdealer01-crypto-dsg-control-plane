import { afterEach, describe, expect, it, vi } from 'vitest';
import { executeOnDSGCore, getDSGCoreHealth } from '../../lib/dsg-core';

describe('dsg-core mode resolution', () => {
  afterEach(() => {
    delete process.env.DSG_CORE_URL;
    delete process.env.DSG_CORE_MODE;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('throws when DSG_CORE_MODE is not explicit', async () => {
    await expect(getDSGCoreHealth()).rejects.toThrow('DSG_CORE_MODE must be explicitly set');
  });

  it('throws in remote mode when DSG_CORE_URL is missing', async () => {
    process.env.DSG_CORE_MODE = 'remote';

    await expect(getDSGCoreHealth()).rejects.toThrow('DSG_CORE_URL is required when DSG_CORE_MODE=remote');
  });
});

describe('dsg-core internal mode', () => {
  afterEach(() => {
    delete process.env.DSG_CORE_URL;
    delete process.env.DSG_CORE_MODE;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns internal health in explicit internal mode', async () => {
    process.env.DSG_CORE_MODE = 'internal';
    vi.stubGlobal('fetch', vi.fn());

    const health = await getDSGCoreHealth();
    expect(health.ok).toBe(true);
    expect((health as any).mode).toBe('internal');
  });

  it('throws when internal mode execution omits risk score', async () => {
    process.env.DSG_CORE_MODE = 'internal';

    await expect(
      executeOnDSGCore({
        agent_id: 'agent-1',
        action: 'scan',
        payload: { context: {} },
      })
    ).rejects.toThrow('requires payload.context.risk_score or payload.context.riskScore');
  });

  it('uses internal runtime gate when risk score is provided', async () => {
    process.env.DSG_CORE_MODE = 'internal';

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
