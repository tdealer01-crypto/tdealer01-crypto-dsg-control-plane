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
    const supabase = createClient();

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

    const auditEvents = (await getDSGCoreAuditEvents(limit)) as {
      ok?: boolean;
      items?: RawAuditEvent[];
      error?: string | null;
    };

    const rawItems = Array.isArray(auditEvents.items) ? auditEvents.items : [];
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
        const result = (await getDSGCoreDeterminism(sequence)) as {
          ok?: boolean;
          data?: unknown;
          error?: string | null;
        };

        return {
          sequence,
          ok: Boolean(result?.ok),
          data: result?.ok ? (result.data ?? null) : null,
          error: result?.ok ? null : (result?.error ?? "Failed to fetch determinism"),
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

    return NextResponse.json({
      ok: true,
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
