import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUsageMaybeSingle = vi.fn();
const mockEntitlementMaybeSingle = vi.fn();
const mockUsageUpdateEq = vi.fn();
const mockUsageUpdate = vi.fn((payload: Record<string, unknown>) => ({
  eq: (...args: unknown[]) => {
    mockUsageUpdateEq(payload, ...args);
    return Promise.resolve({ error: null });
  },
}));
const mockInsertRevenueEvent = vi.fn();
const mockReportMeterEvent = vi.fn();

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    rpc: () => ({ maybeSingle: mockUsageMaybeSingle }),
    from: (table: string) => {
      if (table === 'dsg_gate_entitlements') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: mockEntitlementMaybeSingle }),
          }),
        };
      }

      if (table === 'dsg_gate_usage') {
        return { update: mockUsageUpdate };
      }

      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

vi.mock('../../../lib/revenue/events', () => ({
  insertRevenueEvent: (...args: unknown[]) => mockInsertRevenueEvent(...args),
}));

vi.mock('../../../lib/billing/metered', () => ({
  isMeteredBillingConfigured: () => true,
  reportMeterEvent: (...args: unknown[]) => mockReportMeterEvent(...args),
}));

import { recordGateEvaluation } from '../../../lib/dsg/gate-entitlement';

function usage(position: number, overrides?: Record<string, unknown>) {
  return {
    data: {
      usage_id: `usage-${position}`,
      created: true,
      billed: false,
      meter_event_id: null,
      usage_position: position,
      ...overrides,
    },
    error: null,
  };
}

function activeProEntitlement() {
  return {
    data: {
      org_id: 'org-pro',
      tier: 'pro',
      evals_per_month: 5_000,
      subscription_status: 'active',
      overage_enabled: true,
      stripe_customer_id: 'cus_pro',
      stripe_subscription_id: 'sub_pro',
    },
    error: null,
  };
}

describe('recordGateEvaluation durable revenue orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEntitlementMaybeSingle.mockResolvedValue(activeProEntitlement());
    mockInsertRevenueEvent.mockResolvedValue({ id: 'revenue-1' });
    mockUsageUpdateEq.mockResolvedValue({ error: null });
  });

  it('keeps evaluation 5,000 inside the included Pro quota', async () => {
    mockUsageMaybeSingle.mockResolvedValue(usage(5_000));

    const result = await recordGateEvaluation(
      'eval-5000',
      'org-pro',
      'gates/evaluate',
      'PASS',
      12,
    );

    expect(result).toEqual({ recorded: true });
    expect(mockInsertRevenueEvent).toHaveBeenCalledOnce();
    expect(mockReportMeterEvent).not.toHaveBeenCalled();
  });

  it('meters evaluation 5,001 and marks the usage billed on Stripe success', async () => {
    mockUsageMaybeSingle.mockResolvedValue(usage(5_001));
    mockReportMeterEvent.mockResolvedValue({
      ok: true,
      eventId: 'meter-5001',
      durable: true,
    });

    const result = await recordGateEvaluation(
      'eval-5001',
      'org-pro',
      'gates/evaluate',
      'PASS',
      13,
    );

    expect(result).toEqual({ recorded: true, meterEventId: 'meter-5001' });
    expect(mockReportMeterEvent).toHaveBeenCalledWith(
      'cus_pro',
      'org-pro',
      1,
      'dsg-gate-eval-5001',
    );
    expect(mockUsageUpdateEq).toHaveBeenCalledWith(
      { billed: true, meter_event_id: 'meter-5001' },
      'id',
      'usage-5001',
    );
  });

  it('withholds paid delivery when no durable meter outbox exists', async () => {
    mockUsageMaybeSingle.mockResolvedValue(usage(5_001));
    mockReportMeterEvent.mockResolvedValue({
      ok: false,
      error: 'outbox unavailable',
      durable: false,
    });

    const result = await recordGateEvaluation(
      'eval-no-outbox',
      'org-pro',
      'gates/evaluate',
      'PASS',
      14,
    );

    expect(result.recorded).toBe(false);
    expect(result.error).toContain('meter_outbox_unavailable');
    expect(mockUsageUpdateEq).not.toHaveBeenCalled();
  });

  it('allows delivery when Stripe fails after durable outbox persistence', async () => {
    mockUsageMaybeSingle.mockResolvedValue(usage(5_001));
    mockReportMeterEvent.mockResolvedValue({
      ok: false,
      error: 'Stripe temporarily unavailable',
      durable: true,
    });

    const result = await recordGateEvaluation(
      'eval-retryable',
      'org-pro',
      'gates/evaluate',
      'PASS',
      15,
    );

    expect(result).toEqual({
      recorded: true,
      error: 'Stripe temporarily unavailable',
    });
    expect(mockUsageUpdateEq).not.toHaveBeenCalled();
  });

  it('does not create a second revenue or meter event for an already billed retry', async () => {
    mockUsageMaybeSingle.mockResolvedValue(
      usage(5_001, {
        created: false,
        billed: true,
        meter_event_id: 'meter-existing',
      }),
    );

    const result = await recordGateEvaluation(
      'eval-existing',
      'org-pro',
      'gates/evaluate',
      'PASS',
      16,
    );

    expect(result).toEqual({
      recorded: true,
      meterEventId: 'meter-existing',
    });
    expect(mockInsertRevenueEvent).not.toHaveBeenCalled();
    expect(mockReportMeterEvent).not.toHaveBeenCalled();
  });
});
