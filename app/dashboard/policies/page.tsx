"use client";

import { useMemo, useState } from "react";

type PolicyRow = {
  id: string;
  name: string;
  version: string;
  status: "preview" | "draft" | "archived";
  description: string;
  thresholds: {
    block_risk_score: number;
    stabilize_risk_score: number;
  };
};

const seedPolicies: PolicyRow[] = [
  {
    id: "policy_default",
    name: "Default DSG Policy",
    version: "v1",
    status: "preview",
    description: "Baseline reference policy shown for review only (not runtime-writable).",
    thresholds: {
      block_risk_score: 0.8,
      stabilize_risk_score: 0.4,
    },
  },
  {
    id: "policy_high_guard",
    name: "High Guard Policy",
    version: "v2",
    status: "draft",
    description: "Stricter review path for sensitive or regulated execution flows.",
    thresholds: {
      block_risk_score: 0.65,
      stabilize_risk_score: 0.25,
    },
  },
];

export default function PoliciesPage() {
  const [selectedId, setSelectedId] = useState<string>(seedPolicies[0].id);

  const selectedPolicy = useMemo(
    () => seedPolicies.find((item) => item.id === selectedId) || seedPolicies[0],
    [selectedId]
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">
            Policies
          </p>
          <h1 className="text-4xl font-bold">Policy Management</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Unfinished governance surface for policy review. This page is not
            the active governance runtime surface.
          </p>
        </div>
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Governance status: unfinished + preview-only. Runtime ALLOW/STABILIZE/BLOCK decisions
          are enforced by server-side gate contracts, not by edits on this screen.
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Policies</h2>
              <span className="text-sm text-slate-400">{seedPolicies.length} items</span>
            </div>
            <div className="mt-4 space-y-4">
              {seedPolicies.map((policy) => (
                <button
                  key={policy.id}
                  onClick={() => setSelectedId(policy.id)}
                  className={[
                    "w-full rounded-2xl border p-5 text-left transition",
                    selectedId === policy.id
                      ? "border-emerald-400 bg-slate-950"
                      : "border-slate-800 bg-slate-950/40",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold">{policy.name}</p>
                      <p className="mt-1 text-sm text-slate-400">{policy.id}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {policy.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{policy.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Selected Policy</h2>
            <div className="mt-4 grid gap-3 text-sm text-slate-300">
              <p>Policy ID: {selectedPolicy.id}</p>
              <p>Name: {selectedPolicy.name}</p>
              <p>Version: {selectedPolicy.version}</p>
              <p>Status: {selectedPolicy.status}</p>
              <p>Block threshold: {selectedPolicy.thresholds.block_risk_score}</p>
              <p>Stabilize threshold: {selectedPolicy.thresholds.stabilize_risk_score}</p>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950 p-5 text-sm text-slate-300">
              <p className="font-semibold text-white">Next step</p>
              <p className="mt-2">
                Wire this page to DB-backed policies, approval history, and
                controlled rollout gates before promoting it to an active governance runtime surface.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
