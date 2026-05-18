"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Agent = {
  agent_id: string;
  name: string;
  policy_id?: string;
  status: string;
  monthly_limit: number;
  usage_this_month: number;
  api_key_preview: string;
};

type Execution = {
  id: string;
  agent_id: string;
  decision: "ALLOW" | "STABILIZE" | "BLOCK";
  latency_ms: number;
  policy_version: string | null;
  reason: string | null;
  created_at: string;
};

type UsageSummary = {
  plan: string;
  subscription_status?: string;
  billing_period: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_end?: string | null;
  executions: number;
  included_executions: number;
  overage_executions: number;
  projected_amount_usd: number;
};

type OnboardingStatePayload = {
  org_id?: string;
  onboarding?: {
    bootstrap_status?: string;
    checklist?: {
      steps?: string[];
      next_action?: string;
    };
    bootstrapped_at?: string | null;
  } | null;
  is_empty?: boolean;
  has_agent?: boolean;
  has_first_execution?: boolean;
  first_run_complete?: boolean;
  next_action?: string;
};

type HealthPayload = {
  ok: boolean;
  service: string;
  timestamp: string;
  core_ok?: boolean;
  core?: {
    ok?: boolean;
    url?: string;
    error?: string;
    version?: string;
    status?: string;
  };
};

type AuditEvent = {
  id?: number;
  epoch: string;
  sequence: number;
  region_id: string;
  state_hash: string;
  entropy: number;
  gate_result: string;
  z3_proof_hash?: string | null;
  signature?: string | null;
  created_at: string;
};

type DeterminismResult = {
  sequence: number;
  ok: boolean;
  data: null | {
    sequence: number;
    region_count: number;
    unique_state_hashes: number;
    max_entropy: number;
    deterministic: boolean;
    gate_action: string;
  };
  error: string | null;
};

// ── helpers ──────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

function formatSubscriptionStatus(status: string | undefined): string {
  if (!status) return "Not set";
  const normalized = status.trim().toLowerCase();
  const known: Record<string, string> = {
    active: "Active", trialing: "Trialing", past_due: "Past due",
    unpaid: "Unpaid", canceled: "Canceled", cancelled: "Canceled",
    pastdue: "Past due", in_trial: "Trialing", incomplete: "Incomplete",
    incomplete_expired: "Incomplete expired",
  };
  return known[normalized] ?? normalized.split(/[\s_-]+/).filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

function normalizeAgent(input: unknown): Agent | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (typeof row.agent_id !== "string" || typeof row.name !== "string") return null;
  if (typeof row.status !== "string" || typeof row.monthly_limit !== "number") return null;
  return {
    agent_id: row.agent_id, name: row.name,
    policy_id: typeof row.policy_id === "string" ? row.policy_id : undefined,
    status: row.status, monthly_limit: row.monthly_limit,
    usage_this_month: typeof row.usage_this_month === "number" ? row.usage_this_month : 0,
    api_key_preview: typeof row.api_key_preview === "string" ? row.api_key_preview : "n/a",
  };
}

function normalizeUsageSummary(input: unknown): UsageSummary | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (
    typeof row.plan !== "string" || typeof row.billing_period !== "string" ||
    typeof row.executions !== "number" || typeof row.included_executions !== "number" ||
    typeof row.overage_executions !== "number" || typeof row.projected_amount_usd !== "number"
  ) return null;
  return {
    plan: row.plan, subscription_status: typeof row.subscription_status === "string" ? row.subscription_status : undefined,
    billing_period: row.billing_period,
    current_period_start: typeof row.current_period_start === "string" ? row.current_period_start : null,
    current_period_end: typeof row.current_period_end === "string" ? row.current_period_end : null,
    trial_end: typeof row.trial_end === "string" ? row.trial_end : null,
    executions: row.executions, included_executions: row.included_executions,
    overage_executions: row.overage_executions, projected_amount_usd: row.projected_amount_usd,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try { return new Date(value).toLocaleString(); } catch { return value; }
}

function decisionColor(value?: string | null) {
  const v = (value || "").toUpperCase();
  if (v === "BLOCK" || v === "FREEZE") return "border-red-400/25 bg-red-500/10 text-red-100";
  if (v === "STABILIZE" || v === "WARN") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
}

