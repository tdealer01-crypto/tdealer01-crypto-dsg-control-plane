import { supabaseAdmin } from "@/lib/supabase-admin";
import { evaluateDSG, type DSGAction, type DSGSignal } from "@/lib/dsg-gate";
import { buildLedgerEntry } from "@/lib/audit-ledger";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const agent = String(body.agent ?? "unknown-agent");
    const prevState = body.prev_state ?? null;
    const nextState = body.next_state ?? {};
    const action = (body.action ?? { type: "UNKNOWN" }) as DSGAction;
    const signals = ((body.signals ?? []) as DSGSignal[]).map((s) => ({
      source: String(s.source ?? "unknown"),
      value: Number(s.value ?? 0)
    }));

    const evaluation = evaluateDSG({
      prevState,
      nextState,
      action,
      signals
    });

    let hashPrev: string | null = null;

    if (supabaseAdmin) {
      const { data: rows } = await supabaseAdmin
        .from("execution_audit")
        .select("hash")
        .order("id", { ascending: false })
        .limit(1);

      hashPrev = rows?.[0]?.hash ?? null;
    }

    const ledger = buildLedgerEntry({
      agent,
      action_type: action.type,
      prev_state: prevState,
      next_state: nextState,
      decision: evaluation.decision,
      reason: evaluation.reason,
      phase: evaluation.phase,
      drift: evaluation.drift,
      stability: evaluation.stability,
      harmonic_center: evaluation.harmonicCenter,
      entropy: evaluation.entropy,
      hash_prev: hashPrev
    });

    if (supabaseAdmin) {
      await supabaseAdmin.from("execution_audit").insert(ledger);
    }

    return Response.json({
      ok: true,
      agent,
      action: action.type,
      ...evaluation,
      hash: ledger.hash,
      hash_prev: ledger.hash_prev
    });
  } catch (error) {
    console.error("DSG evaluate failed:", error);
    return Response.json(
      { ok: false, error: "DSG evaluate failed" },
      { status: 500 }
    );
  }
}
