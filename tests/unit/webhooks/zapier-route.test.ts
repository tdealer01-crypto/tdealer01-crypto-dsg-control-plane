import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockValidateZapierSignature,
  mockHandleRevenueWebhook,
  mockHandleQuotaWebhook,
  mockHandleCommunicationWebhook,
  mockCheckZapierIntegrationHealth,
} = vi.hoisted(() => ({
  mockValidateZapierSignature: vi.fn(),
  mockHandleRevenueWebhook: vi.fn(),
  mockHandleQuotaWebhook: vi.fn(),
  mockHandleCommunicationWebhook: vi.fn(),
  mockCheckZapierIntegrationHealth: vi.fn(),
}));

vi.mock('../../../lib/zapier-integrations/control-plane-api', () => ({
  validateZapierSignature: mockValidateZapierSignature,
  handleRevenueWebhook: mockHandleRevenueWebhook,
  handleQuotaWebhook: mockHandleQuotaWebhook,
  handleCommunicationWebhook: mockHandleCommunicationWebhook,
  checkZapierIntegrationHealth: mockCheckZapierIntegrationHealth,
}));

import { POST, GET } from '../../../app/api/webhooks/zapier/[...path]/route';

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/webhooks/zapier/revenue', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

function makeParams(path: string[]) {
  return { params: Promise.resolve({ path }) };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/webhooks/zapier/[...path]', () => {
  it('returns 401 when signature validation fails', async () => {
    mockValidateZapierSignature.mockReturnValue(false);

    const req = makeRequest(JSON.stringify({ customer_id: 'cus_1' }), {
      'x-zapier-signature': 'bad-signature',
    });
    const res = await POST(req as any, makeParams(['revenue']) as any);

    expect(res.status).toBe(401);
    expect(mockHandleRevenueWebhook).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid JSON body even with a would-be-valid signature', async () => {
    mockValidateZapierSignature.mockReturnValue(true);

    const req = makeRequest('not json', { 'x-zapier-signature': 'sig' });
    const res = await POST(req as any, makeParams(['revenue']) as any);

    expect(res.status).toBe(400);
  });

  it('routes to handleRevenueWebhook for the revenue path', async () => {
    mockValidateZapierSignature.mockReturnValue(true);
    mockHandleRevenueWebhook.mockResolvedValue({ success: true });

    const payload = { customer_id: 'cus_1', amount: 100 };
    const req = makeRequest(JSON.stringify(payload), { 'x-zapier-signature': 'sig' });
    const res = await POST(req as any, makeParams(['revenue']) as any);

    expect(res.status).toBe(200);
    expect(mockHandleRevenueWebhook).toHaveBeenCalledWith(payload);
    expect(mockHandleQuotaWebhook).not.toHaveBeenCalled();
  });

  it('routes to handleQuotaWebhook for the quota path', async () => {
    mockValidateZapierSignature.mockReturnValue(true);
    mockHandleQuotaWebhook.mockResolvedValue({ success: true });

    const payload = { customer_id: 'cus_1', usage_percent: 50 };
    const req = makeRequest(JSON.stringify(payload), { 'x-zapier-signature': 'sig' });
    const res = await POST(req as any, makeParams(['quota']) as any);

    expect(res.status).toBe(200);
    expect(mockHandleQuotaWebhook).toHaveBeenCalledWith(payload);
  });

  it('routes to handleCommunicationWebhook for the communication path', async () => {
    mockValidateZapierSignature.mockReturnValue(true);
    mockHandleCommunicationWebhook.mockResolvedValue({ success: true });

    const payload = { customer_id: 'cus_1', email: 'a@b.com' };
    const req = makeRequest(JSON.stringify(payload), { 'x-zapier-signature': 'sig' });
    const res = await POST(req as any, makeParams(['communication']) as any);

    expect(res.status).toBe(200);
    expect(mockHandleCommunicationWebhook).toHaveBeenCalledWith(payload);
  });

  it('returns 400 when the handler reports failure', async () => {
    mockValidateZapierSignature.mockReturnValue(true);
    mockHandleRevenueWebhook.mockResolvedValue({ success: false, error: 'Missing required fields' });

    const req = makeRequest(JSON.stringify({}), { 'x-zapier-signature': 'sig' });
    const res = await POST(req as any, makeParams(['revenue']) as any);

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown path segment', async () => {
    mockValidateZapierSignature.mockReturnValue(true);

    const req = makeRequest(JSON.stringify({}), { 'x-zapier-signature': 'sig' });
    const res = await POST(req as any, makeParams(['unknown']) as any);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/webhooks/zapier/[...path] (health check)', () => {
  it('returns the health payload from checkZapierIntegrationHealth', async () => {
    mockCheckZapierIntegrationHealth.mockResolvedValue({
      status: 'healthy',
      components: { revenue_webhook: true, quota_webhook: true, communication_webhook: true },
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('Zapier Revenue Automation Webhooks');
  });
});