// ── skeleton rows ─────────────────────────────────────────────────────────────

function AgentSkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((n) => (
        <div key={n} className="border border-white/10 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-52" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </>
  );
}

function ExecutionSkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((n) => (
        <div key={n} className="border border-white/10 bg-black/20 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      ))}
    </>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [auditItems, setAuditItems] = useState<AuditEvent[]>([]);
  const [determinism, setDeterminism] = useState<DeterminismResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [auditError, setAuditError] = useState<string>("");
  const [onboardingState, setOnboardingState] = useState<OnboardingStatePayload | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setAuditError("");

    try {
      const results = await Promise.allSettled([
        fetch("/api/agents", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, json: await r.json() })),
        fetch("/api/executions?limit=10", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, json: await r.json() })),
        fetch("/api/usage", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, json: await r.json() })),
        fetch("/api/health", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, json: await r.json() })),
        fetch("/api/audit?limit=20", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, json: await r.json() })),
        fetch("/api/onboarding/state", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, json: await r.json() })),
      ]);

      const warnings: string[] = [];
      const [agentsResult, executionsResult, usageResult, healthResult, auditResult, onboardingResult] = results;

      if (agentsResult.status === "fulfilled" && agentsResult.value.ok) {
        const normalized = Array.isArray(agentsResult.value.json?.items)
          ? agentsResult.value.json.items.map(normalizeAgent).filter((a: Agent | null): a is Agent => a !== null)
          : [];
        setAgents(normalized);
      } else {
        warnings.push("Agents failed to load");
      }

      if (executionsResult.status === "fulfilled" && executionsResult.value.ok) {
        setExecutions(executionsResult.value.json.executions || []);
      } else {
        warnings.push("Executions failed to load");
      }

      if (usageResult.status === "fulfilled" && usageResult.value.ok) {
        const payload = usageResult.value.json?.summary ?? usageResult.value.json;
        setSummary(normalizeUsageSummary(payload));
      } else {
        warnings.push("Usage data failed to load");
      }

      if (healthResult.status === "fulfilled" && healthResult.value.ok) {
        setHealth(healthResult.value.json || null);
      } else {
        warnings.push("Health check failed to load");
      }

      if (auditResult.status === "fulfilled" && auditResult.value.ok) {
        setAuditItems(auditResult.value.json.items || []);
        setDeterminism(auditResult.value.json.determinism || []);
        if (auditResult.value.json.error) setAuditError(auditResult.value.json.error);
      } else {
        setAuditItems([]);
        setDeterminism([]);
        setAuditError("Audit data unavailable — some metrics may be stale");
      }

      if (onboardingResult.status === "fulfilled" && onboardingResult.value.ok) {
        setOnboardingState(onboardingResult.value.json as OnboardingStatePayload);
      } else {
        warnings.push("Setup progress unavailable");
      }

      if (warnings.length > 0) setError(warnings.join(" · "));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, retryCount]);

  const overview = useMemo(() => [
    { label: "Active agents", value: String(agents.length), helper: "Governed operator endpoints", href: "/dashboard/agents" },
    { label: "Executions this period", value: String(summary?.executions ?? executions.length), helper: summary?.billing_period || "Current billing period", href: "/dashboard/executions" },
    { label: "Projected spend", value: `$${(summary?.projected_amount_usd ?? 0).toFixed(2)}`, helper: summary?.plan || "No plan", href: "/dashboard/billing" },
    { label: "Runtime health", value: loading ? "" : (health?.core_ok ? "Online" : "Degraded"), helper: health?.core?.version || "—", href: undefined },
  ], [agents.length, executions.length, health?.core?.version, health?.core_ok, loading, summary?.billing_period, summary?.executions, summary?.plan, summary?.projected_amount_usd]);

  const deterministicCount = useMemo(() => determinism.filter((d) => d.ok && d.data?.deterministic).length, [determinism]);
  const freezeCount = useMemo(() => determinism.filter((d) => d.ok && (d.data?.gate_action || "").toUpperCase() === "FREEZE").length, [determinism]);

  const onboardingProgress = useMemo(() => {
    const completed = [
      Boolean(onboardingState?.org_id),
      Boolean(onboardingState?.has_agent),
      Boolean(onboardingState?.first_run_complete),
    ].filter(Boolean).length;
    return { completed, total: 3, percent: Math.round((completed / 3) * 100) };
  }, [onboardingState]);

  return (
    <main className="min-h-screen bg-[#090a0d] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Hero */}
        <section className="relative overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(126,16,24,0.22),rgba(9,10,13,0.88)_32%,rgba(245,197,92,0.08)_120%)] p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">DSG Control Plane</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl">
                Operational clarity for governed approvals, runtime health, and audit evidence.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                Current system posture, queues, evidence, and actions your operators need to move safely.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/command-center" className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">
                Open command center
              </Link>
              <Link href="/dashboard/agents" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                Agents
              </Link>
              <Link href="/dashboard/audit" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                Audit
              </Link>
            </div>
          </div>
        </section>

        {/* Error banner with retry */}
        {error ? (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-amber-400/25 bg-amber-400/10 px-5 py-4">
            <p className="text-sm text-amber-100">{error}</p>
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="shrink-0 rounded-lg border border-amber-300/30 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/10"
            >
              Retry
            </button>
          </div>
        ) : null}

        {/* KPI cards */}
        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {overview.map((item) => (
            <div key={item.label} className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <div className="mt-4">
                {loading ? (
                  <Skeleton className="h-8 w-20" />
                ) : item.href ? (
                  <Link href={item.href} className="text-3xl font-semibold text-white hover:text-amber-200 transition-colors">
                    {item.value}
                  </Link>
                ) : (
                  <p className={`text-3xl font-semibold ${item.value === "Degraded" ? "text-red-300" : "text-white"}`}>
                    {item.value}
                  </p>
                )}
              </div>
              <p className="mt-2 text-sm text-slate-500">{item.helper}</p>
            </div>
          ))}
        </section>

        {/* Onboarding + audit counts */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-emerald-400/20 bg-emerald-400/10 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/80">Setup progress</p>
                <h2 className="mt-2 text-xl font-semibold text-emerald-50">
                  {loading ? <Skeleton className="h-6 w-44" /> : `${onboardingProgress.completed}/${onboardingProgress.total} steps complete`}
                </h2>
              </div>
              {!loading && (
                <Link
                  href={onboardingState?.first_run_complete ? "/dashboard/executions" : "/dashboard/skills"}
                  className="rounded-xl border border-emerald-200/30 px-4 py-2 text-sm font-semibold text-emerald-100"
                >
                  {onboardingState?.first_run_complete ? "View executions" : "Continue setup"}
                </Link>
              )}
            </div>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-black/30">
              {loading ? (
                <div className="h-2 w-1/3 animate-pulse rounded-full bg-emerald-400/40" />
              ) : (
                <div className="h-2 rounded-full bg-emerald-300 transition-all" style={{ width: `${onboardingProgress.percent}%` }} />
              )}
            </div>
            {!loading && onboardingState?.next_action ? (
              <p className="mt-4 text-sm text-emerald-100/80">Next: {onboardingState.next_action}</p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Audit events</p>
              <p className="mt-1 text-xs text-slate-600">Last 20 recorded</p>
              <div className="mt-3">
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-3xl font-semibold text-white">{auditItems.length}</p>}
              </div>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Gate checks</p>
              <p className="mt-1 text-xs text-slate-600">Deterministic decisions</p>
              <div className="mt-3">
                {loading ? <Skeleton className="h-8 w-12" /> : <p className="text-3xl font-semibold text-white">{deterministicCount}</p>}
              </div>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Freeze alerts</p>
              <p className="mt-1 text-xs text-slate-600">Actions flagged to freeze</p>
              <div className="mt-3">
                {loading ? <Skeleton className="h-8 w-12" /> : (
                  <p className={`text-3xl font-semibold ${freezeCount > 0 ? "text-amber-300" : "text-white"}`}>
                    {freezeCount}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Core status */}
        <section className="mt-6 border border-white/10 bg-[#0d0f12] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Runtime status</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">DSG core connection</h2>
            </div>
            {loading ? (
              <Skeleton className="h-7 w-20 rounded-full" />
            ) : (
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${health?.core_ok ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-red-400/25 bg-red-500/10 text-red-100"}`}>
                {health?.core_ok ? "online" : "offline"}
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              { label: "Service", value: health?.service },
              { label: "Last checked", value: formatDate(health?.timestamp) },
              { label: "Core version", value: health?.core?.version },
              { label: "Core URL", value: health?.core?.url, wide: true },
              { label: "Status note", value: health?.core?.error || health?.core?.status },
            ].map(({ label, value, wide }) => (
              <div key={label} className={`border-l border-amber-300/35 bg-white/[0.03] p-4 ${wide ? "md:col-span-2" : ""}`}>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <div className="mt-3">
                  {loading ? <Skeleton className="h-4 w-32" /> : <p className="break-all text-sm text-slate-200">{value || "—"}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Agents + Executions */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Your agents</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Active agents</h2>
              </div>
              {!loading && (
                <span className="text-sm text-slate-500">{agents.length} {agents.length === 1 ? "agent" : "agents"}</span>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {loading ? <AgentSkeletonRows /> : agents.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 px-5 py-8 text-center">
                  <p className="font-semibold text-slate-200">No agents yet</p>
                  <p className="mt-1 text-sm text-slate-500">Create your first agent to start governing actions.</p>
                  <Link href="/dashboard/agents" className="mt-4 inline-block rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950">
                    Create agent
                  </Link>
                </div>
              ) : (
                agents.map((agent) => (
                  <div key={agent.agent_id} className="border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{agent.name}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{agent.agent_id}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${agent.status === "active" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-slate-600 bg-slate-800/60 text-slate-300"}`}>
                        {agent.status}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-slate-400 md:grid-cols-2">
                      <p>Limit: {agent.monthly_limit.toLocaleString()} / mo</p>
                      <p>Used: {agent.usage_this_month.toLocaleString()}</p>
                      <p>Policy: {agent.policy_id || "auto"}</p>
                      <p className="font-mono">Key: {agent.api_key_preview || "—"}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Recent decisions</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Last 10 executions</h2>
              </div>
              {!loading && (
                <Link href="/dashboard/executions" className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
                  View all →
                </Link>
              )}
            </div>

            <div className="mt-5 space-y-3">
              {loading ? <ExecutionSkeletonRows /> : executions.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-black/20 px-5 py-8 text-center">
                  <p className="font-semibold text-slate-200">No executions yet</p>
                  <p className="mt-1 text-sm text-slate-500">Run your first governed action to see decisions here.</p>
                  <Link href="/dashboard/integrations" className="mt-4 inline-block rounded-lg bg-emerald-400/10 px-4 py-2 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/20">
                    Set up integration
                  </Link>
                </div>
              ) : (
                executions.map((execution) => (
                  <div key={execution.id} className="border border-white/10 bg-black/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-white">{execution.decision}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">{execution.id}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs ${decisionColor(execution.decision)}`}>
                        {execution.latency_ms} ms
                      </span>
                    </div>
                    <div className="mt-3 grid gap-1 text-sm text-slate-400">
                      <p>Policy: {execution.policy_version || "—"}</p>
                      {execution.reason ? <p>Reason: {execution.reason}</p> : null}
                      <p>{formatDate(execution.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Billing */}
        <section className="mt-6 border border-white/10 bg-[#0d0f12] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Current plan</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Billing & usage</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/billing" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                Manage billing
              </Link>
              <Link href="/dashboard/audit/matrix" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                Audit matrix
              </Link>
            </div>
          </div>

          {auditError ? (
            <div className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
              {auditError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Billing period", value: summary?.billing_period },
              { label: "Plan", value: summary?.plan },
              { label: "Subscription", value: formatSubscriptionStatus(summary?.subscription_status) },
              { label: "Period ends", value: formatDate(summary?.current_period_end) },
            ].map(({ label, value }) => (
              <div key={label} className="border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
                <div className="mt-3">
                  {loading ? <Skeleton className="h-4 w-24" /> : <p className="text-sm font-medium text-slate-200">{value || "—"}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
