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

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
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

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setAuditError("");

      try {
        const [agentsRes, executionsRes, usageRes, healthRes, auditRes] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/executions?limit=10", { cache: "no-store" }),
          fetch("/api/usage", { cache: "no-store" }),
          fetch("/api/health", { cache: "no-store" }),
          fetch("/api/audit?limit=20", { cache: "no-store" }),
        ]);

        const [agentsJson, executionsJson, usageJson, healthJson, auditJson] = await Promise.all([
          agentsRes.json(),
          executionsRes.json(),
          usageRes.json(),
          healthRes.json(),
          auditRes.json(),
        ]);

        if (!alive) return;

        const warnings: string[] = [];

        if (agentsRes.ok) {
          const normalizedAgents = Array.isArray(agentsJson?.items)
            ? agentsJson.items.map(normalizeAgent).filter((item): item is Agent => item !== null)
            : [];
          setAgents(normalizedAgents);
        } else {
          warnings.push(agentsJson.error || "Failed to load agents");
        }

        if (executionsRes.ok) {
          setExecutions(executionsJson.executions || []);
        } else {
          warnings.push(executionsJson.error || "Failed to load executions");
        }

        if (usageRes.ok) {
          const summaryPayload = usageJson?.summary ?? usageJson;
          const normalizedSummary = normalizeUsageSummary(summaryPayload);
          setSummary(normalizedSummary);
        } else {
          warnings.push(usageJson.error || "Failed to load usage");
        }

        if (healthRes.ok) {
          setHealth(healthJson || null);
        } else {
          warnings.push(healthJson.error || "Failed to load health");
        }

        if (auditRes.ok) {
          setAuditItems(auditJson.items || []);
          setDeterminism(auditJson.determinism || []);
          if (auditJson.error) setAuditError(auditJson.error);
        } else {
          setAuditItems([]);
          setDeterminism([]);
          setAuditError(auditJson.error || "Failed to load audit data");
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

  const cards = useMemo(() => {
    return [
      { label: "Agents", value: agents.length },
      { label: "Executions", value: summary?.executions ?? executions.length },
      { label: "Current Usage", value: summary?.executions ?? 0 },
      { label: "Plan", value: summary?.plan ?? "-" },
      { label: "DSG Core", value: health?.core_ok ? "Online" : "Offline" },
    ];
  }, [agents.length, executions.length, summary, health]);

  const deterministicCount = useMemo(() => {
    return determinism.filter((item) => item.ok && item.data?.deterministic).length;
  }, [determinism]);

  const freezeCount = useMemo(() => {
    return determinism.filter(
      (item) => item.ok && (item.data?.gate_action || "").toUpperCase() === "FREEZE"
    ).length;
  }, [determinism]);

  const auditStatus = auditError
    ? "warning"
    : loading
      ? "checking"
      : "ok";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">DSG</p>
            <h1 className="mt-2 text-3xl font-semibold">Control Plane Dashboard</h1>
            <p className="mt-2 text-slate-400">
              Authenticated overview of agents, executions, billing, audit state, and current DSG core status.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/agents" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Agents</Link>
            <Link href="/dashboard/executions" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Executions</Link>
            <Link href="/dashboard/billing" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Billing</Link>
            <Link href="/dashboard/policies" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Policies</Link>
            <Link href="/dashboard/integration" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Integration</Link>
            <Link href="/dashboard/audit" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">Audit</Link>
          </div>
        </div>

        {error ? <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div> : null}

        {!loading && !error && agents.length === 0 && executions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">
            <p className="text-lg font-semibold text-emerald-100">Welcome to DSG Control Plane</p>
            <p className="mt-2 text-sm leading-7 text-emerald-200/80">
              Your authenticated dashboard is still empty. Head to the{" "}
              <Link href="/quickstart" className="underline font-semibold text-emerald-200">Quickstart</Link>{" "}
              page to create your first agent and run a sample execution, or visit{" "}
              <Link href="/pricing" className="underline font-semibold text-emerald-200">Pricing</Link>{" "}
              to review plan changes.
            </p>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-5">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{String(card.value)}</p>
            </div>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">DSG Core Health</h2>
            <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
              {health?.core_ok ? "online" : "offline"}
            </span>
          </div>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>Control plane: {health?.service || "-"}</p>
            <p>Checked: {formatDate(health?.timestamp || null)}</p>
            <p>Core URL: {health?.core?.url || "-"}</p>
            <p>Core version: {health?.core?.version || "-"}</p>
            <p>Core status: {health?.core?.status || (health?.core_ok ? "ok" : "unreachable")}</p>
            <p>Error: {health?.core?.error || "-"}</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Audit Summary</h2>
              <p className="mt-2 text-sm text-slate-400">
                Operator-facing audit events, determinism checks, and current freeze recommendations from DSG core.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/audit" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
                Open Audit
              </Link>
              <Link href="/dashboard/audit/matrix" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
                Open Matrix
              </Link>
            </div>
          </div>

          {auditError ? (
            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
              {auditError}
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <p className="text-sm text-slate-400">Audit events</p>
              <p className="mt-3 text-3xl font-semibold">{loading ? "..." : auditItems.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <p className="text-sm text-slate-400">Deterministic</p>
              <p className="mt-3 text-3xl font-semibold">{loading ? "..." : deterministicCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <p className="text-sm text-slate-400">Freeze recommended</p>
              <p className="mt-3 text-3xl font-semibold">{loading ? "..." : freezeCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
              <p className="text-sm text-slate-400">Audit status</p>
              <p className="mt-3 text-3xl font-semibold">{auditStatus}</p>
            </div>
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Latest Agents</h2>
              <span className="text-sm text-slate-400">{loading ? "Loading..." : `${agents.length} rows`}</span>
            </div>
            <div className="mt-4 space-y-3">
              {agents.length === 0 && !loading ? <div className="rounded-xl border border-slate-800 p-4 text-slate-400">No agents found.</div> : null}
              {agents.map((agent) => (
                <div key={agent.agent_id} className="rounded-xl border border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{agent.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{agent.agent_id}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">{agent.status}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <p>Monthly limit: {agent.monthly_limit}</p>
                    <p>Usage this month: {agent.usage_this_month}</p>
                    <p>API key preview: {agent.api_key_preview || "-"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Latest Executions</h2>
              <span className="text-sm text-slate-400">{loading ? "Loading..." : `${executions.length} rows`}</span>
            </div>
            <div className="mt-4 space-y-3">
              {executions.length === 0 && !loading ? <div className="rounded-xl border border-slate-800 p-4 text-slate-400">No executions found.</div> : null}
              {executions.map((execution) => (
                <div key={execution.id} className="rounded-xl border border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{execution.decision}</p>
                      <p className="mt-1 text-sm text-slate-400">{execution.id}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">{execution.latency_ms} ms</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <p>Policy: {execution.policy_version || "-"}</p>
                    <p>Reason: {execution.reason || "-"}</p>
                    <p>Created: {formatDate(execution.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Billing Snapshot</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <p>Billing period: {summary?.billing_period || "-"}</p>
            <p>Subscription plan: {summary?.plan || "-"}</p>
            <p>Subscription status: {summary?.subscription_status || "-"}</p>
            <p>Period end: {formatDate(summary?.current_period_end || null)}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
