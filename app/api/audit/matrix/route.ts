import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import {
  getDSGCoreAuditEvents,
  getDSGCoreDeterminism,
} from "../../../../lib/dsg-core";

export const dynamic = "force-dynamic";

type MatrixCell = {
  sequence: number;
  region_id: string;
  entropy: number;
  gate_result: string;
  state_hash: string;
  created_at: string;
  epoch: string;
  z3_proof_hash?: string | null;
  signature?: string | null;
};

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
    const limit = Math.min(
      Math.max(Number(url.searchParams.get("limit") || "60"), 1),
      200
    );

    const auditEvents = await getDSGCoreAuditEvents(limit);

    if (!auditEvents.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: auditEvents.error || "Failed to fetch DSG core audit events",
        },
        { status: 502 }
      );
    }

    const rawItems = Array.isArray(auditEvents.items) ? auditEvents.items : [];

    const items: MatrixCell[] = rawItems.map((item: any) => ({
      sequence: Number(item.sequence),
      region_id: String(item.region_id || "unknown"),
      entropy: Number(item.entropy ?? 0),
      gate_result: String(item.gate_result || "UNKNOWN"),
      state_hash: String(item.state_hash || "-"),
      created_at: String(item.created_at || ""),
      epoch: String(item.epoch || "-"),
      z3_proof_hash: item.z3_proof_hash ?? null,
      signature: item.signature ?? null,
    }));

    const sequences = Array.from(
      new Set(items.map((item) => item.sequence).filter((n) => Number.isFinite(n)))
    ).sort((a, b) => b - a);

    const regions = Array.from(
      new Set(items.map((item) => item.region_id).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    const determinism = await Promise.all(
      sequences.slice(0, 40).map(async (sequence) => {
        const result = await getDSGCoreDeterminism(sequence);
        return {
          sequence,
          ok: result.ok,
          data: result.ok ? result.data : null,
          error: result.ok ? null : result.error,
        };
      })
    );

    const deterministicCount = determinism.filter(
      (item) => item.ok && item.data?.deterministic
    ).length;

    const freezeCount = determinism.filter(
      (item) => item.ok && item.data?.gate_action === "FREEZE"
    ).length;

    return NextResponse.json({
      ok: true,
      sequences,
      regions,
      cells: items,
      determinism,
      summary: {
        audit_events: items.length,
        sequence_count: sequences.length,
        region_count: regions.length,
        deterministic_count: deterministicCount,
        freeze_count: freezeCount,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 }
    );
  }
}
