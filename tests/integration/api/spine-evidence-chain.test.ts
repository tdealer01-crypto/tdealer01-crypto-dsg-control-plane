/**
 * Integration test — /api/spine/execute evidence chain
 *
 * Verifies that the spine execution route:
 *   1. Returns 200 with decision, proof, and audit_id fields on success
 *   2. Includes pipeline_trace array in the response body
 *   3. Calls the runtime commit / quota side-effects when execution succeeds
 *   4. Correctly propagates stop_reason from the execution state machine
 *
 * All external dependencies (Supabase, agent-auth, spine engine) are mocked.
 * No live DB is used.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any import that touches these modules
// ---------------------------------------------------------------------------

const {
  resolveAgentFromApiKeyMock,
  executeSpineIntentMock,
  issueSpineIntentMock,
  applyRateLimitMock,
  checkQuotaMock,
  incrementQuotaMock,
  fireWebhookMock,
  meterExecutionMock,
  verifySafeDomIntentOrPassMock,
} = vi.hoisted(() => ({
  resolveAgentFromApiKeyMock: vi.fn(),
  executeSpineIntentMock: vi.fn(),
  issueSpineIntentMock: vi.fn(),
  applyRateLimitMock: vi.fn(),
  checkQuotaMock: vi.fn(),
  incrementQuotaMock: vi.fn(),
  fireWebhookMock: vi.fn(),
  meterExecutionMock: vi.fn(),
  verifySafeDomIntentOrPassMock: vi.fn(),
}));

vi.mock("../../../lib/agent-auth", () => ({
  resolveAgentFromApiKey: resolveAgentFromApiKeyMock,
}));

vi.mock("../../../lib/spine/engine", () => ({
  executeSpineIntent: executeSpineIntentMock,
  issueSpineIntent: issueSpineIntentMock,
}));

vi.mock("../../../lib/security/rate-limit", () => ({
  applyRateLimit: applyRateLimitMock,
  buildRateLimitHeaders: (rateLimit: { remaining?: number; reset?: number }, limit: number) => ({
    "x-ratelimit-limit": String(limit),
    "x-ratelimit-remaining": String(rateLimit.remaining ?? limit),
    "x-ratelimit-reset": String(rateLimit.reset ?? Date.now() + 60_000),
  }),
  getRateLimitKey: () => "spine-execute:test",
}));

vi.mock("../../../lib/security/cors", () => ({
  buildCorsHeaders: (_req: unknown, extraHeaders?: Record<string, string>) =>
    new Headers({
      "access-control-allow-origin": "*",
      ...(extraHeaders instanceof Headers
        ? Object.fromEntries(extraHeaders.entries())
        : extraHeaders || {}),
    }),
  buildPreflightResponse: () =>
    new Response(null, {
      status: 204,
      headers: { "access-control-allow-origin": "*" },
    }),
}));

vi.mock("../../../lib/usage/quota", () => ({
  checkQuota: checkQuotaMock,
  incrementQuota: incrementQuotaMock,
}));

vi.mock("../../../lib/webhooks/deliver", () => ({
  fireWebhook: fireWebhookMock,
}));

vi.mock("../../../lib/billing/metered", () => ({
  meterExecution: meterExecutionMock,
}));

vi.mock("../../../lib/spine/verify-safe-dom-intent", () => ({
  verifySafeDomIntentOrPass: verifySafeDomIntentOrPassMock,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpineRequest(
  body: Record<string, unknown>,
  apiKey = "Bearer dsg_live_test_key"
) {
  return new Request("http://localhost/api/spine/execute", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: apiKey,
    },
    body: JSON.stringify(body),
  });
}

async function loadPost() {
  const mod = await import("../../../app/api/spine/execute/route");
  return mod.POST;
}

// ---------------------------------------------------------------------------
// Default mock state
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  applyRateLimitMock.mockResolvedValue({
    allowed: true,
    remaining: 59,
    reset: Date.now() + 60_000,
  });

  checkQuotaMock.mockResolvedValue({ allowed: true, used: 0, limit: 10_000 });
  incrementQuotaMock.mockResolvedValue(undefined);
  fireWebhookMock.mockResolvedValue(undefined);
  meterExecutionMock.mockResolvedValue(undefined);
  verifySafeDomIntentOrPassMock.mockResolvedValue(null); // pass-through

  resolveAgentFromApiKeyMock.mockResolvedValue({
    id: "agt_evidence_test",
    org_id: "org_evidence_test",
    status: "active",
    monthly_limit: 10_000,
  });

  // Default successful execution: includes decision, proof, audit_id, pipeline_trace
  executeSpineIntentMock.mockResolvedValue({
    ok: true,
    status: 200,
    body: {
      request_id: "req_evidence_001",
      decision: "ALLOW",
      reason: "Policy gate passed",
      proof: "sha256:abcdef1234567890",
      audit_id: "audit_evidence_001",
      pipeline_trace: [
        { step: "auth", result: "pass", latency_ms: 2 },
        { step: "quota", result: "pass", latency_ms: 1 },
        { step: "gate", result: "allow", latency_ms: 8 },
      ],
      policy_version: "v1",
    },
  });
});

// ---------------------------------------------------------------------------
// Test suite: successful execution with evidence chain
// ---------------------------------------------------------------------------

describe("/api/spine/execute — full evidence chain on success", () => {
  it("returns 200 with decision field", async () => {
    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test", action: "scan" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(["ALLOW", "BLOCK", "STABILIZE", "REVIEW"]).toContain(body.decision);
  });

  it("response body contains proof field", async () => {
    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test", action: "scan" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("proof");
    expect(typeof body.proof).toBe("string");
    expect(body.proof.length).toBeGreaterThan(0);
  });

  it("response body contains audit_id field", async () => {
    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test", action: "scan" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("audit_id");
    expect(typeof body.audit_id).toBe("string");
  });

  it("response body contains pipeline_trace array", async () => {
    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test", action: "scan" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("pipeline_trace");
    expect(Array.isArray(body.pipeline_trace)).toBe(true);
    expect(body.pipeline_trace.length).toBeGreaterThan(0);
  });

  it("calls resolveAgentFromApiKey with correct agent_id and API key", async () => {
    const POST = await loadPost();
    const req = makeSpineRequest(
      { agent_id: "agt_evidence_test", action: "scan" },
      "Bearer dsg_live_test_key"
    );
    await POST(req as never);

    expect(resolveAgentFromApiKeyMock).toHaveBeenCalledWith(
      "agt_evidence_test",
      "dsg_live_test_key"
    );
  });

  it("calls executeSpineIntent with orgId, apiKey, and payload", async () => {
    const POST = await loadPost();
    const req = makeSpineRequest(
      { agent_id: "agt_evidence_test", action: "scan", input: { prompt: "test" } },
      "Bearer dsg_live_test_key"
    );
    await POST(req as never);

    expect(executeSpineIntentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org_evidence_test",
        apiKey: "dsg_live_test_key",
        payload: expect.objectContaining({ agentId: "agt_evidence_test" }),
      })
    );
  });

  it("increments quota on successful 200 response", async () => {
    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test" });
    const res = await POST(req as never);

    expect(res.status).toBe(200);
    // Allow for the fire-and-forget pattern (void promise)
    // incrementQuota is called but not awaited, so we wait a tick
    await new Promise((r) => setTimeout(r, 10));
    expect(incrementQuotaMock).toHaveBeenCalledWith("org_evidence_test", "agt_evidence_test");
  });

  it("response includes stop_reason field from execution state machine", async () => {
    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(body).toHaveProperty("stop_reason");
    // NONE is the expected stop_reason when execution proceeds normally
    expect(body.stop_reason).toBe("NONE");
  });
});

// ---------------------------------------------------------------------------
// Test suite: BLOCK decision in evidence chain
// ---------------------------------------------------------------------------

describe("/api/spine/execute — BLOCK decision evidence chain", () => {
  it("returns 200 with BLOCK decision and includes proof/audit_id", async () => {
    executeSpineIntentMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: {
        request_id: "req_block_001",
        decision: "BLOCK",
        reason: "Policy gate blocked: risk too high",
        proof: "sha256:block_proof_hash",
        audit_id: "audit_block_001",
        pipeline_trace: [
          { step: "auth", result: "pass", latency_ms: 2 },
          { step: "gate", result: "block", latency_ms: 5 },
        ],
      },
    });

    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test", action: "risky_action" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.decision).toBe("BLOCK");
    expect(body).toHaveProperty("proof");
    expect(body).toHaveProperty("audit_id");
    expect(Array.isArray(body.pipeline_trace)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Test suite: intent issue / retry path
// ---------------------------------------------------------------------------

describe("/api/spine/execute — issues intent and retries when 409 returned", () => {
  it("calls issueSpineIntent then retries executeSpineIntent on 409", async () => {
    executeSpineIntentMock
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        body: { error: "No pending runtime intent for request" },
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        body: {
          request_id: "req_retry_001",
          decision: "ALLOW",
          proof: "sha256:retry_proof",
          audit_id: "audit_retry_001",
          pipeline_trace: [],
        },
      });

    issueSpineIntentMock.mockResolvedValue({
      ok: true,
      status: 200,
      body: { request_id: "intent_retry_001" },
    });

    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test", action: "scan" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.decision).toBe("ALLOW");
    expect(issueSpineIntentMock).toHaveBeenCalledOnce();
    expect(executeSpineIntentMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Test suite: auth / validation errors
// ---------------------------------------------------------------------------

describe("/api/spine/execute — authentication and validation errors", () => {
  it("returns 401 when Bearer token is missing", async () => {
    const POST = await loadPost();
    const req = new Request("http://localhost/api/spine/execute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agent_id: "agt_evidence_test" }),
    });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ error: "Missing Bearer token" });
  });

  it("returns 401 when agent resolves to null", async () => {
    resolveAgentFromApiKeyMock.mockResolvedValue(null);

    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toMatch(/invalid agent_id or api key/i);
  });

  it("returns 403 when agent status is not active", async () => {
    resolveAgentFromApiKeyMock.mockResolvedValue({
      id: "agt_suspended",
      org_id: "org_evidence_test",
      status: "suspended",
    });

    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_suspended" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/not active/i);
  });

  it("returns 402 when quota is exceeded and does not call executeSpineIntent", async () => {
    checkQuotaMock.mockResolvedValue({
      allowed: false,
      used: 10_000,
      limit: 10_000,
      upgradeUrl: "https://app.dsg.pics/pricing",
    });

    const POST = await loadPost();
    const req = makeSpineRequest({ agent_id: "agt_evidence_test" });
    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toMatch(/quota exceeded/i);
    expect(executeSpineIntentMock).not.toHaveBeenCalled();
  });
});
