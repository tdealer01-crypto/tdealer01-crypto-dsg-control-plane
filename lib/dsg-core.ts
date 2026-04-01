import { evaluateGate } from "./runtime/gate";

export type DSGCoreExecutionRequest = {
  agent_id: string;
  action: string;
  payload?: Record<string, unknown>;
};

export type DSGCoreAuditEvent = {
  id?: number;
  epoch: string | number | null;
  sequence: number;
  region_id: string;
  state_hash: string | null;
  entropy: number | null;
  gate_result: "ALLOW" | "STABILIZE" | "BLOCK" | string | null;
  z3_proof_hash?: string | null;
  signature?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string | null;
};

export type DSGCoreDeterminism = {
  sequence: number;
  region_count: number;
  unique_state_hashes: number;
  max_entropy: number;
  deterministic: boolean;
  gate_action: string;
};

export function getDSGCoreConfig() {
  const configuredUrl = process.env.DSG_CORE_URL?.replace(/\/$/, "") || "";

  return {
    url: configuredUrl,
    apiKey: process.env.DSG_CORE_API_KEY || process.env.DSG_API_KEY || "",
  };
}

function useInternalCore(url: string) {
  if (process.env.DSG_CORE_MODE === "internal") {
    return true;
  }
  return !url;
}

function resolveRiskScore(payload?: Record<string, unknown>) {
  const context = (payload?.context || {}) as Record<string, unknown>;
  const fromContext = Number(context.risk_score ?? context.riskScore);
  if (Number.isFinite(fromContext)) {
    return Math.max(0, Math.min(1, fromContext));
  }
  return 0.5;
}

function coreHeaders() {
  const { apiKey } = getDSGCoreConfig();
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };
}

function parseError(data: any, status: number) {
  return data?.detail || data?.error || `HTTP ${status}`;
}

export async function getDSGCoreHealth() {
  const { url } = getDSGCoreConfig();
  if (useInternalCore(url)) {
    return {
      ok: true,
      url: "internal://runtime-gate",
      status: "ok",
      version: "internal-runtime-gate",
      timestamp: new Date().toISOString(),
      mode: "internal",
    };
  }

  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      headers: coreHeaders(),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      url,
      ...data,
      ...(response.ok ? {} : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof Error ? error.message : "Failed to reach DSG core",
    };
  }
}

export async function executeOnDSGCore(payload: DSGCoreExecutionRequest) {
  const { url } = getDSGCoreConfig();
  if (useInternalCore(url)) {
    const riskScore = resolveRiskScore(payload.payload);
    const gate = evaluateGate({ riskScore });
    return {
      decision: gate.decision,
      reason: gate.reason,
      policy_version: "internal-runtime-gate-v1",
      latency_ms: 0,
      evaluated_at: new Date().toISOString(),
      stability_score: gate.decision === "ALLOW" ? 1 : gate.decision === "STABILIZE" ? 0.5 : 0,
      source: "internal",
    };
  }
  try {
    const response = await fetch(`${url}/execute`, {
      method: "POST",
      headers: coreHeaders(),
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(parseError(data, response.status));
    }

    return data;
  } catch (error) {
    throw error;
  }
}

export async function getDSGCoreMetrics() {
  const { url } = getDSGCoreConfig();

  try {
    const response = await fetch(`${url}/metrics`, {
      method: "GET",
      headers: coreHeaders(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      ...(response.ok ? { data } : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to fetch DSG core metrics",
    };
  }
}

export async function getDSGCoreLedger(limit = 20) {
  const { url } = getDSGCoreConfig();

  try {
    const response = await fetch(`${url}/ledger`, {
      method: "GET",
      headers: coreHeaders(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));
    const items = Array.isArray(data?.items) ? data.items.slice(0, limit) : [];
    return {
      ok: response.ok,
      items,
      ...(response.ok ? {} : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      items: [],
      error: error instanceof Error ? error.message : "Failed to fetch DSG core ledger",
    };
  }
}

export async function getDSGCoreAuditEvents(limit = 20) {
  const { url } = getDSGCoreConfig();

  try {
    const response = await fetch(`${url}/audit/events?limit=${limit}`, {
      method: "GET",
      headers: coreHeaders(),
      cache: "no-store",
    });
    const data = await response.json().catch(() => ({}));

    let items: DSGCoreAuditEvent[] = [];
    if (Array.isArray((data as any)?.items)) {
      items = (data as any).items;
    } else if (Array.isArray((data as any)?.events)) {
      items = (data as any).events;
    } else if (Array.isArray((data as any)?.data?.items)) {
      items = (data as any).data.items;
    }

    return {
      ok: response.ok,
      items,
      ...(response.ok ? {} : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      items: [] as DSGCoreAuditEvent[],
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch DSG core audit events",
    };
  }
}

export async function getDSGCoreDeterminism(sequence: number) {
  const { url } = getDSGCoreConfig();

  try {
    let response = await fetch(`${url}/audit/determinism/${sequence}`, {
      method: "GET",
      headers: coreHeaders(),
      cache: "no-store",
    });

    // Compatibility fallback is intentionally narrow:
    // - only retry with query-style endpoint when path-style endpoint is missing (404)
    // - do not hide upstream 4xx/5xx/non-404 errors behind a second request
    const shouldFallbackToQueryEndpoint = response.status === 404;
    if (shouldFallbackToQueryEndpoint) {
      response = await fetch(`${url}/audit/determinism?sequence=${sequence}`, {
        method: "GET",
        headers: coreHeaders(),
        cache: "no-store",
      });
    }

    const data = await response.json().catch(() => ({}));
    const determinismData =
      data && typeof data === "object" && "data" in data
        ? (data as any).data
        : data;

    return {
      ok: response.ok,
      ...(response.ok
        ? { data: determinismData as DSGCoreDeterminism }
        : { error: parseError(data, response.status) }),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch DSG core determinism",
    };
  }
}
