import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveAgentFromApiKeyMock,
  executeSpineIntentMock,
  issueSpineIntentMock,
  applyRateLimitMock,
  checkQuotaMock,
  incrementQuotaMock,
  fireWebhookMock,
  meterExecutionMock,
} = vi.hoisted(() => ({
  resolveAgentFromApiKeyMock: vi.fn(),
  executeSpineIntentMock: vi.fn(),
  issueSpineIntentMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
  checkQuotaMock: vi.fn(),
  incrementQuotaMock: vi.fn(),
  fireWebhookMock: vi.fn(),
  meterExecutionMock: vi.fn(),
}));

vi.mock('../../../lib/agent-auth', () => ({
  resolveAgentFromApiKey: resolveAgentFromApiKeyMock,
}));

vi.mock('../../../lib/spine/engine', () => ({
  executeSpineIntent: executeSpineIntentMock,
  issueSpineIntent: issueSpineIntentMock,
}));

vi.mock('../../../lib/security/rate-limit', () => ({
  applyRateLimit: applyRateLimitMock,
  buildRateLimitHeaders: (rateLimit: { remaining?: number; reset?: number }, limit: number) => ({
    'x-ratelimit-limit': String(limit),
    'x-ratelimit-remaining': String(rateLimit.remaining ?? limit),
    'x-ratelimit-reset': String(rateLimit.reset ?? Date.now() + 60_000),
  }),
  getRateLimitKey: () => 'test-rate-key',
}));

vi.mock('../../../lib/usage/quota', () => ({
  checkQuota: checkQuotaMock,
  incrementQuota: incrementQuotaMock,
}));

vi.mock('../../../lib/webhooks/deliver', () => ({
  fireWebhook: fireWebhookMock,
}));

vi.mock('../../../lib/billing/metered', () => ({
  meterExecution: meterExecutionMock,
}));

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/execute', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function loadPost() {
  vi.resetModules();
  const mod = await import('../../../app/api/execute/route');
  return mod.POST;
}

describe('/api/execute critical route contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyRateLimitMock.mockResolvedValue({ allowed: true, remaining: 59, reset: Date.now() + 60_000 });
    checkQuotaMock.mockResolvedValue({ allowed: true, used: 0, limit: 10000 });
    incrementQuotaMock.mockResolvedValue(undefined);
    fireWebhookMock.mockResolvedValue(undefined);
    meterExecutionMock.mockResolvedValue({ ok: true, eventId: 'meter-test-1' });
    resolveAgentFromApiKeyMock.mockResolvedValue({
      id: 'agent-test',
      org_id: 'org-test',
      policy_id: 'policy-test',
      status: 'active',
      monthly_limit: 1000,
    });
    executeSpineIntentMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: {
        request_id: 'exec-test-1',
        decision: 'ALLOW',
        reason: 'test allowed',
        latency_ms: 12,
        policy_version: 'v1',
      },
    });
    issueSpineIntentMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: { request_id: 'approval-test-1', status: 'pending' },
    });
  });

  it('returns 401 when bearer token is missing', async () => {
    const POST = await loadPost();

    const res = await POST(request({ agent_id: 'agent-test', input: 'hello' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Missing Bearer token' });
    expect(resolveAgentFromApiKeyMock).not.toHaveBeenCalled();
  });

  it('returns 400 when agent_id is missing', async () => {
    const POST = await loadPost();

    const res = await POST(request({ input: 'hello' }, { authorization: 'Bearer sk_test_valid' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'agent_id is required' });
  });

  it('returns 401 when agent_id and api key do not resolve', async () => {
    resolveAgentFromApiKeyMock.mockResolvedValueOnce(null);
    const POST = await loadPost();

    const res = await POST(request({ agent_id: 'agent-test', input: 'hello' }, { authorization: 'Bearer sk_test_bad' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Invalid agent_id or API key' });
  });

  it('returns 403 when the agent is not active', async () => {
    resolveAgentFromApiKeyMock.mockResolvedValueOnce({
      id: 'agent-test',
      org_id: 'org-test',
      policy_id: 'policy-test',
      status: 'revoked',
      monthly_limit: 1000,
    });
    const POST = await loadPost();

    const res = await POST(request({ agent_id: 'agent-test', input: 'hello' }, { authorization: 'Bearer sk_test_valid' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: 'Agent is not active' });
  });

  it('executes active agent request and returns the spine engine body', async () => {
    const POST = await loadPost();

    const res = await POST(
      request(
        {
          agent_id: 'agent-test',
          action: 'send_email',
          input: { to: 'user@example.com', subject: 'Hello' },
          context: { source: 'vitest' },
        },
        { authorization: 'Bearer sk_test_valid' },
      ),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.decision).toBe('ALLOW');
    expect(resolveAgentFromApiKeyMock).toHaveBeenCalledWith('agent-test', 'sk_test_valid');
    expect(executeSpineIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-test',
        apiKey: 'sk_test_valid',
        payload: expect.objectContaining({ agentId: 'agent-test' }),
      }),
    );
    expect(fireWebhookMock).toHaveBeenCalledWith('org-test', 'execution.completed', {
      agent_id: 'agent-test',
      decision: 'ALLOW',
    });
    expect(meterExecutionMock).toHaveBeenCalledWith('org-test', 1, expect.any(String));
  });

  it('issues a runtime intent and retries when no pending runtime intent exists', async () => {
    executeSpineIntentMock
      .mockResolvedValueOnce({ ok: false, status: 409, body: { error: 'No pending runtime intent for request' } })
      .mockResolvedValueOnce({ ok: true, status: 200, body: { request_id: 'exec-after-issue', decision: 'ALLOW' } });
    const POST = await loadPost();

    const res = await POST(request({ agent_id: 'agent-test', input: 'hello' }, { authorization: 'Bearer sk_test_valid' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.request_id).toBe('exec-after-issue');
    expect(issueSpineIntentMock).toHaveBeenCalledOnce();
    expect(executeSpineIntentMock).toHaveBeenCalledTimes(2);
  });

  it('returns 429 and rate-limit headers when rate limit blocks the request', async () => {
    applyRateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0, reset: Date.now() + 60_000 });
    const POST = await loadPost();

    const res = await POST(request({ agent_id: 'agent-test', input: 'hello' }, { authorization: 'Bearer sk_test_valid' }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body).toEqual({ error: 'Too many requests' });
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0');
    expect(resolveAgentFromApiKeyMock).not.toHaveBeenCalled();
  });
});
