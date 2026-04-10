"use client";

import { useEffect, useMemo, useState } from "react";

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

function formatTime(value?: string | null) {
  if (!value) return "--:--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString();
}

function decisionTone(decision: Execution["decision"]) {
  if (decision === "ALLOW") return "text-[#00fe66]";
  if (decision === "STABILIZE") return "text-[#81ecff]";
  return "text-[#ff6e85]";
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [coreLedger, setCoreLedger] = useState<CoreLedgerItem[]>([]);
  const [coreMetrics, setCoreMetrics] = useState<CoreMetrics | null>(null);
  const [coreError, setCoreError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setCoreError("");

      try {
        const res = await fetch("/api/executions?limit=20", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load executions");
        if (!alive) return;

        const nextExecutions: Execution[] = json.executions || [];
        setExecutions(nextExecutions);
        setCoreLedger(json.core?.ledger_items || []);
        setCoreMetrics(json.core?.metrics || null);
        setSelectedId((current) => current || nextExecutions[0]?.id || null);
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

  const selectedExecution = useMemo(
    () => executions.find((item) => item.id === selectedId) || executions[0] || null,
    [executions, selectedId],
  );

  return (
    <main className="h-screen overflow-hidden bg-[#0d0e11] text-[#f7f6f9]">
      <header className="flex h-16 items-center justify-between border-b border-[#47484b]/30 px-6 shadow-[0_0_8px_rgba(0,229,255,0.15)]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#00E5FF]">DSG ONE</p>
          <h1 className="font-semibold uppercase tracking-wider">Execution Loops</h1>
        </div>
        <div className="text-right font-mono text-[11px] text-slate-400">
          <p>TOTAL_EXECUTIONS</p>
          <p className="text-lg text-[#00fe66]">{coreMetrics?.total_executions ?? executions.length}</p>
        </div>
      </header>

      {(error || coreError) && (
        <div className="border-b border-[#ff6e85]/20 bg-[#ff6e85]/10 px-6 py-2 font-mono text-xs text-[#ffa8a3]">
          {error || coreError}
        </div>
      )}

      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <section className="w-[34%] overflow-y-auto border-r border-[#47484b]/30">
          <div className="sticky top-0 flex items-center justify-between border-b border-[#47484b]/30 bg-[#181a1d] px-4 py-3 font-mono text-[10px] uppercase">
            <span className="text-slate-400">Buffer: {executions.length || 0} traces</span>
            <span className="text-[#81ecff]">{loading ? "SCANNING..." : "READY"}</span>
          </div>

          <div className="divide-y divide-[#47484b]/20">
            {executions.map((execution) => {
              const selected = execution.id === selectedExecution?.id;
              return (
                <button
                  key={execution.id}
                  onClick={() => setSelectedId(execution.id)}
                  className={`w-full border-l-2 p-4 text-left transition-colors ${
                    selected
                      ? "border-[#81ecff] bg-[#1e2023]"
                      : "border-transparent hover:bg-[#181a1d]"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span className={`font-mono text-xs ${selected ? "text-[#81ecff]" : "text-slate-400"}`}>
                      #{execution.id.slice(0, 10)}
                    </span>
                    <span className={`font-mono text-[9px] ${decisionTone(execution.decision)}`}>
                      {execution.decision}
                    </span>
                  </div>
                  <div className="mb-2 text-[11px] uppercase text-slate-200">Agent: {execution.agent_id}</div>
                  <div className="flex justify-between font-mono text-[9px] text-slate-400">
                    <span>LATENCY: {execution.latency_ms}ms</span>
                    <span>{formatTime(execution.created_at)}</span>
                  </div>
                </button>
              );
            })}

            {!loading && executions.length === 0 && (
              <div className="p-5 text-sm text-slate-500">No executions found.</div>
            )}
          </div>
        </section>

        <section className="flex flex-1 flex-col overflow-hidden bg-black/40">
          <div className="border-b border-[#47484b]/30 p-6">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="font-mono text-[10px] text-[#81ecff]">LATENCY_WATERFALL_MAP</p>
                <h2 className="font-semibold uppercase tracking-tight">
                  Trace: {selectedExecution?.id || "N/A"}
                </h2>
              </div>
              <div className="text-right">
                <p className="font-mono text-[10px] text-slate-400">TOTAL_EXEC_TIME</p>
                <p className="font-mono text-xl text-[#00fe66]">{selectedExecution?.latency_ms ?? 0}ms</p>
              </div>
            </div>

            <div className="space-y-3 font-mono text-[10px]">
              {["GATE_EVAL", "POLICY_MATCH", "LEDGER_APPEND", "RESPONSE_COMMIT"].map((phase, idx) => (
                <div key={phase} className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-3 text-slate-400">{phase}</div>
                  <div className="col-span-9 h-2 bg-[#181a1d]">
                    <div
                      className="h-full bg-[#81ecff]"
                      style={{ width: `${Math.min(95, 20 + idx * 18)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <h3 className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-[#81ecff]">Payload JSON</h3>
            <pre className="overflow-x-auto rounded border border-[#47484b]/30 bg-[#121316] p-4 font-mono text-xs text-[#81ecff]/90">{JSON.stringify(
              {
                execution: selectedExecution,
                core_metrics: coreMetrics,
                core_ledger_preview: coreLedger.slice(0, 3),
              },
              null,
              2,
            )}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}
