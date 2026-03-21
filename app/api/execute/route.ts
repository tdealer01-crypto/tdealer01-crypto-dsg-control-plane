import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { getSupabaseAdmin } from "../../../lib/supabase-server";

export const dynamic = "force-dynamic";

type Decision = "ALLOW" | "STABILIZE" | "BLOCK";

function decideFromRisk(riskScore: number): {
  decision: Decision;
  reason: string;
  latency_ms: number;
  policy_version: string;
} {
  if (riskScore >= 0.8) {
    return {
      decision: "BLOCK",
      reason: "Blocked by risk threshold",
      latency_ms: 5,
      policy_version: "v1",
    };
  }

  if (riskScore >= 0.4) {
    return {
      decision: "STABILIZE",
      reason: "Requires stabilization review",
      latency_ms: 7,
      policy_version: "v1",
    };
  }

  return {
    decision: "ALLOW",
    reason: "Policy checks passed",
    latency_ms: 4,
    policy_version: "v1",
  };
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing Bearer token" },
        { status: 401 }
      );
    }

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Empty API key" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || !body.agent_id) {
      return NextResponse.json(
        { error: "agent_id is required" },
        { status: 400 }
      );
    }

    const agentId = String(body.agent_id);
    const input = body.input ?? {};
    const context = body.context ?? {};
    const riskScore = Number(context.risk_score ?? 0);

    const supabase = getSupabaseAdmin();
    const apiKeyHash = createHash("sha256").update(apiKey).digest("hex");

    const { data: agent, error: agentError } = await supabase
      .from("agents")
      .select("id, org_id, policy_id, status, monthly_limit")
      .eq("id", agentId)
      .eq("api_key_hash", apiKeyHash)
      .single();

    if (agentError || !agent) {
      return NextResponse.json(
        { error: "Invalid agent_id or API key" },
        { status: 401 }
      );
    }

    if (agent.status !== "active") {
      return NextResponse.json(
        { error: "Agent is not active" },
        { status: 403 }
      );
    }

    const result = decideFromRisk(riskScore);
    const nowIso = new Date().toISOString();
    const billingPeriod = nowIso.slice(0, 7);

    const { data: execution, error: executionError } = await supabase
      .from("executions")
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        decision: result.decision,
        latency_ms: result.latency_ms,
        request_payload: input,
        context_payload: context,
        policy_version: result.policy_version,
        reason: result.reason,
        created_at: nowIso,
      })
      .select("id, decision, latency_ms, policy_version, reason, created_at")
      .single();

    if (executionError || !execution) {
      return NextResponse.json(
        { error: executionError?.message || "Failed to insert execution" },
        { status: 500 }
      );
    }

    const { data: auditRow, error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        execution_id: execution.id,
        policy_version: result.policy_version,
        decision: result.decision,
        reason: result.reason,
        evidence: { risk_score: riskScore, input, context },
        created_at: nowIso,
      })
      .select("id")
      .single();

    if (auditError) {
      return NextResponse.json(
        { error: auditError.message },
        { status: 500 }
      );
    }

    const { error: usageEventError } = await supabase
      .from("usage_events")
      .insert({
        org_id: agent.org_id,
        agent_id: agent.id,
        execution_id: execution.id,
        event_type: "execution",
        quantity: 1,
        unit: "execution",
        amount_usd: 0.001,
        metadata: { decision: result.decision },
        created_at: nowIso,
      });

    if (usageEventError) {
      return NextResponse.json(
        { error: usageEventError.message },
        { status: 500 }
      );
    }

    const { data: counter } = await supabase
      .from("usage_counters")
      .select("id, executions")
      .eq("agent_id", agent.id)
      .eq("billing_period", billingPeriod)
      .maybeSingle();

    if (counter?.id) {
      const { error: counterUpdateError } = await supabase
        .from("usage_counters")
        .update({
          executions: Number(counter.executions || 0) + 1,
          updated_at: nowIso,
        })
        .eq("id", counter.id);

      if (counterUpdateError) {
        return NextResponse.json(
          { error: counterUpdateError.message },
          { status: 500 }
        );
      }
    } else {
      const { error: counterInsertError } = await supabase
        .from("usage_counters")
        .insert({
          org_id: agent.org_id,
          agent_id: agent.id,
          billing_period: billingPeriod,
          executions: 1,
          updated_at: nowIso,
        });

      if (counterInsertError) {
        return NextResponse.json(
          { error: counterInsertError.message },
          { status: 500 }
        );
      }
    }

    const { error: agentUpdateError } = await supabase
      .from("agents")
      .update({
        last_used_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", agent.id);

    if (agentUpdateError) {
      return NextResponse.json(
        { error: agentUpdateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        request_id: execution.id,
        decision: execution.decision,
        reason: execution.reason,
        latency_ms: execution.latency_ms,
        policy_version: execution.policy_version,
        audit_id: auditRow?.id ?? null,
        usage_counted: true,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 }
    );
  }
}
