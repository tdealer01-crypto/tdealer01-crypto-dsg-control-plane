import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveAgentFromApiKeyMock,
  executeSpineIntentMock,
  issueSpineIntentMock,
  applyRateLimitMock,
  checkQuotaMock,
  incrementQuotaMock,
  verifySafeDomIntentOrPassMock,
} = vi.hoisted(() => ({
  resolveAgentFromApiKeyMock: vi.fn(),
  executeSpineIntentMock: vi.fn(),
  issueSpineIntentMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
  checkQuotaMock: vi.fn(),
  incrementQuotaMock: vi.fn(),
  verifySafeDomIntentOrPassMock: vi.fn(),
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

vi.mock('../../../lib/spine/verify-safe-dom-intent', () => ({
  verifySafeDomIntentOrPass: verifySafeDomIntentOrPassMock,
}));

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/spine/execute', {
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
  const mod = await import('../../../app/api/spine/execute/route');
  return mod.POST;
}

describe('/api/spine/execute Safe DOM integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    applyRateLimitMock.mockResolvedValue({ allowed: true, remaining: 59, reset: Date.now() + 60_000 });
    checkQuotaMock.mockResolvedValue({ allowed: true, used: 0, limit: 10000 });
    incrementQuotaMock.mockResolvedValue(undefined);
    resolveAgentFromApiKeyMock.mockResolvedValue({
      id: 'agent-safe-dom-test',
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
        reason: 'safe dom verified',
        latency_ms: 12,
        proof: { proof_hash: null, proof_version: null, theorem_set_id: null, solver: null },
      },
    });
  });

  it('Safe DOM command ALLOW: element verified and allowed', async () => {
    const POST = await loadPost();
    verifySafeDomIntentOrPassMock.mockResolvedValueOnce({
      decision: 'ALLOW',
      reason: 'Safe DOM element verified',
      elementId: 'app-e001',
      elementSelector: 'button.submit',
    });

    const req = request({
      agent_id: 'agent-safe-dom-test',
      action: 'submit_form',
      input: {
        sessionId: 'sess-abc123',
        safeDomCommand: {
          frameId: 'frame-main',
          elementId: 'app-e001',
          action: 'click',
        },
      },
    }, {
      authorization: 'Bearer test-api-key-safe-dom',
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toBe('ALLOW');
    expect(verifySafeDomIntentOrPassMock).toHaveBeenCalledOnce();
  });

  it('Safe DOM command BLOCK: element not in manifest', async () => {
    const POST = await loadPost();
    verifySafeDomIntentOrPassMock.mockResolvedValueOnce({
      decision: 'BLOCK',
      reason: 'Element app-e999 not found in manifest. Only exposed elements are allowed.',
      elementId: 'app-e999',
    });

    const req = request({
      agent_id: 'agent-safe-dom-test',
      action: 'submit_form',
      input: {
        sessionId: 'sess-abc123',
        safeDomCommand: {
          frameId: 'frame-main',
          elementId: 'app-e999',
          action: 'click',
        },
      },
    }, {
      authorization: 'Bearer test-api-key-safe-dom',
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Safe DOM verification failed');
    expect(body.decision).toBe('block');
    expect(body.element_id).toBe('app-e999');
    // Should NOT call executeSpineIntent on verification failure
    expect(executeSpineIntentMock).not.toHaveBeenCalled();
  });

  it('Safe DOM command REVIEW: element not visible, continues with metadata', async () => {
    const POST = await loadPost();
    verifySafeDomIntentOrPassMock.mockResolvedValueOnce({
      decision: 'REVIEW',
      reason: 'Element app-e002 is not currently visible. Manual review may be needed.',
      elementId: 'app-e002',
      elementSelector: 'button.submit',
    });

    const req = request({
      agent_id: 'agent-safe-dom-test',
      action: 'submit_form',
      input: {
        sessionId: 'sess-abc123',
        safeDomCommand: {
          frameId: 'frame-main',
          elementId: 'app-e002',
          action: 'click',
        },
      },
    }, {
      authorization: 'Bearer test-api-key-safe-dom',
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toBe('ALLOW');
    // Should call executeSpineIntent with review metadata
    expect(executeSpineIntentMock).toHaveBeenCalledOnce();
  });

  it('Legacy rawCommand (no Safe DOM): verification returns null, executes normally', async () => {
    const POST = await loadPost();
    verifySafeDomIntentOrPassMock.mockResolvedValueOnce(null);

    const req = request({
      agent_id: 'agent-safe-dom-test',
      action: 'query_db',
      input: {
        sessionId: 'sess-abc123',
        rawCommand: 'SELECT * FROM users WHERE id = 1',
      },
    }, {
      authorization: 'Bearer test-api-key-safe-dom',
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.decision).toBe('ALLOW');
    // Should call executeSpineIntent since no Safe DOM command
    expect(executeSpineIntentMock).toHaveBeenCalledOnce();
  });

  it('Rate limiting applies even with Safe DOM verification', async () => {
    const POST = await loadPost();
    applyRateLimitMock.mockResolvedValueOnce({ allowed: false, remaining: 0, reset: Date.now() + 60_000 });

    const req = request({
      agent_id: 'agent-safe-dom-test',
      action: 'submit_form',
      input: {
        sessionId: 'sess-abc123',
        safeDomCommand: {
          frameId: 'frame-main',
          elementId: 'app-e001',
          action: 'click',
        },
      },
    }, {
      authorization: 'Bearer test-api-key-safe-dom',
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('Too many requests');
    // Verification should NOT run if rate limit fails
    expect(verifySafeDomIntentOrPassMock).not.toHaveBeenCalled();
  });

  it('Quota check applies before Safe DOM verification', async () => {
    const POST = await loadPost();
    checkQuotaMock.mockResolvedValueOnce({ allowed: false, used: 10000, limit: 10000 });

    const req = request({
      agent_id: 'agent-safe-dom-test',
      action: 'submit_form',
      input: {
        sessionId: 'sess-abc123',
        safeDomCommand: {
          frameId: 'frame-main',
          elementId: 'app-e001',
          action: 'click',
        },
      },
    }, {
      authorization: 'Bearer test-api-key-safe-dom',
    });

    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(402);
    expect(body.error).toBe('Monthly execution quota exceeded');
    // Verification should NOT run if quota is exceeded
    expect(verifySafeDomIntentOrPassMock).not.toHaveBeenCalled();
  });

  it('Audit trail captures Safe DOM verification decision in context', async () => {
    const POST = await loadPost();
    let capturedPayload: Record<string, unknown> | undefined;

    executeSpineIntentMock.mockImplementation((args) => {
      capturedPayload = args.payload;
      return Promise.resolve({
        ok: true,
        status: 200,
        body: {
          request_id: 'exec-test-1',
          decision: 'ALLOW',
          reason: 'safe dom verified',
          latency_ms: 12,
          proof: { proof_hash: null, proof_version: null, theorem_set_id: null, solver: null },
        },
      });
    });

    verifySafeDomIntentOrPassMock.mockResolvedValueOnce({
      decision: 'REVIEW',
      reason: 'Element app-e002 is not visible but proceeding with review',
      elementId: 'app-e002',
    });

    const req = request({
      agent_id: 'agent-safe-dom-test',
      action: 'submit_form',
      input: {
        sessionId: 'sess-abc123',
        safeDomCommand: {
          frameId: 'frame-main',
          elementId: 'app-e002',
          action: 'click',
        },
      },
    }, {
      authorization: 'Bearer test-api-key-safe-dom',
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    // Verify audit metadata was added to context
    expect(capturedPayload?.context).toBeDefined();
    const context = capturedPayload?.context as Record<string, unknown>;
    expect(context?.safeDomReview).toBe('Element app-e002 is not visible but proceeding with review');
  });

  it('Missing sessionId: verification can proceed without it', async () => {
    const POST = await loadPost();
    verifySafeDomIntentOrPassMock.mockResolvedValueOnce(null);

    const req = request({
      agent_id: 'agent-safe-dom-test',
      action: 'submit_form',
      input: {
        safeDomCommand: {
          frameId: 'frame-main',
          elementId: 'app-e001',
          action: 'click',
        },
      },
    }, {
      authorization: 'Bearer test-api-key-safe-dom',
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(verifySafeDomIntentOrPassMock).toHaveBeenCalledOnce();
  });
});
