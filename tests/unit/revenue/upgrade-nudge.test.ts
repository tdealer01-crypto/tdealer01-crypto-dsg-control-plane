import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrgUsageSnapshot } from '../../../lib/revenue/upgrade-nudge';

const mockFrom = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

// Build a chainable query mock that resolves to { data, error } on await
function chainFor(maybeSingleResult: unknown, listResult: unknown[] = []) {
  const single = () => Promise.resolve({ data: maybeSingleResult, error: null });
  const list   = () => Promise.resolve({ data: listResult, error: null });

  const singleChain: any = {
    select: () => singleChain,
    eq:     () => singleChain,
    maybeSingle: single,
  };

  const listChain: any = {
    select: () => listChain,
    eq:     () => listChain,
    then:   (res: any, rej: any) => list().then(res, rej),
    catch:  (rej: any)           => list().catch(rej),
  };

  return { singleChain, listChain };
}

function setupMocks(plan: string, executions: number) {
  const { singleChain, listChain } = chainFor({ plan }, [{ executions }]);
  mockFrom
    .mockReturnValueOnce(singleChain)   // organizations
    .mockReturnValueOnce(listChain);    // usage_counters
}

describe('upgrade-nudge: nudge level thresholds', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns nudge=none when usage < 80% (pro plan, 7000/10000)', async () => {
    setupMocks('pro', 7000);
    const snap = await getOrgUsageSnapshot('org-1');
    expect(snap.plan).toBe('pro');
    expect(snap.limit).toBe(10_000);
    expect(snap.used).toBe(7000);
    expect(snap.pct).toBe(70);
    expect(snap.nudge).toBe('none');
  });

  it('returns nudge=soft at exactly 80% (pro plan, 8000/10000)', async () => {
    setupMocks('pro', 8000);
    const snap = await getOrgUsageSnapshot('org-2');
    expect(snap.nudge).toBe('soft');
    expect(snap.pct).toBe(80);
    expect(snap.nextPlan).toBe('business');
    expect(snap.nextPlanQuota).toBe(100_000);
  });

  it('returns nudge=hard at 95% (pro plan, 9500/10000)', async () => {
    setupMocks('pro', 9500);
    const snap = await getOrgUsageSnapshot('org-3');
    expect(snap.nudge).toBe('hard');
    expect(snap.pct).toBe(95);
    expect(snap.upgradeUrl).toBeTruthy();
  });

  it('returns nudge=blocked at 100% (pro plan, 10000/10000)', async () => {
    setupMocks('pro', 10000);
    const snap = await getOrgUsageSnapshot('org-4');
    expect(snap.nudge).toBe('blocked');
    expect(snap.upgradeUrl).toContain('business');
  });

  it('enterprise org (900000/1000000 = 90%) → soft nudge, no nextPlan', async () => {
    setupMocks('enterprise', 900000);
    const snap = await getOrgUsageSnapshot('org-5');
    expect(snap.nextPlan).toBeNull();
    expect(snap.pct).toBe(90);
    expect(snap.nudge).toBe('soft');
  });

  it('pct is integer 0-100 (free plan, 30/60 = 50%)', async () => {
    setupMocks('free', 30);
    const snap = await getOrgUsageSnapshot('org-6');
    expect(snap.pct).toBe(50);
    expect(Number.isInteger(snap.pct)).toBe(true);
  });

  it('zero usage → nudge=none', async () => {
    setupMocks('pro', 0);
    const snap = await getOrgUsageSnapshot('org-7');
    expect(snap.nudge).toBe('none');
    expect(snap.pct).toBe(0);
    expect(snap.used).toBe(0);
  });
});

describe('upgrade-nudge: upgrade path metadata', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('includes savingsVsMonthly multiplier string', async () => {
    setupMocks('free', 48); // 48/60 = 80% → soft
    const snap = await getOrgUsageSnapshot('org-8');
    // free→trial: 1000/60 ≈ 16×
    expect(snap.savingsVsMonthly).toMatch(/\d+×/);
  });

  it('nextPlan and nextPlanQuota are consistent', async () => {
    setupMocks('pro', 8000);
    const snap = await getOrgUsageSnapshot('org-9');
    expect(snap.nextPlan).toBe('business');
    expect(snap.nextPlanQuota).toBe(100_000);
  });

  it('unknown plan falls back to free quota (60)', async () => {
    setupMocks('unknown-plan', 0);
    const snap = await getOrgUsageSnapshot('org-10');
    expect(snap.limit).toBe(60);
    expect(snap.plan).toBe('unknown-plan');
  });
});
