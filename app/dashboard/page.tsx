"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Agent = {
  id: string;
  name: string;
  status: string;
  monthly_limit: number;
  last_used_at: string | null;
  updated_at: string;
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
  billing_period: string;
  agent_count: number;
  execution_count: number;
  monthly_executions: number;
  subscription: null | {
    plan: string;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    updated_at: string;
  };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [agentsRes, executionsRes, usageRes] = await Promise.all([
          fetch("/api/agents", { cache: "no-store" }),
fetch("/api/agents", { cache: "no-store" }),
          fetch("/api/executions?limit=10", { cache: "no-store" }),
          fetch("/api/usage", { cache: "no-store" }),
        ]);

        const [agentsJson, executionsJson, usageJson] = await Promise.all([
          agentsRes.json(),
          executionsRes.json(),
          usageRes.json(),
        ]);

        if (!agentsRes.ok) {
          throw new Error(agentsJson.error || "Failed to load agents");
        }
        if (!executionsRes.ok) {
          throw new Error(executionsJson.error || "Failed to load executions");
        }
        if (!usageRes.ok) {
          throw new Error(usageJson.error || "Failed to load usage");
        }

        if (!alive) return;

        setAgents(agentsJson.agents || []);
        setExecutions(executionsJson.executions || []);
        setSummary(usageJson.summary || null);
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
      {
        label: "Agents",
        value: summary?.agent_count ?? agents.length,
      },
      {
        label: "Executions",
        value: summary?.execution_count ?? executions.length,
      },
      {
        label: "Monthly Usage",
        value: summary?.monthly_executions ?? 0,
      },
      {
        label: "Plan",
        value: summary?.subscription?.plan ?? "-",
      },
    ];
  }, [agents.length, executions.length, summary]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              DSG
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Control Plane Dashboard</h1>
            <p className="mt-2 text-slate-400">
              Real-time view of agents, executions, usage, and billing state.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/agents"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Agents
            </Link>
            <Link
              href="/dashboard/executions"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Executions
            </Link>
            <Link
              href="/dashboard/billing"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Billing
            </Link>
            <Link
              href="/dashboard/policies"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Policies
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{String(card.value)}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Latest Agents</h2>
              <span className="text-sm text-slate-400">
                {loading ? "Loading..." : `${agents.length} rows`}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {agents.length === 0 && !loading ? (
                <div className="rounded-xl border border-slate-800 p-4 text-slate-400">
                  No agents found.
                </div>
              ) : null}

              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-xl border border-slate-800 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{agent.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{agent.id}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {agent.status}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <p>Monthly limit: {agent.monthly_limit}</p>
                    <p>Last used: {formatDate(agent.last_used_at)}</p>
                    <p>Updated: {formatDate(agent.updated_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Latest Executions</h2>
              <span className="text-sm text-slate-400">
                {loading ? "Loading..." : `${executions.length} rows`}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {executions.length === 0 && !loading ? (
                <div className="rounded-xl border border-slate-800 p-4 text-slate-400">
                  No executions found.
                </div>
              ) : null}

              {executions.map((execution) => (
                <div
                  key={execution.id}
                  className="rounded-xl border border-slate-800 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{execution.decision}</p>
                      <p className="mt-1 text-sm text-slate-400">{execution.id}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {execution.latency_ms} ms
                    </span>
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
            <p>Subscription plan: {summary?.subscription?.plan || "-"}</p>
            <p>Subscription status: {summary?.subscription?.status || "-"}</p>
            <p>
              Period end: {formatDate(summary?.subscription?.current_period_end || null)}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
