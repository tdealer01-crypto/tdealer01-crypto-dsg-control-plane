import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { createClient as createSupabaseServerClient } from "../../../../lib/supabase/server";
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

type WarningItem = {
  level: "warning" | "error";
  code: string;
  stage: string;
  message: string;
};

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isSupabaseSchemaDriftError(error: unknown) {
  const message = String((error as { message?: unknown })?.message || "").toLowerCase();
  return (
    message.includes("pgrst") ||
    message.includes("schema cache") ||
    message.includes("undefined table") ||
    message.includes("does not exist") ||
    message.includes("relation") ||
    message.includes("could not find") ||
    message.includes("function")
  );
}

function formatReadinessStatus(args: {
  coreHealthOk: boolean;
  coreMetricsOk: boolean;
  ledgerOk: boolean;
  auditOk: boolean;
  determinismOk: boolean;
  billingOk: boolean;
  usageOk: boolean;
}) {
  const reasons: string[] = [];

  if (!args.coreHealthOk) reasons.push("CORE_HEALTH_DOWN");
  if (!args.coreMetricsOk) reasons.push("CORE_METRICS_UNAVAILABLE");
  if (!args.ledgerOk) reasons.push("CORE_LEDGER_UNAVAILABLE");
  if (!args.auditOk) reasons.push("CORE_AUDIT_UNAVAILABLE");
  if (!args.determinismOk) reasons.push("CORE_DETERMINISM_UNAVAILABLE");
  if (!args.billingOk) reasons.push("BILLING_UNAVAILABLE");
  if (!args.usageOk) reasons.push("USAGE_UNAVAILABLE");

  const ready = reasons.length === 0;
  const status = ready ? "ready" : args.coreHealthOk ? "degraded" : "down";
  const score = Math.max(0, 100 - reasons.length * 16);

  return { ready, status, score, reasons };
}

export async function GET() {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.monitor);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const orgId = access.orgId;
    let admin: Awaited<ReturnType<typeof createSupabaseServerClient>> | ReturnType<typeof getSupabaseAdmin>;
    try {
      admin = getSupabaseAdmin();
    } catch {
      // Fallback for deployments that do not expose service-role env vars.
      admin = await createSupabaseServerClient();
    }

    const warnings: WarningItem[] = [];

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
      getDSGCoreMetrics({ orgId }),
      getDSGCoreLedger(10, { orgId }),
      getDSGCoreAuditEvents(10, { orgId }),
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
      if (isSupabaseSchemaDriftError(executionsRes.error)) {
        warnings.push({
          level: "warning",
          code: "EXECUTIONS_UNAVAILABLE",
          stage: "executions-query",
          message: "Executions query unavailable (schema drift or missing relation).",
        });
      } else {
        return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
      }
    }

    if (activeAgentsRes.error) {
      logApiError("api/core/monitor", activeAgentsRes.error, { stage: "agents-query" });
      if (isSupabaseSchemaDriftError(activeAgentsRes.error)) {
        warnings.push({
          level: "warning",
          code: "AGENTS_UNAVAILABLE",
          stage: "agents-query",
          message: "Agents query unavailable (schema drift or missing relation).",
        });
      } else {
        return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
      }
    }

    if (usageCountersRes.error) {
      logApiError("api/core/monitor", usageCountersRes.error, { stage: "usage-counters-query" });
      if (isSupabaseSchemaDriftError(usageCountersRes.error)) {
        warnings.push({
          level: "warning",
          code: "USAGE_COUNTERS_UNAVAILABLE",
          stage: "usage-counters-query",
          message: "Usage counters unavailable (schema drift or missing relation).",
        });
      } else {
        return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
      }
    }

    if (subscriptionRes.error) {
      // Billing table may not exist yet in early deployments.
      if (isSupabaseSchemaDriftError(subscriptionRes.error)) {
        logApiError("api/core/monitor", subscriptionRes.error, { stage: "subscription-query" });
        warnings.push({
          level: "warning",
          code: "SUBSCRIPTION_UNAVAILABLE",
          stage: "subscription-query",
          message: "Billing subscription unavailable (schema drift or missing relation).",
        });
      } else {
        logApiError("api/core/monitor", subscriptionRes.error, { stage: "subscription-query" });
        return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
      }
    }

    const executions = executionsRes.error ? [] : executionsRes.data || [];
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

    const activeAgents = activeAgentsRes.error ? 0 : Number(activeAgentsRes.count || 0);
    const executionsThisMonth = usageCountersRes.error
      ? 0
      : (usageCountersRes.data || []).reduce(
          (sum, row) => sum + Number(row.executions || 0),
          0
        );

    const latestSequence =
      coreAudit.ok && Array.isArray(coreAudit.items) && coreAudit.items.length > 0
        ? Number(coreAudit.items[0]?.sequence || 0)
        : 0;

    const determinism =
      latestSequence > 0
        ? await getDSGCoreDeterminism(latestSequence, { orgId })
        : { ok: false as const, error: "No sequence available" };

    const billingOk = !subscriptionRes.error;
    const usageOk = !usageCountersRes.error;

    const readiness = formatReadinessStatus({
      coreHealthOk: !!coreHealth.ok,
      coreMetricsOk: !!coreMetrics.ok,
      ledgerOk: !!coreLedger.ok,
      auditOk: !!coreAudit.ok,
      determinismOk: !!determinism.ok,
      billingOk,
      usageOk,
    });

    const alerts = [
      ...warnings,
      ...(!coreHealth.ok
        ? [
            {
              level: "error" as const,
              code: "CORE_DOWN",
              stage: "core-health",
              message: ("error" in coreHealth ? coreHealth.error : null) || "DSG core is unavailable",
            },
          ]
        : []),
      ...(!coreMetrics.ok
        ? [
            {
              level: "warning" as const,
              code: "CORE_METRICS_UNAVAILABLE",
              stage: "core-metrics",
              message: ("error" in coreMetrics ? coreMetrics.error : null) || "Core metrics unavailable",
            },
          ]
        : []),
      ...(!determinism.ok
        ? [
            {
              level: "warning" as const,
              code: "DETERMINISM_UNAVAILABLE",
              stage: "core-determinism",
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
              level: "warning" as const,
              code: "BILLING_PAST_DUE",
              stage: "billing",
              message: "Billing status is past_due",
            },
          ]
        : []),
      ...(subscriptionRes.data?.status === "unpaid"
        ? [
            {
              level: "error" as const,
              code: "BILLING_UNPAID",
              stage: "billing",
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
