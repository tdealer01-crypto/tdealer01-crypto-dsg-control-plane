"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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


function formatSubscriptionStatus(status: string | undefined): string {
  if (!status) return "Not set";

  const normalized = status.trim().toLowerCase();
  const knownStatuses: Record<string, string> = {
    active: "Active",
    trialing: "Trialing",
    past_due: "Past due",
    unpaid: "Unpaid",
    canceled: "Canceled",
    incomplete: "Incomplete",
    incomplete_expired: "Incomplete expired",
  };

  if (knownStatuses[normalized]) return knownStatuses[normalized];

  return normalized
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeAgent(input: unknown): Agent | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;
  if (typeof row.agent_id !== "string" || typeof row.name !== "string") return null;
  if (typeof row.status !== "string" || typeof row.monthly_limit !== "number") return null;

  return {
    agent_id: row.agent_id,
    name: row.name,
    policy_id: typeof row.policy_id === "string" ? row.policy_id : undefined,
    status: row.status,
    monthly_limit: row.monthly_limit,
    usage_this_month: typeof row.usage_this_month === "number" ? row.usage_this_month : 0,
    api_key_preview: typeof row.api_key_preview === "string" ? row.api_key_preview : "n/a",
  };
}

function normalizeUsageSummary(input: unknown): UsageSummary | null {
  if (!input || typeof input !== "object") return null;
  const row = input as Record<string, unknown>;

  if (
    typeof row.plan !== "string" ||
    typeof row.billing_period !== "string" ||
    typeof row.executions !== "number" ||
    typeof row.included_executions !== "number" ||
    typeof row.overage_executions !== "number" ||
    typeof row.projected_amount_usd !== "number"
  ) {
    return null;
  }

  return {
    plan: row.plan,
    subscription_status: typeof row.subscription_status === "string" ? row.subscription_status : undefined,
    billing_period: row.billing_period,
    current_period_start: typeof row.current_period_start === "string" ? row.current_period_start : null,
    current_period_end: typeof row.current_period_end === "string" ? row.current_period_end : null,
    trial_end: typeof row.trial_end === "string" ? row.trial_end : null,
    executions: row.executions,
    included_executions: row.included_executions,
    overage_executions: row.overage_executions,
    projected_amount_usd: row.projected_amount_usd,
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function toneForDecision(value?: string | null) {
  const normalized = (value || "").toUpperCase();
  if (normalized === "BLOCK" || normalized === "FREEZE") return "border-red-400/25 bg-red-500/10 text-red-100";
  if (normalized === "STABILIZE" || normalized === "WARN") return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-100";
}

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

  useEffect(() => {
    let alive = true;

    async function load() {
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

        if (!alive) return;

        const warnings: string[] = [];
        const [agentsResult, executionsResult, usageResult, healthResult, auditResult, onboardingResult] = results;

        if (agentsResult.status === "fulfilled" && agentsResult.value.ok) {
          const normalizedAgents = Array.isArray(agentsResult.value.json?.items)
            ? agentsResult.value.json.items.map(normalizeAgent).filter((item: Agent | null): item is Agent => item !== null)
            : [];
          setAgents(normalizedAgents);
        } else {
          warnings.push(agentsResult.status === "fulfilled" ? agentsResult.value.json?.error || "Failed to load agents" : "Failed to load agents");
        }

        if (executionsResult.status === "fulfilled" && executionsResult.value.ok) {
          setExecutions(executionsResult.value.json.executions || []);
        } else {
          warnings.push(executionsResult.status === "fulfilled" ? executionsResult.value.json?.error || "Failed to load executions" : "Failed to load executions");
        }

        if (usageResult.status === "fulfilled" && usageResult.value.ok) {
          const summaryPayload = usageResult.value.json?.summary ?? usageResult.value.json;
          setSummary(normalizeUsageSummary(summaryPayload));
        } else {
          warnings.push(usageResult.status === "fulfilled" ? usageResult.value.json?.error || "Failed to load usage" : "Failed to load usage");
        }

        if (healthResult.status === "fulfilled" && healthResult.value.ok) {
          setHealth(healthResult.value.json || null);
        } else {
          warnings.push(healthResult.status === "fulfilled" ? healthResult.value.json?.error || "Failed to load health" : "Failed to load health");
        }

        if (auditResult.status === "fulfilled" && auditResult.value.ok) {
          setAuditItems(auditResult.value.json.items || []);
          setDeterminism(auditResult.value.json.determinism || []);
          if (auditResult.value.json.error) setAuditError(auditResult.value.json.error);
        } else {
          setAuditItems([]);
          setDeterminism([]);
          setAuditError(auditResult.status === "fulfilled" ? auditResult.value.json?.error || "Failed to load audit data" : "Failed to load audit data");
        }

        if (onboardingResult.status === "fulfilled" && onboardingResult.value.ok) {
          setOnboardingState(onboardingResult.value.json as OnboardingStatePayload);
        } else if (onboardingResult.status === "fulfilled") {
          warnings.push(onboardingResult.value.json?.error || "Failed to load onboarding state");
        } else {
          warnings.push("Failed to load onboarding state");
        }

        if (warnings.length > 0) {
          setError(warnings.join(" | "));
        }
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const overview = useMemo(
    () => [
      { label: "Live agents", value: String(agents.length), helper: "Governed operator endpoints" },
      { label: "Executions", value: String(summary?.executions ?? executions.length), helper: summary?.billing_period || "Current billing period" },
      { label: "Projected spend", value: `$${(summary?.projected_amount_usd ?? 0).toFixed(2)}`, helper: summary?.plan || "No plan detected" },
      { label: "Core status", value: health?.core_ok ? "Online" : "Degraded", helper: health?.core?.version || "No version reported" },
    ],
    [agents.length, executions.length, health?.core?.version, health?.core_ok, summary?.billing_period, summary?.executions, summary?.plan, summary?.projected_amount_usd],
  );

  const deterministicCount = useMemo(() => determinism.filter((item) => item.ok && item.data?.deterministic).length, [determinism]);
  const freezeCount = useMemo(() => determinism.filter((item) => item.ok && (item.data?.gate_action || "").toUpperCase() === "FREEZE").length, [determinism]);
  const onboardingProgress = useMemo(() => {
    const completed = [Boolean(onboardingState?.org_id), Boolean(onboardingState?.has_agent), Boolean(onboardingState?.first_run_complete)].filter(Boolean).length;
    return { completed, total: 3, percent: Math.round((completed / 3) * 100) };
  }, [onboardingState?.first_run_complete, onboardingState?.has_agent, onboardingState?.org_id]);

  return (
    <main className="min-h-screen bg-[#090a0d] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="relative overflow-hidden border border-white/10 bg-[linear-gradient(135deg,rgba(126,16,24,0.22),rgba(9,10,13,0.88)_32%,rgba(245,197,92,0.08)_120%)] p-8">
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">DSG Control Plane</p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white md:text-5xl">Operational clarity for governed approvals, runtime health, and audit evidence.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                This workspace surfaces the current system posture first, then the queues, evidence, and actions your operators need to move safely.
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

        {error ? <div className="mt-6 border border-red-400/25 bg-red-500/10 p-4 text-sm text-red-100">{error}</div> : null}

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {overview.map((item) => (
            <div key={item.label} className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-4 text-3xl font-semibold text-white">{loading ? "..." : item.value}</p>
              <p className="mt-2 text-sm text-slate-400">{item.helper}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border border-emerald-400/20 bg-emerald-400/10 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-200/80">Onboarding trajectory</p>
                <h2 className="mt-2 text-xl font-semibold text-emerald-50">
                  {onboardingProgress.completed}/{onboardingProgress.total} checkpoints complete
                </h2>
              </div>
              <Link href={onboardingState?.first_run_complete ? "/dashboard/executions" : "/dashboard/skills"} className="rounded-xl border border-emerald-200/30 px-4 py-2 text-sm font-semibold text-emerald-100">
                {onboardingState?.first_run_complete ? "Review executions" : "Run auto-setup"}
              </Link>
            </div>
            <div className="mt-4 h-2 w-full bg-black/30">
              <div className="h-2 bg-emerald-300 transition-all" style={{ width: `${onboardingProgress.percent}%` }} />
            </div>
            {onboardingState?.next_action ? <p className="mt-4 text-sm text-emerald-100/85">Next action: {onboardingState.next_action}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Audit events</p>
              <p className="mt-4 text-3xl font-semibold text-white">{loading ? "..." : auditItems.length}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Deterministic</p>
              <p className="mt-4 text-3xl font-semibold text-white">{loading ? "..." : deterministicCount}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-5">
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Freeze recommended</p>
              <p className="mt-4 text-3xl font-semibold text-white">{loading ? "..." : freezeCount}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 border border-white/10 bg-[#0d0f12] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Core status</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">DSG runtime connection</h2>
            </div>
            <span className={`inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.22em] ${health?.core_ok ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-red-400/25 bg-red-500/10 text-red-100"}`}>
              {health?.core_ok ? "online" : "offline"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="border-l border-amber-300/35 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Service</p>
              <p className="mt-3 text-sm text-slate-200">{health?.service || "-"}</p>
            </div>
            <div className="border-l border-amber-300/35 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Checked</p>
              <p className="mt-3 text-sm text-slate-200">{formatDate(health?.timestamp || null)}</p>
            </div>
            <div className="border-l border-amber-300/35 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Core version</p>
              <p className="mt-3 text-sm text-slate-200">{health?.core?.version || "-"}</p>
            </div>
            <div className="border-l border-white/10 bg-white/[0.03] p-4 md:col-span-2">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Core URL</p>
              <p className="mt-3 break-all text-sm text-slate-200">{health?.core?.url || "-"}</p>
            </div>
            <div className="border-l border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Runtime note</p>
              <p className="mt-3 text-sm text-slate-200">{health?.core?.error || health?.core?.status || "-"}</p>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Latest agents</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Live capacity surface</h2>
              </div>
              <span className="text-sm text-slate-400">{loading ? "Loading..." : `${agents.length} rows`}</span>
            </div>

            <div className="mt-5 space-y-3">
              {agents.length === 0 && !loading ? <div className="border border-white/10 bg-black/20 p-4 text-sm text-slate-400">No agents found.</div> : null}
              {agents.map((agent) => (
                <div key={agent.agent_id} className="border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{agent.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{agent.agent_id}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${agent.status === "active" ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-slate-600 bg-slate-800/60 text-slate-300"}`}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                    <p>Monthly limit: {agent.monthly_limit}</p>
                    <p>Usage this month: {agent.usage_this_month}</p>
                    <p>Policy: {agent.policy_id || "auto"}</p>
                    <p>Key preview: {agent.api_key_preview || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Latest executions</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">Decision flow pulse</h2>
              </div>
              <span className="text-sm text-slate-400">{loading ? "Loading..." : `${executions.length} rows`}</span>
            </div>

            <div className="mt-5 space-y-3">
              {executions.length === 0 && !loading ? <div className="border border-white/10 bg-black/20 p-4 text-sm text-slate-400">No executions found.</div> : null}
              {executions.map((execution) => (
                <div key={execution.id} className="border border-white/10 bg-black/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{execution.decision}</p>
                      <p className="mt-1 text-sm text-slate-500">{execution.id}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${toneForDecision(execution.decision)}`}>
                      {execution.latency_ms} ms
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2 text-sm text-slate-300">
                    <p>Policy: {execution.policy_version || "-"}</p>
                    <p>Reason: {execution.reason || "-"}</p>
                    <p>Created: {formatDate(execution.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 border border-white/10 bg-[#0d0f12] p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Billing and audit posture</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Current operating context</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/billing" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                Billing
              </Link>
              <Link href="/dashboard/audit/matrix" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">
                Audit matrix
              </Link>
            </div>
          </div>

          {auditError ? <div className="mt-5 border border-amber-300/25 bg-amber-300/10 p-4 text-sm text-amber-100">{auditError}</div> : null}

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Billing period</p>
              <p className="mt-3 text-sm text-slate-200">{summary?.billing_period || "-"}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Plan</p>
              <p className="mt-3 text-sm text-slate-200">{summary?.plan || "-"}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Subscription</p>
              <p className="mt-3 text-sm font-medium text-slate-200">{formatSubscriptionStatus(summary?.subscription_status)}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Period end</p>
              <p className="mt-3 text-sm text-slate-200">{formatDate(summary?.current_period_end || null)}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
