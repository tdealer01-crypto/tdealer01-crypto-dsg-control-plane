"use client";

import { useEffect, useState } from "react";

type Agent = {
  agent_id: string;
  name: string;
  policy_id: string;
  status: string;
  monthly_limit: number;
  usage_this_month?: number;
  api_key_preview?: string;
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [created, setCreated] = useState<any>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => setAgents(data.items || []))
      .catch(() => setAgents([]));
  }, []);

  const createAgent = async () => {
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "demo-agent",
        policy_id: "policy_default",
        monthly_limit: 10000,
      }),
    });
    const data = await res.json();
    setCreated(data);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">
              Agents
            </p>
            <h1 className="text-4xl font-bold">Agent Management</h1>
          </div>
          <button
            onClick={createAgent}
            className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black"
          >
            Create Demo Agent
          </button>
        </div>

        {created && (
          <div className="mt-8 rounded-2xl border border-emerald-500/40 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">New agent created</h2>
            <p className="mt-2 text-sm text-slate-400">
              API key is shown once. Save it before refreshing.
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">
              {JSON.stringify(created, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 grid gap-4">
          {agents.map((agent) => (
            <div
              key={agent.agent_id}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{agent.name}</h2>
                  <p className="mt-2 text-slate-300">
                    Policy: {agent.policy_id}
                  </p>
                  <p className="text-slate-300">Status: {agent.status}</p>
                </div>
                <div className="text-sm text-slate-300">
                  <p>Limit: {agent.monthly_limit}</p>
                  <p>Usage: {agent.usage_this_month || 0}</p>
                  <p>Key: {agent.api_key_preview || "hidden"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
