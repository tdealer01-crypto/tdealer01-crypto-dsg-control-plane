import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import {
  getDSGCoreHealth,
  getDSGCoreMetrics,
  getDSGCoreLedger,
  getDSGCoreAuditEvents,
  getDSGCoreDeterminism,
} from "../../../../lib/dsg-core";

export const dynamic = "force-dynamic";

type AlertLevel = "warning" | "error";

type MonitorAlert = {
  level: AlertLevel;
  code: string;
  message: string;
};

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function parseBearerToken(req: Request) {
  const header = req.headers.get("authorization") || "";
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) return null;
  return value;
}

function requireCronAuth(req: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) {
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false as const,
        status: 500,
        error: "CRON_SECRET is required in production",
      };
    }
    return { ok: true as const };
  }

  const provided = parseBearerToken(req);
  if (provided !== configuredSecret) {
    return { ok: false as const, status: 401, error: "Unauthorized" };
  }

  return { ok: true as const };
}

function formatReadinessStatus(args: {
  coreHealthOk: boolean;
  coreMetricsOk: boolean;
  ledgerOk: boolean;
  auditOk: boolean;
  determinismOk: boolean;
}) {
  const reasons: string[] = [];

  if (!args.coreHealthOk) reasons.push("CORE_HEALTH_DOWN");
  if (!args.coreMetricsOk) reasons.push("CORE_METRICS_UNAVAILABLE");
  if (!args.ledgerOk) reasons.push("CORE_LEDGER_UNAVAILABLE");
  if (!args.auditOk) reasons.push("CORE_AUDIT_UNAVAILABLE");
  if (!args.determinismOk) reasons.push("CORE_DETERMINISM_UNAVAILABLE");

  const ready = reasons.length === 0;
  const status = ready ? "ready" : args.coreHealthOk ? "degraded" : "down";
  const score = Math.max(0, 100 - reasons.length * 18);

  return { ready, status, score, reasons };
}

