import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DsgOneClient, createClientFromEnv } from "../src/client";

describe("DsgOneClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("tracks authentication state and supports API key updates", () => {
    const client = new DsgOneClient({ baseUrl: "https://example.test" });

    expect(client.isAuthenticated()).toBe(false);
    expect(client.getApiKey()).toBeUndefined();

    client.setApiKey("dsg_live_test");

    expect(client.isAuthenticated()).toBe(true);
    expect(client.getApiKey()).toBe("dsg_live_test");
  });

  it("creates a client from explicit environment values", () => {
    const client = createClientFromEnv({
      DSG_API_KEY: "dsg_live_env",
      DSG_BASE_URL: "https://env.example.test",
    });

    expect(client.getApiKey()).toBe("dsg_live_env");
    expect(client.isAuthenticated()).toBe(true);
  });

  it("sends governed execute requests with bearer authentication", async () => {
    const responseBody = {
      ok: true,
      request_id: "req_1",
      audit_id: "audit_1",
      decision: "ALLOW",
      decision_normalized: "allow",
      reason: null,
      latency_ms: 1,
      policy_version: "test",
      replayed: false,
      ledger_sequence: 1,
      truth_sequence: 1,
      usage: { used: 1, limit: 10, remaining: 9 },
      proof: {
        proof_hash: "sha256:test",
        proof_version: "1",
        theorem_set_id: "test",
        solver: "test",
      },
      authoritative_plugin_id: "test",
      pipeline_trace: [],
    };

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new DsgOneClient({
      baseUrl: "https://api.example.test",
      apiKey: "dsg_live_test",
      defaultHeaders: { "X-DSG-Test": "1" },
    });

    const result = await client.execute({
      agentId: "agent_123",
      action: "scan",
      input: { target: "example" },
      context: { sessionId: "session_1" },
    });

    expect(result.decision).toBe("ALLOW");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/api/execute");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-DSG-Test": "1",
      Authorization: "Bearer dsg_live_test",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      agent_id: "agent_123",
      action: "scan",
      input: { target: "example" },
      context: { sessionId: "session_1" },
    });
  });

  it("encodes list-agent query parameters deterministically", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
          pagination: { page: 2, per_page: 25, total: 0, total_pages: 0 },
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new DsgOneClient({ baseUrl: "https://api.example.test" });
    await client.listAgents({ page: 2, perPage: 25, includeDisabled: true });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api.example.test/api/agents?page=2&per_page=25&include_disabled=true"
    );
    expect(init.method).toBe("GET");
  });

  it("maps API failures to deterministic DSG error codes", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Invalid agent_id or API key" }), {
        status: 401,
        statusText: "Unauthorized",
        headers: { "content-type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new DsgOneClient({ baseUrl: "https://api.example.test" });

    await expect(
      client.execute({ agentId: "bad", action: "scan", input: {} })
    ).rejects.toMatchObject({
      name: "DsgOneError",
      message: "Invalid agent_id or API key",
      status: 401,
      code: "INVALID_CREDENTIALS",
    });
  });
});
