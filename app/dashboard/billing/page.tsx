"use client";

import { useEffect, useState } from "react";

type Usage = {
  plan: string;
  billing_period: string;
  executions: number;
  included_executions: number;
  overage_executions: number;
  projected_amount_usd: number;
};

export default function BillingPage() {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then(setUsage)
      .catch(() => setUsage(null));
  }, []);

  const cards = [
    { label: "Plan", value: usage?.plan || "loading" },
    { label: "Executions", value: usage?.executions ?? "..." },
    { label: "Included", value: usage?.included_executions ?? "..." },
    {
      label: "Projected",
      value: usage ? `$${usage.projected_amount_usd}` : "...",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">
          Billing
        </p>
        <h1 className="text-4xl font-bold">Usage and Billing</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Review current plan, included executions, and projected monthly amount.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">{card.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-xl font-semibold">Billing period</h2>
          <p className="mt-3 text-slate-300">
            {usage?.billing_period || "loading"}
          </p>
          <p className="mt-2 text-slate-300">
            Overage executions: {usage?.overage_executions ?? "..."}
          </p>
        </div>
      </div>
    </main>
  );
}
