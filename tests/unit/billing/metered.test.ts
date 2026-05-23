import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock stripe before imports
const mockMeterEventsCreate = vi.fn();
vi.mock('stripe', () => ({
  default: vi.fn().mockImplementation(() => ({
    billing: {
      meterEvents: { create: mockMeterEventsCreate },
    },
  })),
}));

const mockOutboxInsert = vi.fn();
const mockOutboxUpdate = vi.fn();
const mockOutboxSelectAll = vi.fn();
const mockCustomerMaybeSingle = vi.fn();

function outboxInsertChain() {
  return {
    select: () => ({
      maybeSingle: mockOutboxInsert,
    }),
  };
}

function outboxUpdateChain() {
  return {
    eq: mockOutboxUpdate,
  };
}

function outboxSelectChain() {
  return {
    eq: () => ({
      maybeSingle: () => Promise.resolve({ data: null, error: null }),
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
          insert: mockOutboxInsert.mockImplementationOnce(() => outboxInsertChain()),
          update: mockOutboxUpdate.mockImplementationOnce(() => outboxUpdateChain()),
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

import { reportMeterEvent, isMeteredBillingConfigured, flushMeterOutbox } from '../../../lib/billing/metered';

describe('Stripe metered billing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    process.env.STRIPE_SECRET_KEY       = 'sk_test_xxx';
    process.env.STRIPE_METER_EVENT_NAME = 'dsg_execution';
    mockOutboxInsert.mockImplementation(() => Promise.resolve({
      data: { id: 'outbox-001', status: 'pending', stripe_event_id: null },
      error: null,
    }));
    mockOutboxUpdate.mockResolvedValue({ data: null, error: null });
    mockOutboxSelectAll.mockResolvedValue({ data: [], error: null });
    mockCustomerMaybeSingle.mockResolvedValue({ data: { stripe_customer_id: 'cus_test123' }, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reports meter event successfully', async () => {
    mockMeterEventsCreate.mockResolvedValue({ identifier: 'mtr_evt_001' });

    const result = await reportMeterEvent('cus_test123', 'org-1', 1, 'exec-001');
    expect(result.ok).toBe(true);
    if (result.ok) expect((result as any).eventId).toBe('mtr_evt_001');
    expect(mockMeterEventsCreate).toHaveBeenCalledOnce();
  });

  it('writes an outbox row before Stripe delivery and marks it sent on success', async () => {
    mockMeterEventsCreate.mockResolvedValue({ identifier: 'mtr_evt_001' });

    await reportMeterEvent('cus_test123', 'org-1', 1, 'exec-001');

    expect(mockOutboxInsert).toHaveBeenCalledWith({
      execution_id: 'exec-001',
      org_id: 'org-1',
      stripe_customer_id: 'cus_test123',
      event_name: 'dsg_execution',
      quantity: 1,
      status: 'pending',
    });
    expect(mockOutboxUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'sent',
      stripe_event_id: 'mtr_evt_001',
      error: null,
    }));
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
    mockMeterEventsCreate.mockResolvedValue({ identifier: 'mtr_evt_same_second' });
    vi.spyOn(Date, 'now').mockReturnValue(1_777_000_000_000);

    await reportMeterEvent('cus_abc', 'org-same', 1, 'exec-same-1');
    await reportMeterEvent('cus_abc', 'org-same', 1, 'exec-same-2');

    expect(mockMeterEventsCreate.mock.calls[0][1].idempotencyKey).toBe('dsg-meter-exec-same-1');
    expect(mockMeterEventsCreate.mock.calls[1][1].idempotencyKey).toBe('dsg-meter-exec-same-2');
  });

  it('requires executionId to prevent unsafe timestamp-only metering', async () => {
    const result = await reportMeterEvent('cus_test', 'org-missing-exec', 1, '   ');
    expect(result.ok).toBe(false);
    if (!result.ok) expect((result as any).error).toContain('executionId is required');
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('skips gracefully when STRIPE_METER_EVENT_NAME is not set', async () => {
    delete process.env.STRIPE_METER_EVENT_NAME;

    const result = await reportMeterEvent('cus_test', 'org-3', 1, 'exec-003');
    expect(result.ok).toBe(false);
    if (!result.ok) expect((result as any).skipped).toBe(true);
    expect(mockOutboxInsert).not.toHaveBeenCalled();
    expect(mockMeterEventsCreate).not.toHaveBeenCalled();
  });

  it('skips gracefully when STRIPE_SECRET_KEY is not set', async () => {
    delete process.env.STRIPE_SECRET_KEY;

    const result = await reportMeterEvent('cus_test', 'org-4', 1, 'exec-004');
    expect(result.ok).toBe(false);
    if (!result.ok) expect((result as any).skipped).toBe(true);
  });

  it('returns error and marks outbox failed when Stripe call fails', async () => {
    mockMeterEventsCreate.mockRejectedValue(new Error('Stripe API error'));

    const result = await reportMeterEvent('cus_test', 'org-5', 1, 'exec-005');
    expect(result.ok).toBe(false);
    if (!result.ok) expect((result as any).error).toContain('Stripe API error');
    expect(mockOutboxUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      error: 'Stripe API error',
    }));
  });

  it('flushMeterOutbox retries pending rows', async () => {
    mockOutboxSelectAll.mockResolvedValue({
      data: [{
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
      }],
      error: null,
    });
    mockMeterEventsCreate.mockResolvedValue({ identifier: 'mtr_evt_retry' });

    const result = await flushMeterOutbox(10);

    expect(result.scanned).toBe(1);
    expect(result.sent).toBe(1);
    expect(mockMeterEventsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ identifier: 'dsg-meter-exec-retry-1' }),
      { idempotencyKey: 'dsg-meter-exec-retry-1' }
    );
  });

  it('isMeteredBillingConfigured returns true when both env vars are set', () => {
    expect(isMeteredBillingConfigured()).toBe(true);
  });

  it('isMeteredBillingConfigured returns false when meter name missing', () => {
    delete process.env.STRIPE_METER_EVENT_NAME;
    expect(isMeteredBillingConfigured()).toBe(false);
  });
});