async function collectOrgSnapshot(args: {
  orgId: string;
  billingPeriod: string;
  today: string;
  coreHealth: Awaited<ReturnType<typeof getDSGCoreHealth>>;
  coreMetrics: Awaited<ReturnType<typeof getDSGCoreMetrics>>;
  coreLedger: Awaited<ReturnType<typeof getDSGCoreLedger>>;
  coreAudit: Awaited<ReturnType<typeof getDSGCoreAuditEvents>>;
  determinism: Awaited<ReturnType<typeof getDSGCoreDeterminism>> | { ok: false; error: string };
}) {
  const admin = getSupabaseAdmin();
  const { orgId, billingPeriod, today, coreHealth, coreMetrics, coreLedger, coreAudit, determinism } =
    args;

  const [executionsRes, activeAgentsRes, usageCountersRes] = await Promise.all([
    admin.from("executions").select("decision, latency_ms, created_at").eq("org_id", orgId),
    admin
      .from("agents")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "active"),
    admin
      .from("usage_counters")
      .select("included_executions, overage_executions, projected_amount_usd, executions")
      .eq("org_id", orgId)
      .eq("billing_period", billingPeriod),
  ]);

  if (executionsRes.error) throw new Error(executionsRes.error.message);
  if (activeAgentsRes.error) throw new Error(activeAgentsRes.error.message);
  if (usageCountersRes.error) throw new Error(usageCountersRes.error.message);

  const executions = executionsRes.data || [];
  const todayExecutions = executions.filter((row) =>
    String(row.created_at || "").startsWith(today)
  );

  const total = todayExecutions.length;
  const allow = todayExecutions.filter((row) => row.decision === "ALLOW").length;
  const block = todayExecutions.filter((row) => row.decision === "BLOCK").length;
  const stabilize = todayExecutions.filter((row) => row.decision === "STABILIZE").length;

  const avgLatencyMs = total
    ? Number(
        (
          todayExecutions.reduce((sum, row) => sum + Number(row.latency_ms || 0), 0) / total
        ).toFixed(3)
      )
    : 0;

  const usageRows = usageCountersRes.data || [];
  const executionsThisMonth = usageRows.reduce(
    (sum, row) => sum + Number(row.executions || 0),
    0
  );
  const includedExecutions = usageRows.reduce(
    (sum, row) => sum + Number(row.included_executions || 0),
    0
  );
  const overageExecutions = usageRows.reduce(
    (sum, row) => sum + Number(row.overage_executions || 0),
    0
  );
  const projectedAmountUsd = usageRows.reduce(
    (sum, row) => sum + Number(row.projected_amount_usd || 0),
    0
  );

  const readiness = formatReadinessStatus({
    coreHealthOk: !!coreHealth.ok,
    coreMetricsOk: !!coreMetrics.ok,
    ledgerOk: !!coreLedger.ok,
    auditOk: !!coreAudit.ok,
    determinismOk: !!determinism.ok,
  });

  const alerts: MonitorAlert[] = [
    ...(!coreHealth.ok
      ? [
          {
            level: "error" as const,
            code: "CORE_DOWN",
            message: ("error" in coreHealth ? coreHealth.error : null) || "DSG core is unavailable",
          },
        ]
      : []),
    ...(!coreMetrics.ok
      ? [
          {
            level: "warning" as const,
            code: "CORE_METRICS_UNAVAILABLE",
            message: ("error" in coreMetrics ? coreMetrics.error : null) || "Core metrics unavailable",
          },
        ]
      : []),
    ...(!determinism.ok
      ? [
          {
            level: "warning" as const,
            code: "DETERMINISM_UNAVAILABLE",
            message: "error" in determinism ? determinism.error : "Latest determinism probe unavailable",
          },
        ]
      : []),
  ];

  const determinismData =
    determinism.ok && "data" in determinism ? determinism.data : null;

  const snapshotPayload = {
    org_id: orgId,
    snapshot_at: new Date().toISOString(),
    window_seconds: 60,
    core_health_ok: !!coreHealth.ok,
    core_metrics_ok: !!coreMetrics.ok,
    ledger_ok: !!coreLedger.ok,
    audit_ok: !!coreAudit.ok,
    determinism_ok: !!determinism.ok,
    health_source_path: "/api/core/health",
    metrics_source_path: "/api/core/metrics",
    ledger_source_path: "/api/core/ledger",
    audit_source_path: "/api/core/audit",
    determinism_source_path: "/api/core/determinism",
    latest_sequence: coreAudit.ok ? Number(coreAudit.items?.[0]?.sequence || 0) : null,
    deterministic: determinismData ? Boolean(determinismData.deterministic) : null,
    region_count: determinismData ? Number(determinismData.region_count || 0) : null,
    unique_state_hashes: determinismData
      ? Number(determinismData.unique_state_hashes || 0)
      : null,
    max_entropy: determinismData ? Number(determinismData.max_entropy || 0) : null,
    gate_action: determinismData ? determinismData.gate_action || null : null,
    requests_today: total,
    allow_count_today: allow,
    block_count_today: block,
    stabilize_count_today: stabilize,
    allow_rate: total ? allow / total : 0,
    block_rate: total ? block / total : 0,
    stabilize_rate: total ? stabilize / total : 0,
    avg_latency_ms: avgLatencyMs,
    active_agents: Number(activeAgentsRes.count || 0),
    executions_this_month: executionsThisMonth,
    included_executions: includedExecutions,
    overage_executions: overageExecutions,
    projected_amount_usd: projectedAmountUsd,
    readiness_status: readiness.status,
    readiness_score: readiness.score,
    readiness_reasons: readiness.reasons,
    alerts_count: alerts.length,
    alerts,
    raw_core_metrics: coreMetrics,
    raw_health: coreHealth,
    raw_ledger_summary: coreLedger,
    raw_audit_summary: coreAudit,
    raw_determinism: determinism,
  };

  const { data: snapshot, error: snapshotError } = await admin
    .from("core_monitor_snapshots")
    .insert(snapshotPayload)
    .select("id")
    .single();

  if (snapshotError) throw new Error(snapshotError.message);

  const { error: readinessError } = await admin.from("readiness_history").insert({
    org_id: orgId,
    recorded_at: new Date().toISOString(),
    status: readiness.status,
    score: readiness.score,
    core_health_ok: !!coreHealth.ok,
    core_metrics_ok: !!coreMetrics.ok,
    ledger_ok: !!coreLedger.ok,
    audit_ok: !!coreAudit.ok,
    determinism_ok: !!determinism.ok,
    reason_codes: readiness.reasons,
    details: {
      source_snapshot_id: snapshot.id,
      requests_today: total,
      active_agents: Number(activeAgentsRes.count || 0),
      alerts_count: alerts.length,
    },
  });

  if (readinessError) throw new Error(readinessError.message);

  if (alerts.length > 0) {
    const nowIso = new Date().toISOString();
    const alertRows = alerts.map((alert) => ({
      org_id: orgId,
      level: alert.level,
      code: alert.code,
      message: alert.message,
      source: "core" as const,
      status: "open" as const,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      occurrence_count: 1,
      severity_score: alert.level === "error" ? 85 : 60,
      fingerprint: `${orgId}:${alert.code}`,
      payload: alert,
      context: { source_snapshot_id: snapshot.id },
    }));

    const { error: alertsError } = await admin.from("alert_events").insert(alertRows);
    if (alertsError) throw new Error(alertsError.message);
  }

  return {
    orgId,
    snapshotId: snapshot.id,
    readiness: readiness.status,
    alerts: alerts.length,
  };
}

export async function GET(req: Request) {
  try {
    const auth = requireCronAuth(req);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = getSupabaseAdmin();
    const { data: users, error: usersError } = await admin
      .from("users")
      .select("org_id")
      .eq("is_active", true)
      .not("org_id", "is", null);

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 });
    }

    const orgIds = Array.from(new Set((users || []).map((row) => String(row.org_id))));

    if (orgIds.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, snapshots: [] });
    }

    const [coreHealth, coreMetrics, coreLedger, coreAudit] = await Promise.all([
      getDSGCoreHealth(),
      getDSGCoreMetrics(),
      getDSGCoreLedger(10),
      getDSGCoreAuditEvents(10),
    ]);

    const latestSequence =
      coreAudit.ok && Array.isArray(coreAudit.items) && coreAudit.items.length > 0
        ? Number(coreAudit.items[0]?.sequence || 0)
        : 0;

    const determinism =
      latestSequence > 0
        ? await getDSGCoreDeterminism(latestSequence)
        : ({ ok: false, error: "No sequence available" } as const);

    const billingPeriod = monthKey();
    const today = todayKey();

    const results = await Promise.all(
      orgIds.map((orgId) =>
        collectOrgSnapshot({
          orgId,
          billingPeriod,
          today,
          coreHealth,
          coreMetrics,
          coreLedger,
          coreAudit,
          determinism,
        })
      )
    );

    return NextResponse.json({
      ok: true,
      processed: results.length,
      snapshots: results,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
