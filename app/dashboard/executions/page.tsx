"use client";

import { useEffect, useState } from "react";

type Execution = {
  id: string;
  agent_id: string;
  decision: "ALLOW" | "STABILIZE" | "BLOCK";
  latency_ms: number;
  policy_version: string | null;
  reason: string | null;
  created_at: string;
};

type CoreLedgerItem = {
  id?: number;
  agent_id: string;
  action: string;
  decision: string;
  stability_score: number;
  reason: string;
  evaluated_at: string;
};

type CoreMetrics = {
  total_executions: number;
  allow_count: number;
  stabilize_count: number;
  block_count: number;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [coreLedger, setCoreLedger] = useState<CoreLedgerItem[]>([]);
  const [coreMetrics, setCoreMetrics] = useState<CoreMetrics | null>(null);
  const [coreError, setCoreError] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setCoreError("");

      try {
        const res = await fetch("/api/executions?limit=20", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load executions");
        }
        if (!alive) return;
        setExecutions(json.executions || []);
        setCoreLedger(json.core?.ledger_items || []);
        setCoreMetrics(json.core?.metrics || null);
        if (json.core?.error) setCoreError(json.core.error);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load executions");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">DSG</p>
          <h1 className="mt-2 text-3xl font-semibold">Executions</h1>
          <p className="mt-2 text-slate-400">
            Control-plane execution history alongside DSG core ledger and decision metrics.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>
        ) : null}

        {coreError ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">Core warning: {coreError}</div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Control-plane rows</p>
            <p className="mt-3 text-3xl font-semibold">{loading ? "..." : executions.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Core total</p>
            <p className="mt-3 text-3xl font-semibold">{coreMetrics?.total_executions ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Core allow</p>
            <p className="mt-3 text-3xl font-semibold">{coreMetrics?.allow_count ?? 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Core block</p>
            <p className="mt-3 text-3xl font-semibold">{coreMetrics?.block_count ?? 0}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Control-plane Executions</h2>
              <span className="text-sm text-slate-400">{loading ? "Loading..." : `${executions.length} rows`}</span>
            </div>
            <div className="mt-4 space-y-3">
              {executions.length === 0 && !loading ? (
                <div className="rounded-xl border border-slate-800 p-4 text-slate-400">No control-plane executions found.</div>
              ) : null}
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
                    <p>Agent: {execution.agent_id}</p>
                    <p>Policy: {execution.policy_version || "-"}</p>
                    <p>Reason: {execution.reason || "-"}</p>
                    <p>Created: {formatDate(execution.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">DSG Core Ledger</h2>
              <span className="text-sm text-slate-400">{`${coreLedger.length} rows`}</span>
            </div>
            <div className="mt-4 space-y-3">
              {coreLedger.length === 0 ? (
                <div className="rounded-xl border border-slate-800 p-4 text-slate-400">No DSG core ledger entries found.</div>
              ) : null}
              {coreLedger.map((item, index) => (
                <div key={`${item.agent_id}-${item.evaluated_at}-${index}`} className="rounded-xl border border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{item.decision}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.action}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                      stability {item.stability_score}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <p>Agent: {item.agent_id}</p>
                    <p>Reason: {item.reason}</p>
                    <p>Evaluated: {formatDate(item.evaluated_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
