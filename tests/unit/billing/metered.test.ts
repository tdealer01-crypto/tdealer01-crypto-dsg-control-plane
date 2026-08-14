import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMeterEventsCreate = vi.fn();
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    billing: {
      meterEvents: { create: mockMeterEventsCreate },
    },
  })),
}));

const mockOutboxInsertCall = vi.fn();
const mockOutboxInsertMaybeSingle = vi.fn();
const mockOutboxExistingMaybeSingle = vi.fn();
const mockOutboxUpdateCall = vi.fn();
const mockOutboxUpdateEq = vi.fn();
const mockOutboxSelectAll = vi.fn();
const mockCustomerMaybeSingle = vi.fn();

function outboxInsertChain(payload: Record<string, unknown>) {
  mockOutboxInsertCall(payload);
  return {
    select: () => ({
      maybeSingle: mockOutboxInsertMaybeSingle,
    }),
  };
}

function outboxUpdateChain(payload: Record<string, unknown>) {
  mockOutboxUpdateCall(payload);
  return {
    eq: mockOutboxUpdateEq,
  };
}

function outboxSelectChain() {
  return {
    eq: () => ({
      maybeSingle: mockOutboxExistingMaybeSingle,
    }),
    in: () => ({
      lt: () => ({
        order: () => ({
          limit: mockOutboxSelectAll,
        }),
      }),
    }),
  };
}

vi.mock('../../../lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      if (table === 'billing_meter_outbox') {
        return {
          insert: outboxInsertChain,
          update: outboxUpdateChain,
          select: () => outboxSelectChain(),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: mockCustomerMaybeSingle,
          }),
        }),
      };
    },
  }),
}));

import {
  flushMeterOutbox,
  getMeteredBillingConfiguration,
  isMeteredBillingConfigured,
  reportMeterEvent,
} from '../../../lib/billing/metered';

