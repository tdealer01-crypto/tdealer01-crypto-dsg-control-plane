import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockCors() {
  const buildCorsHeaders = vi.fn(
    (_request: Request, extraHeaders?: HeadersInit) =>
      new Headers({
        'access-control-allow-origin': 'https://app.example.com',
        ...(extraHeaders instanceof Headers
          ? Object.fromEntries(extraHeaders.entries())
          : (extraHeaders as Record<string, string> | undefined) || {}),
      })
  );

  const buildPreflightResponse = vi.fn(
    () =>
      new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': 'https://app.example.com',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
        },
      })
  );

  vi.doMock('../../../lib/security/cors', () => ({
    buildCorsHeaders,
    buildPreflightResponse,
  }));

  return { buildCorsHeaders, buildPreflightResponse };
}

function mockRateLimit() {
  const applyRateLimit = vi.fn(async () => ({
    allowed: true,
    resetAt: Date.now() + 60_000,
  }));
  const buildRateLimitHeaders = vi.fn(() => ({
    'x-ratelimit-limit': '60',
  }));
  const getRateLimitKey = vi.fn(() => 'spine-execute:test');

  vi.doMock('../../../lib/security/rate-limit', () => ({
    applyRateLimit,
    buildRateLimitHeaders,
    getRateLimitKey,
  }));

  return { applyRateLimit, buildRateLimitHeaders, getRateLimitKey };
}

function mockApiError() {
  const handleApiError = vi.fn(
    (_route: string, _error: unknown, options?: { headers?: HeadersInit }) =>
      new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: options?.headers,
      })
  );

  vi.doMock('../../../lib/security/api-error', () => ({
    handleApiError,
  }));

  return { handleApiError };
}

