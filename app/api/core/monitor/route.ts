import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { requireOrgRole } from "../../../../lib/authz";
import { RuntimeRouteRoles } from "../../../../lib/runtime/permissions";
import { internalErrorMessage, logApiError } from "../../../../lib/security/api-error";
import {
  getDSGCoreHealth,
  getDSGCoreMetrics,
  getDSGCoreLedger,
  getDSGCoreAuditEvents,
  getDSGCoreDeterminism,
} from "../../../../lib/dsg-core";

export const dynamic = "force-dynamic";

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatReadinessStatus(args: {
  coreHealthOk: boolean;
  coreMetricsOk: boolean;
  ledgerOk: boolean;
  auditOk: boolean;
  determinismOk: boolean;
  billingOk: boolean;
}) {
  const reasons: string[] = [];

  if (!args.coreHealthOk) reasons.push("CORE_HEALTH_DOWN");
  if (!args.coreMetricsOk) reasons.push("CORE_METRICS_UNAVAILABLE");
  if (!args.ledgerOk) reasons.push("CORE_LEDGER_UNAVAILABLE");
  if (!args.auditOk) reasons.push("CORE_AUDIT_UNAVAILABLE");
  if (!args.determinismOk) reasons.push("CORE_DETERMINISM_UNAVAILABLE");
  if (!args.billingOk) reasons.push("BILLING_UNAVAILABLE");

  const ready = reasons.length === 0;
  const status = ready ? "ready" : args.coreHealthOk ? "degraded" : "down";
  const score = Math.max(0, 100 - reasons.length * 18);

  return { ready, status, score, reasons };
}

export async function GET() {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.monitor);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const orgId = access.orgId;
    const admin = getSupabaseAdmin();
    const today = todayKey();
    const billingPeriod = monthKey();

    const [
      coreHealth,
      coreMetrics,
      coreLedger,
      coreAudit,
      executionsRes,
      activeAgentsRes,
      usageCountersRes,
      subscriptionRes,
    ] = await Promise.all([
      getDSGCoreHealth(),
      getDSGCoreMetrics(),
      getDSGCoreLedger(10),
      getDSGCoreAuditEvents(10),
      admin
        .from("executions")
        .select("decision, latency_ms, created_at")
        .eq("org_id", orgId),
      admin
        .from("agents")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("status", "active"),
      admin
        .from("usage_counters")
        .select("executions")
        .eq("org_id", orgId)
        .eq("billing_period", billingPeriod),
      admin
        .from("billing_subscriptions")
        .select(
          "plan_key, billing_interval, status, current_period_start, current_period_end, trial_end, updated_at"
        )
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (executionsRes.error) {
      logApiError("api/core/monitor", executionsRes.error, { stage: "executions-query" });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    if (activeAgentsRes.error) {
      logApiError("api/core/monitor", activeAgentsRes.error, { stage: "agents-query" });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    if (usageCountersRes.error) {
      logApiError("api/core/monitor", usageCountersRes.error, { stage: "usage-counters-query" });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    if (
      subscriptionRes.error &&
      !/relation .* does not exist/i.test(subscriptionRes.error.message)
    ) {
      logApiError("api/core/monitor", subscriptionRes.error, { stage: "subscription-query" });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    const executions = executionsRes.data || [];
    const todayExecutions = executions.filter((row) =>
      String(row.created_at || "").startsWith(today)
    );

    const total = todayExecutions.length;
    const allow = todayExecutions.filter((row) => row.decision === "ALLOW").length;
    const block = todayExecutions.filter((row) => row.decision === "BLOCK").length;
    const stabilize = todayExecutions.filter((row) => row.decision === "STABILIZE").length;

    const avgLatencyMs = total
      ? Math.round(
          todayExecutions.reduce((sum, row) => sum + Number(row.latency_ms || 0), 0) / total
        )
      : 0;

    const activeAgents = Number(activeAgentsRes.count || 0);
    const executionsThisMonth = (usageCountersRes.data || []).reduce(
      (sum, row) => sum + Number(row.executions || 0),
      0
    );

    const latestSequence =
      coreAudit.ok && Array.isArray(coreAudit.items) && coreAudit.items.length > 0
        ? Number(coreAudit.items[0]?.sequence || 0)
        : 0;

    const determinism =
      latestSequence > 0
        ? await getDSGCoreDeterminism(latestSequence)
        : { ok: false as const, error: "No sequence available" };

    const billingOk = !subscriptionRes.error;
    const readiness = formatReadinessStatus({
      coreHealthOk: !!coreHealth.ok,
      coreMetricsOk: !!coreMetrics.ok,
      ledgerOk: !!coreLedger.ok,
      auditOk: !!coreAudit.ok,
      determinismOk: !!determinism.ok,
      billingOk,
    });

    const alerts = [
      ...(!coreHealth.ok
        ? [
            {
              level: "error",
              code: "CORE_DOWN",
              message: ("error" in coreHealth ? coreHealth.error : null) || "DSG core is unavailable",
            },
          ]
        : []),
      ...(!coreMetrics.ok
        ? [
            {
              level: "warning",
              code: "CORE_METRICS_UNAVAILABLE",
              message: ("error" in coreMetrics ? coreMetrics.error : null) || "Core metrics unavailable",
            },
          ]
        : []),
      ...(!determinism.ok
        ? [
            {
              level: "warning",
              code: "DETERMINISM_UNAVAILABLE",
              message:
                "error" in determinism
                  ? determinism.error
                  : "Latest determinism probe unavailable",
            },
          ]
        : []),
      ...(subscriptionRes.data?.status === "past_due"
        ? [
            {
              level: "warning",
              code: "BILLING_PAST_DUE",
              message: "Billing status is past_due",
            },
          ]
        : []),
      ...(subscriptionRes.data?.status === "unpaid"
        ? [
            {
              level: "error",
              code: "BILLING_UNPAID",
              message: "Billing status is unpaid",
            },
          ]
        : []),
    ];

    return NextResponse.json({
      ok: true,
      generated_at: new Date().toISOString(),
      org_id: orgId,
      readiness,
      core: {
        health: coreHealth,
        metrics: coreMetrics,
        ledger: coreLedger,
        audit_events: coreAudit,
        determinism,
      },
      control_plane: {
        requests_today: total,
        allow_rate: total ? allow / total : 0,
        block_rate: total ? block / total : 0,
        stabilize_rate: total ? stabilize / total : 0,
        avg_latency_ms: avgLatencyMs,
        active_agents: activeAgents,
      },
      billing: {
        subscription: subscriptionRes.data || null,
        executions_this_month: executionsThisMonth,
      },
      alerts,
    });
  } catch (error) {
    logApiError("api/core/monitor", error, { stage: "unhandled" });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
