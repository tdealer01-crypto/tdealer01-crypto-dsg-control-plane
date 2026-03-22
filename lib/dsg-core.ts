const DEFAULT_DSG_CORE_URL = "http://localhost:8000";

export type DSGCoreExecutionRequest = {
  agent_id: string;
  action: string;
  payload?: Record<string, unknown>;
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

export async function getDSGCoreHealth() {
  const { url } = getDSGCoreConfig();

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
      ...(response.ok ? {} : { error: data?.detail || data?.error || `HTTP ${response.status}` }),
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
  const response = await fetch(`${url}/execute`, {
    method: "POST",
    headers: coreHeaders(),
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || data?.error || `DSG core execution failed (${response.status})`);
  }

  return data;
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
      ...(response.ok ? { data } : { error: data?.detail || data?.error || `HTTP ${response.status}` }),
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
      ...(response.ok ? {} : { error: data?.detail || data?.error || `HTTP ${response.status}` }),
    };
  } catch (error) {
    return {
      ok: false,
      items: [],
      error: error instanceof Error ? error.message : "Failed to fetch DSG core ledger",
    };
  }
}
