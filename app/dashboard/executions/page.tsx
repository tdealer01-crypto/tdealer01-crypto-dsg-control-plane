"use client";

import { useEffect, useState } from "react";

type Execution = {
  id: string;
  agent: string;
  decision: "ALLOW" | "STABILIZE" | "BLOCK";
  latency_ms: number;
  created_at: string;
  reason: string;
};

const demoExecutions: Execution[] = [
  {
    id: "req_demo_1",
    agent: "demo-agent",
    decision: "ALLOW",
    latency_ms: 4,
    created_at: "2026-03-21T07:00:00Z",
    reason: "Policy checks passed",
  },
  {
    id: "req_demo_2",
    agent: "demo-agent",
    decision: "STABILIZE",
    latency_ms: 5,
    created_at: "2026-03-21T07:02:00Z",
    reason: "Risk score requires stabilization",
  },
  {
    id: "req_demo_3",
    agent: "finance-agent",
    decision: "BLOCK",
    latency_ms: 4,
    created_at: "2026-03-21T07:03:00Z",
    reason: "Risk score exceeded block threshold",
  },
];

export default function ExecutionsPage() {
  const [items, setItems] = useState<Execution[]>([]);

  useEffect(() => {
    setItems(demoExecutions);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">
          Executions
        </p>
        <h1 className="text-4xl font-bold">Execution Logs</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Review recent DSG decisions, latency, and reasons from the control plane.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm text-slate-200">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="px-4 py-3 font-mono">{item.id}</td>
                  <td className="px-4 py-3">{item.agent}</td>
                  <td className="px-4 py-3">{item.decision}</td>
                  <td className="px-4 py-3">{item.latency_ms} ms</td>
                  <td className="px-4 py-3">{item.reason}</td>
                  <td className="px-4 py-3">{item.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
