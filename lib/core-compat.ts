import { getDSGCoreConfig } from "./dsg-core";

export type ReadProbe = {
  path: string;
  ok: boolean;
  status: number | null;
  error: string | null;
  keys: string[];
};

export type CoreCompatibilityProfile =
  | "canonical_gate"
  | "dsg_one_runtime"
  | "unknown";

const READ_PATHS = [
  "/health",
  "/api/health",
  "/metrics",
  "/ledger",
  "/api/ledger",
  "/ledger/verify",
  "/api/executions",
  "/api/proofs",
  "/audit/events?limit=1",
  "/audit/determinism/1",
] as const;

function coreHeaders() {
  const { apiKey } = getDSGCoreConfig();
  return {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  };
}

async function probePath(baseUrl: string, path: string): Promise<ReadProbe> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: coreHeaders(),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    const keys = data && typeof data === "object" ? Object.keys(data).slice(0, 20) : [];

    return {
      path,
      ok: response.ok,
      status: response.status,
      error: response.ok ? null : String((data as any)?.detail || (data as any)?.error || `HTTP ${response.status}`),
      keys,
    };
  } catch (error) {
    return {
      path,
      ok: false,
      status: null,
      error: error instanceof Error ? error.message : "Probe failed",
      keys: [],
    };
  }
}

function inferProfile(probes: ReadProbe[]): {
  profile: CoreCompatibilityProfile;
  reason: string;
  recommended_paths: {
    health: string | null;
    execute: string | null;
    ledger: string | null;
    metrics: string | null;
    audit: string | null;
  };
} {
  const has = (path: string) => probes.find((probe) => probe.path === path)?.ok === true;

  if (has("/api/health") && (has("/api/ledger") || has("/api/executions"))) {
    return {
      profile: "dsg_one_runtime",
      reason: "Runtime-style /api endpoints are reachable and match the known DSG-ONE surface.",
      recommended_paths: {
        health: "/api/health",
        execute: "/api/execute-v2",
        ledger: "/api/ledger",
        metrics: null,
        audit: null,
      },
    };
  }

  if (has("/health") && has("/ledger/verify") && !has("/api/health")) {
    return {
      profile: "canonical_gate",
      reason: "Reference gate endpoints are reachable and match the known canonical FastAPI surface.",
      recommended_paths: {
        health: "/health",
        execute: "/evaluate",
        ledger: "/ledger/verify",
        metrics: null,
        audit: null,
      },
    };
  }

  return {
    profile: "unknown",
    reason: "No single known endpoint profile matched cleanly from read-only probes.",
    recommended_paths: {
      health: has("/api/health") ? "/api/health" : has("/health") ? "/health" : null,
      execute: null,
      ledger: has("/api/ledger") ? "/api/ledger" : has("/ledger") ? "/ledger" : has("/ledger/verify") ? "/ledger/verify" : null,
      metrics: has("/metrics") ? "/metrics" : null,
      audit: has("/audit/events?limit=1") ? "/audit/events" : null,
    },
  };
}

export async function getDSGCoreCompatibility() {
  const { url } = getDSGCoreConfig();
  if (!url || process.env.DSG_CORE_MODE === "internal") {
    return {
      target_url: "internal://runtime-gate",
      probes: [] as ReadProbe[],
      inferred: {
        profile: "unknown" as const,
        reason: "Internal runtime gate mode is enabled; external DSG core endpoint probing is skipped.",
        recommended_paths: {
          health: null,
          execute: null,
          ledger: null,
          metrics: null,
          audit: null,
        },
      },
      note: "Compatibility probes only apply to external DSG core endpoints.",
    };
  }
  const probes = await Promise.all(READ_PATHS.map((path) => probePath(url, path)));
  const inferred = inferProfile(probes);

  return {
    target_url: url,
    probes,
    inferred,
    note: "Execute-path recommendations are inferred from known repo truth and read-only endpoint probes. They are not write-path verification.",
  };
}
