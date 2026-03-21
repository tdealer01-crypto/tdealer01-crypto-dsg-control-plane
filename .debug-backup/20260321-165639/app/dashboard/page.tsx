"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase";

type Metrics = {
  requests_today: number;
  allow_rate: number;
  block_rate: number;
  stabilize_rate: number;
  active_agents: number;
  avg_latency_ms: number;
};

export default function DashboardPage() {
  const [email, setEmail] = useState<string>("Loading session...");
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    if (!supabase) {
      setEmail("Supabase client is not configured correctly.");
      return;
    }

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        setEmail(error.message);
      } else {
        setEmail(data.user?.email || "Not signed in");
      }
    });

    fetch("/api/metrics")
      .then((r) => r.json())
      .then(setMetrics)
      .catch(() => setMetrics(null));
  }, []);

  const cards = [
    { label: "Requests Today", value: metrics?.requests_today ?? "..." },
    {
      label: "Allow Rate",
      value: metrics ? `${Math.round(metrics.allow_rate * 100)}%` : "...",
    },
    {
      label: "Block Rate",
      value: metrics ? `${Math.round(metrics.block_rate * 100)}%` : "...",
    },
    { label: "Active Agents", value: metrics?.active_agents ?? "..." },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">
              Dashboard
            </p>
            <h1 className="text-4xl font-bold">DSG Overview</h1>
            <p className="mt-3 text-slate-300">{email}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/agents" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
              Agents
            </Link>
            <Link href="/dashboard/executions" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
              Executions
            </Link>
            <Link href="/dashboard/billing" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
              Billing
            </Link>
            <Link href="/dashboard/policies" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
              Policies
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
