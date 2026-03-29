const DEFAULT_DSG_CORE_URL = "http://localhost:8000";

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
  return {
    url: (process.env.DSG_CORE_URL || DEFAULT_DSG_CORE_URL).replace(/\/$/, ""),
    apiKey: process.env.DSG_CORE_API_KEY || process.env.DSG_API_KEY || "",
  };
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

type CoreFetchResult = {
  ok: boolean;
  path: string | null;
  status: number | null;
  data: any;
  error: string | null;
};

function shouldFallbackForStatus(status: number) {
  return status === 404 || status === 405;
}

async function fetchCoreJson(paths: string[]): Promise<CoreFetchResult> {
  const { url } = getDSGCoreConfig();

  let last: CoreFetchResult = {
    ok: false,
    path: null,
    status: null,
    data: null,
    error: "No DSG core path attempted",
  };

  for (const path of paths) {
    try {
      const response = await fetch(`${url}${path}`, {
        method: "GET",
        headers: coreHeaders(),
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return {
          ok: true,
          path,
          status: response.status,
          data,
          error: null,
        };
      }

      const failedResponse = {
        ok: false,
        path,
        status: response.status,
        data,
        error: parseError(data, response.status),
      };

      if (!shouldFallbackForStatus(response.status)) {
        return failedResponse;
      }

      last = failedResponse;
    } catch (error) {
      last = {
        ok: false,
        path,
        status: null,
        data: null,
        error: error instanceof Error ? error.message : "Failed to reach DSG core",
      };
    }
  }

  return last;
}

function normalizeLedgerItems(data: any, limit: number) {
  if (Array.isArray(data)) {
    return data.slice(0, limit);
  }

  if (Array.isArray(data?.items)) {
    return data.items.slice(0, limit);
  }

  if (Array.isArray(data?.events)) {
    return data.events.slice(0, limit);
  }

  if (Array.isArray(data?.data?.items)) {
    return data.data.items.slice(0, limit);
  }

  return [];
}

function synthesizeMetricsFromExecutions(data: any) {
  if (!Array.isArray(data)) return null;

  const decisions = data.map((row) =>
    String(row?.decision || row?.result?.decision || "").toUpperCase()
  );
  const allow = decisions.filter((decision) => decision === "ALLOW").length;
  const stabilize = decisions.filter((decision) => decision === "STABILIZE").length;
  const block = decisions.filter((decision) => decision === "BLOCK").length;

  return {
    total_executions: data.length,
    allow_count: allow,
    stabilize_count: stabilize,
    block_count: block,
  };
}

export async function getDSGCoreHealth() {
  const { url } = getDSGCoreConfig();
  const result = await fetchCoreJson(["/health", "/api/health"]);

  return {
    ok: result.ok,
    url,
    source_path: result.path,
    ...(result.ok ? result.data : {}),
    ...(result.ok ? {} : { error: result.error || "Failed to reach DSG core" }),
  };
}

export async function executeOnDSGCore(payload: DSGCoreExecutionRequest) {
  const { url } = getDSGCoreConfig();
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
}

export async function getDSGCoreMetrics() {
  const metricsResult = await fetchCoreJson(["/metrics", "/api/metrics"]);

  if (metricsResult.ok) {
    return {
      ok: true,
      data: metricsResult.data,
      source_path: metricsResult.path,
      synthesized: false,
    };
  }

  const executionsResult = await fetchCoreJson(["/api/executions"]);
  const synthesized = executionsResult.ok
    ? synthesizeMetricsFromExecutions(executionsResult.data)
    : null;

  if (synthesized) {
    return {
      ok: true,
      data: synthesized,
      source_path: executionsResult.path,
      synthesized: true,
    };
  }

  return {
    ok: false,
    error:
      metricsResult.error ||
      executionsResult.error ||
      "Failed to fetch DSG core metrics",
  };
}

export async function getDSGCoreLedger(limit = 20) {
  const result = await fetchCoreJson(["/ledger", "/api/ledger", "/ledger/verify"]);

  return {
    ok: result.ok,
    items: result.ok ? normalizeLedgerItems(result.data, limit) : [],
    source_path: result.path,
    ...(result.ok ? {} : { error: result.error || "Failed to fetch DSG core ledger" }),
  };
}

export async function getDSGCoreAuditEvents(limit = 20) {
  const result = await fetchCoreJson([
    `/audit/events?limit=${limit}`,
    `/audit/events`,
  ]);

  let items: DSGCoreAuditEvent[] = [];
  if (result.ok) {
    if (Array.isArray(result.data)) {
      items = result.data.slice(0, limit);
    } else if (Array.isArray((result.data as any)?.items)) {
      items = (result.data as any).items.slice(0, limit);
    } else if (Array.isArray((result.data as any)?.events)) {
      items = (result.data as any).events.slice(0, limit);
    } else if (Array.isArray((result.data as any)?.data?.items)) {
      items = (result.data as any).data.items.slice(0, limit);
    }
  }

  return {
    ok: result.ok,
    items,
    source_path: result.path,
    ...(result.ok ? {} : { error: result.error || "Failed to fetch DSG core audit events" }),
  };
}

export async function getDSGCoreDeterminism(sequence: number) {
  const result = await fetchCoreJson([
    `/audit/determinism/${sequence}`,
    `/audit/determinism?sequence=${sequence}`,
  ]);

  const determinismData =
    result.data && typeof result.data === "object" && "data" in result.data
      ? (result.data as any).data
      : result.data;

  return {
    ok: result.ok,
    source_path: result.path,
    ...(result.ok
      ? { data: determinismData as DSGCoreDeterminism }
      : { error: result.error || "Failed to fetch DSG core determinism" }),
  };
}