describe('/api/spine/execute', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns preflight response for OPTIONS', async () => {
    const { buildPreflightResponse } = mockCors();
    mockRateLimit();
    mockApiError();

    vi.doMock('../../../lib/agent-auth', () => ({
      resolveAgentFromApiKey: vi.fn(),
    }));
    vi.doMock('../../../lib/spine/engine', () => ({
      executeSpineIntent: vi.fn(),
      issueSpineIntent: vi.fn(),
    }));
    vi.doMock('../../../lib/spine/request', () => ({
      normalizeSpinePayload: vi.fn(),
    }));

    const { OPTIONS } = await import('../../../app/api/spine/execute/route');

    const req = new Request('http://localhost/api/spine/execute', {
      method: 'OPTIONS',
      headers: { origin: 'https://app.example.com' },
    });

    const res = await OPTIONS(req as never);

    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe(
      'https://app.example.com'
    );
    expect(buildPreflightResponse).toHaveBeenCalledOnce();
  });

  it('returns 401 when Bearer token is missing', async () => {
    mockCors();
    mockRateLimit();
    mockApiError();

    vi.doMock('../../../lib/agent-auth', () => ({
      resolveAgentFromApiKey: vi.fn(),
    }));
    vi.doMock('../../../lib/spine/engine', () => ({
      executeSpineIntent: vi.fn(),
      issueSpineIntent: vi.fn(),
    }));
    vi.doMock('../../../lib/spine/request', () => ({
      normalizeSpinePayload: vi.fn(() => ({
        agentId: 'agt_1',
        action: 'scan',
        input: {},
        context: {},
        canonicalRequest: { action: 'scan', input: {}, context: {} },
      })),
    }));

    const { POST } = await import('../../../app/api/spine/execute/route');

    const req = new Request('http://localhost/api/spine/execute', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ agent_id: 'agt_1' }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Missing Bearer token' });
  });

  it('returns 400 when agent_id is missing', async () => {
    mockCors();
    mockRateLimit();
    mockApiError();

    vi.doMock('../../../lib/agent-auth', () => ({
      resolveAgentFromApiKey: vi.fn(),
    }));
    vi.doMock('../../../lib/spine/engine', () => ({
      executeSpineIntent: vi.fn(),
      issueSpineIntent: vi.fn(),
    }));
    vi.doMock('../../../lib/spine/request', () => ({
      normalizeSpinePayload: vi.fn(() => ({
        agentId: '',
        action: 'scan',
        input: {},
        context: {},
        canonicalRequest: { action: 'scan', input: {}, context: {} },
      })),
    }));

    const { POST } = await import('../../../app/api/spine/execute/route');

    const req = new Request('http://localhost/api/spine/execute', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        authorization: 'Bearer dsg_live_test',
        'content-type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'agent_id is required' });
  });

  it('returns 401 when agent_id and api key do not resolve', async () => {
    mockCors();
    mockRateLimit();
    mockApiError();

    const resolveAgentFromApiKey = vi.fn(async () => null);

    vi.doMock('../../../lib/agent-auth', () => ({
      resolveAgentFromApiKey,
    }));
    vi.doMock('../../../lib/spine/engine', () => ({
      executeSpineIntent: vi.fn(),
      issueSpineIntent: vi.fn(),
    }));
    vi.doMock('../../../lib/spine/request', () => ({
      normalizeSpinePayload: vi.fn(() => ({
        agentId: 'agt_1',
        action: 'scan',
        input: {},
        context: {},
        canonicalRequest: { action: 'scan', input: {}, context: {} },
      })),
    }));

    const { POST } = await import('../../../app/api/spine/execute/route');

    const req = new Request('http://localhost/api/spine/execute', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        authorization: 'Bearer bad_key',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ agent_id: 'agt_1' }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: 'Invalid agent_id or API key' });
    expect(resolveAgentFromApiKey).toHaveBeenCalledWith('agt_1', 'bad_key');
  });

  it('executes successfully with valid agent credentials', async () => {
    mockCors();
    mockRateLimit();
    mockApiError();

    const resolveAgentFromApiKey = vi.fn(async () => ({
      id: 'agt_1',
      org_id: 'org_1',
      status: 'active',
    }));

    const executeSpineIntent = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: { request_id: 'req_1', decision: 'ALLOW' },
    }));

    const issueSpineIntent = vi.fn();

    vi.doMock('../../../lib/agent-auth', () => ({
      resolveAgentFromApiKey,
    }));
    vi.doMock('../../../lib/spine/engine', () => ({
      executeSpineIntent,
      issueSpineIntent,
    }));
    vi.doMock('../../../lib/spine/request', () => ({
      normalizeSpinePayload: vi.fn(() => ({
        agentId: 'agt_1',
        action: 'scan',
        input: { prompt: 'hello' },
        context: {},
        canonicalRequest: {
          action: 'scan',
          input: { prompt: 'hello' },
          context: {},
        },
      })),
    }));

    const { POST } = await import('../../../app/api/spine/execute/route');

    const req = new Request('http://localhost/api/spine/execute', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        authorization: 'Bearer dsg_live_good',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ agent_id: 'agt_1', input: { prompt: 'hello' } }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ request_id: 'req_1', decision: 'ALLOW' });
    expect(resolveAgentFromApiKey).toHaveBeenCalledWith('agt_1', 'dsg_live_good');
    expect(executeSpineIntent).toHaveBeenCalledWith({
      orgId: 'org_1',
      apiKey: 'dsg_live_good',
      payload: expect.objectContaining({ agentId: 'agt_1', action: 'scan' }),
    });
    expect(issueSpineIntent).not.toHaveBeenCalled();
  });

  it('issues intent and retries execute when no pending runtime intent exists', async () => {
    mockCors();
    mockRateLimit();
    mockApiError();

    const resolveAgentFromApiKey = vi.fn(async () => ({
      id: 'agt_1',
      org_id: 'org_1',
      status: 'active',
    }));

    const executeSpineIntent = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        body: { error: 'No pending runtime intent for request' },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: { request_id: 'req_2', decision: 'ALLOW' },
      });

    const issueSpineIntent = vi.fn(async () => ({
      ok: true,
      status: 200,
      body: { request_id: 'intent_1' },
    }));

    vi.doMock('../../../lib/agent-auth', () => ({
      resolveAgentFromApiKey,
    }));
    vi.doMock('../../../lib/spine/engine', () => ({
      executeSpineIntent,
      issueSpineIntent,
    }));
    vi.doMock('../../../lib/spine/request', () => ({
      normalizeSpinePayload: vi.fn(() => ({
        agentId: 'agt_1',
        action: 'scan',
        input: { prompt: 'retry me' },
        context: {},
        canonicalRequest: {
          action: 'scan',
          input: { prompt: 'retry me' },
          context: {},
        },
      })),
    }));

    const { POST } = await import('../../../app/api/spine/execute/route');

    const req = new Request('http://localhost/api/spine/execute', {
      method: 'POST',
      headers: {
        origin: 'https://app.example.com',
        authorization: 'Bearer dsg_live_good',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ agent_id: 'agt_1', input: { prompt: 'retry me' } }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ request_id: 'req_2', decision: 'ALLOW' });
    expect(issueSpineIntent).toHaveBeenCalledOnce();
    expect(executeSpineIntent).toHaveBeenCalledTimes(2);
  });
});
