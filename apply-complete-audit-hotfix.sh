#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

mkdir -p lib app/api/health app/api/audit app/api/audit/matrix

cat > lib/dsg-core.ts <<'FILE'
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

    if (response.status === 404) {
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
FILE

cat > app/api/health/route.ts <<'FILE'
import { getDSGCoreHealth } from '../../../lib/dsg-core';

export async function GET() {
  const core = await getDSGCoreHealth();

  return Response.json({
    ok: core.ok,
    service: 'dsg-control-plane',
    timestamp: new Date().toISOString(),
    core_ok: core.ok,
    error: core.ok ? null : core.error ?? null,
    core,
  });
}
FILE

cat > app/api/audit/route.ts <<'FILE'
import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";
import {
  getDSGCoreAuditEvents,
  getDSGCoreDeterminism,
  type DSGCoreDeterminism,
} from "../../../lib/dsg-core";

export const dynamic = "force-dynamic";

type DeterminismResult = Awaited<ReturnType<typeof getDSGCoreDeterminism>>;

function hasDeterminismData(
  result: DeterminismResult
): result is { ok: true; data: DSGCoreDeterminism } {
  return result.ok && "data" in result;
}

function getDeterminismError(result: DeterminismResult) {
  if (!result.ok && "error" in result) {
    return result.error;
  }

  return "Unknown error";
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("org_id, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile?.org_id || !profile.is_active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 100);

    const auditEvents = await getDSGCoreAuditEvents(limit);

    const sequences = Array.from(
      new Set(
        (auditEvents.items || [])
          .map((item) => Number(item.sequence))
          .filter((n) => Number.isFinite(n))
      )
    ).slice(0, 5);

    const determinismResults = await Promise.all(
      sequences.map(async (sequence) => {
        const result = await getDSGCoreDeterminism(sequence);

        if (hasDeterminismData(result)) {
          return {
            sequence,
            ok: true,
            data: result.data,
            error: null,
          };
        }

        return {
          sequence,
          ok: false,
          data: null,
          error: getDeterminismError(result),
        };
      })
    );

    const overallOk = auditEvents.ok && determinismResults.every((res) => res.ok);
    const determinismErrors = determinismResults
      .filter((res) => !res.ok)
      .map((res) => res.error)
      .filter(Boolean);

    return NextResponse.json({
      ok: overallOk,
      items: auditEvents.items,
      determinism: determinismResults,
      core_ok: auditEvents.ok,
      error: overallOk
        ? null
        : auditEvents.ok
          ? determinismErrors.join("; ")
          : auditEvents.error ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
FILE

cat > app/api/audit/matrix/route.ts <<'FILE'
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { getDSGCoreAuditEvents, getDSGCoreDeterminism } from "../../../../lib/dsg-core";

export const dynamic = "force-dynamic";

type RawAuditEvent = Record<string, unknown>;

type MatrixCell = {
  sequence: number;
  region_id: string;
  entropy: number | null;
  gate_result: string | null;
  state_hash: string | null;
  created_at: string | null;
  epoch: number | null;
  z3_proof_hash: string | null;
  signature: string | null;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return null;
}

function toIsoDateString(value: unknown): string | null {
  if (typeof value === "string") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
  }

  return null;
}

function clampLimit(value: string | null, fallback = 100, max = 100) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.trunc(parsed), max);
}

function normalizeAuditEvent(item: RawAuditEvent): MatrixCell | null {
  const sequence = toFiniteNumber(item.sequence);
  const region_id =
    toStringValue(item.region_id) ??
    toStringValue(item.region) ??
    toStringValue(item.regionId);

  if (sequence === null || !region_id) {
    return null;
  }

  return {
    sequence,
    region_id,
    entropy: toFiniteNumber(item.entropy),
    gate_result:
      toStringValue(item.gate_result) ??
      toStringValue(item.gateResult),
    state_hash:
      toStringValue(item.state_hash) ??
      toStringValue(item.stateHash),
    created_at:
      toIsoDateString(item.created_at) ??
      toIsoDateString(item.timestamp),
    epoch: toFiniteNumber(item.epoch),
    z3_proof_hash:
      toStringValue(item.z3_proof_hash) ??
      toStringValue(item.z3ProofHash),
    signature: toStringValue(item.signature),
  };
}

function pickMoreRecentCell(current: MatrixCell | undefined, candidate: MatrixCell) {
  if (!current) return candidate;

  const currentTime = current.created_at ? new Date(current.created_at).getTime() : Number.NaN;
  const candidateTime = candidate.created_at ? new Date(candidate.created_at).getTime() : Number.NaN;

  if (Number.isFinite(candidateTime) && Number.isFinite(currentTime)) {
    return candidateTime >= currentTime ? candidate : current;
  }

  if (Number.isFinite(candidateTime)) return candidate;
  if (Number.isFinite(currentTime)) return current;

  const currentEpoch = current.epoch ?? Number.NEGATIVE_INFINITY;
  const candidateEpoch = candidate.epoch ?? Number.NEGATIVE_INFINITY;

  return candidateEpoch >= currentEpoch ? candidate : current;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("org_id, is_active")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError || !profile?.org_id || !profile.is_active) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const limit = clampLimit(url.searchParams.get("limit"), 100, 100);

    const auditEvents = await getDSGCoreAuditEvents(limit);

    const rawItems = Array.isArray(auditEvents?.items) ? auditEvents.items : [];
    const normalizedItems = rawItems
      .map((item) => normalizeAuditEvent(item))
      .filter((item): item is MatrixCell => item !== null);

    const sequences = Array.from(new Set(normalizedItems.map((item) => item.sequence))).sort((a, b) => a - b);
    const regions = Array.from(new Set(normalizedItems.map((item) => item.region_id))).sort((a, b) =>
      a.localeCompare(b)
    );

    const cellMap = new Map<string, MatrixCell>();

    for (const item of normalizedItems) {
      const key = `${item.sequence}::${item.region_id}`;
      const current = cellMap.get(key);
      cellMap.set(key, pickMoreRecentCell(current, item));
    }

    const cells: MatrixCell[] = [];
    for (const region_id of regions) {
      for (const sequence of sequences) {
        const existing = cellMap.get(`${sequence}::${region_id}`);
        cells.push(
          existing ?? {
            sequence,
            region_id,
            entropy: null,
            gate_result: null,
            state_hash: null,
            created_at: null,
            epoch: null,
            z3_proof_hash: null,
            signature: null,
          }
        );
      }
    }

    const determinism = await Promise.all(
      sequences.map(async (sequence) => {
        const result = await getDSGCoreDeterminism(sequence);
        return {
          sequence,
          ok: result.ok ?? false,
          data: result.ok ? (result.data ?? null) : null,
          error: result.ok
            ? null
            : result.error ?? "Failed to fetch determinism",
        };
      })
    );

    const summary = {
      audit_event_count: rawItems.length,
      normalized_event_count: normalizedItems.length,
      sequence_count: sequences.length,
      region_count: regions.length,
      cell_count: cells.length,
      populated_cell_count: normalizedItems.length,
      determinism_count: determinism.length,
      determinism_ok_count: determinism.filter((item) => item.ok).length,
      determinism_error_count: determinism.filter((item) => !item.ok).length,
      core_ok: Boolean(auditEvents?.ok),
      core_error: auditEvents?.ok ? null : (auditEvents?.error ?? "Failed to fetch audit events"),
      generated_at: new Date().toISOString(),
    };

    const overallOk = (auditEvents.ok ?? false) && determinism.every((d) => d.ok);

    return NextResponse.json({
      ok: overallOk,
      sequences,
      regions,
      cells,
      determinism,
      summary,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
FILE

echo "[OK] wrote complete audit hotfix files"
git status