describe('Stripe metered billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    process.env.STRIPE_METER_EVENT_NAME = 'dsg_execution';
    process.env.STRIPE_METER_ID = 'mtr_test_123';
    process.env.STRIPE_PRICE_PRO_OVERAGE = 'price_overage_test';
    mockOutboxInsertMaybeSingle.mockResolvedValue({
      data: { id: 'outbox-001', status: 'pending', stripe_event_id: null },
      error: null,
    });
    mockOutboxExistingMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockOutboxUpdateEq.mockResolvedValue({ data: null, error: null });
    mockOutboxSelectAll.mockResolvedValue({ data: [], error: null });
    mockCustomerMaybeSingle.mockResolvedValue({
      data: { stripe_customer_id: 'cus_test123' },
      error: null,
    });
  });

  it('reports meter event successfully with durable evidence', async () => {
    mockMeterEventsCreate.mockResolvedValue({ identifier: 'mtr_evt_001' });

    const result = await reportMeterEvent(
      'cus_test123',
      'org-1',
      1,
      'exec-001',
    );
    expect(result.ok).toBe(true);
    if (result.ok === true) {
      expect(result.eventId).toBe('mtr_evt_001');
      expect(result.durable).toBe(true);
    }
    expect(mockMeterEventsCreate).toHaveBeenCalledOnce();
  });

  it('writes an outbox row before Stripe delivery and marks it sent on success', async () => {
    mockMeterEventsCreate.mockResolvedValue({ identifier: 'mtr_evt_001' });

    await reportMeterEvent('cus_test123', 'org-1', 1, 'exec-001');

    expect(mockOutboxInsertCall).toHaveBeenCalledWith({
      execution_id: 'exec-001',
      org_id: 'org-1',
      stripe_customer_id: 'cus_test123',
      event_name: 'dsg_execution',
      quantity: 1,
      status: 'pending',
    });
    expect(mockOutboxUpdateCall).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'sent',
        stripe_event_id: 'mtr_evt_001',
        error: null,
      }),
    );
  });

  it('passes correct payload and execution idempotency key to Stripe', async () => {
    mockMeterEventsCreate.mockResolvedValue({ identifier: 'mtr_evt_002' });

    await reportMeterEvent('cus_abc', 'org-2', 3, 'exec-abc-123');

    const [payload, options] = mockMeterEventsCreate.mock.calls[0];
    expect(payload.event_name).toBe('dsg_execution');
    expect(payload.identifier).toBe('dsg-meter-exec-abc-123');
    expect(payload.payload.stripe_customer_id).toBe('cus_abc');
    expect(payload.payload.value).toBe('3');
    expect(options.idempotencyKey).toBe('dsg-meter-exec-abc-123');
  });

  it('uses distinct idempotency keys for same-second executions from the same org', async () => {
    mockMeterEventsCreate.mockResolvedValue({
      identifier: 'mtr_evt_same_second',
    });
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);

    await reportMeterEvent('cus_abc', 'org-same', 1, 'exec-same-1');
    await reportMeterEvent('cus_abc', 'org-same', 1, 'exec-same-2');

    expect(mockMeterEventsCreate.mock.calls[0][1].idempotencyKey).toBe(
      'dsg-meter-exec-same-1',
    );
    expect(mockMeterEventsCreate.mock.calls[1][1].idempotencyKey).toBe(
      'dsg-meter-exec-same-2',
    );
    dateSpy.mockRestore();
  });

  it('requires executionId and reports that no durable evidence exists', async () => {
    const result = await reportMeterEvent(
      'cus_test',
      'org-missing-exec',
      1,
      '   ',
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toContain('executionId is required');
      expect(result.durable).toBe(false);
    }
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('fails without durable evidence when meter event name is missing', async () => {
    delete process.env.STRIPE_METER_EVENT_NAME;

    const result = await reportMeterEvent(
      'cus_test',
      'org-3',
      1,
      'exec-003',
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.skipped).toBe(true);
      expect(result.durable).toBe(false);
      expect(result.error).toContain('STRIPE_METER_EVENT_NAME');
    }
    expect(mockOutboxInsertCall).not.toHaveBeenCalled();
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('fails without durable evidence when the Stripe key is missing', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const result = await reportMeterEvent(
      'cus_test',
      'org-4',
      1,
      'exec-004',
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.skipped).toBe(true);
      expect(result.durable).toBe(false);
      expect(result.error).toContain('STRIPE_SECRET_KEY');
    }
  });

  it('fails closed when the verified Billing Meter id is missing', async () => {
    delete process.env.STRIPE_METER_ID;

    const result = await reportMeterEvent('cus_test', 'org-meter', 1, 'exec-meter');
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.durable).toBe(false);
      expect(result.error).toContain('STRIPE_METER_ID');
    }
    expect(mockOutboxInsertCall).not.toHaveBeenCalled();
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('fails closed when the Pro metered Price id is missing', async () => {
    delete process.env.STRIPE_PRICE_PRO_OVERAGE;

    const result = await reportMeterEvent('cus_test', 'org-price', 1, 'exec-price');
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.durable).toBe(false);
      expect(result.error).toContain('STRIPE_PRICE_PRO_OVERAGE');
    }
    expect(mockOutboxInsertCall).not.toHaveBeenCalled();
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('fails closed when the outbox row cannot be created or recovered', async () => {
    mockOutboxInsertMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'outbox insert failed' },
    });
    mockOutboxExistingMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'outbox lookup failed' },
    });

    const result = await reportMeterEvent(
      'cus_test',
      'org-outbox-down',
      1,
      'exec-outbox-down',
    );

    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.durable).toBe(false);
      expect(result.error).toContain('outbox lookup failed');
    }
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('keeps durable retry evidence when the Stripe call fails', async () => {
    mockMeterEventsCreate.mockRejectedValue(new Error('Stripe API error'));

    const result = await reportMeterEvent(
      'cus_test',
      'org-5',
      1,
      'exec-005',
    );
    expect(result.ok).toBe(false);
    if (result.ok === false) {
      expect(result.error).toContain('Stripe API error');
      expect(result.durable).toBe(true);
    }
    expect(mockOutboxUpdateCall).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error: 'Stripe API error',
      }),
    );
  });

  it('flushMeterOutbox retries pending rows', async () => {
    mockOutboxSelectAll.mockResolvedValue({
      data: [
        {
          id: 'outbox-retry-1',
          execution_id: 'exec-retry-1',
          org_id: 'org-retry',
          stripe_customer_id: 'cus_retry',
          event_name: 'dsg_execution',
          quantity: 1,
          status: 'pending',
          stripe_event_id: null,
          error: null,
          created_at: '2026-05-01T00:00:00.000Z',
        },
      ],
      error: null,
    });
    mockMeterEventsCreate.mockResolvedValue({ identifier: 'mtr_evt_retry' });

    const result = await flushMeterOutbox(10);

    expect(result.scanned).toBe(1);
    expect(result.sent).toBe(1);
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'dsg-meter-exec-retry-1' }),
      { idempotencyKey: 'dsg-meter-exec-retry-1' },
    );
  });

  it('returns a complete non-secret configuration contract', () => {
    expect(getMeteredBillingConfiguration()).toEqual({
      configured: true,
      eventName: 'dsg_execution',
      meterId: 'mtr_test_123',
      priceId: 'price_overage_test',
      missing: [],
    });
  });

  it('isMeteredBillingConfigured returns true only when all required env vars are set', () => {
    expect(isMeteredBillingConfigured()).toBe(true);

    delete process.env.STRIPE_METER_ID;
    expect(isMeteredBillingConfigured()).toBe(false);

    process.env.STRIPE_METER_ID = 'mtr_test_123';
    delete process.env.STRIPE_PRICE_PRO_OVERAGE;
    expect(isMeteredBillingConfigured()).toBe(false);
  });
});
