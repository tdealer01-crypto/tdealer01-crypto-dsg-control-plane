"use client";

import { useEffect, useMemo, useState } from "react";

type PolicyRow = {
  id: string;
  name: string;
  version: string;
  status: "active" | "draft" | "archived";
  governance_state?: string;
  thresholds: {
    block_risk_score?: number;
    stabilize_risk_score?: number;
  };
};

export default function PoliciesPage() {
  const [items, setItems] = useState<PolicyRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetch('/api/policies')
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || 'Failed to load policies');
        return json;
      })
      .then((json) => {
        const next = (json.items || []) as PolicyRow[];
        setItems(next);
        if (next[0]) setSelectedId(next[0].id);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load policies'));
  }, []);

  const selectedPolicy = useMemo(
    () => items.find((item) => item.id === selectedId) || items[0],
    [items, selectedId]
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">Policies</p>
          <h1 className="text-4xl font-bold">Policy Governance</h1>
          <p className="mt-3 max-w-2xl text-slate-300">Runtime policy truth is now org-scoped and RBAC-protected.</p>
          {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Policies</h2>
              <span className="text-sm text-slate-400">{items.length} items</span>
            </div>
            <div className="mt-4 space-y-4">
              {items.map((policy) => (
                <button
                  key={policy.id}
                  onClick={() => setSelectedId(policy.id)}
                  className={[
                    "w-full rounded-2xl border p-5 text-left transition",
                    selectedId === policy.id ? "border-emerald-400 bg-slate-950" : "border-slate-800 bg-slate-950/40",
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
                  <p className="mt-3 text-sm text-slate-300">Version {policy.version} · governance {policy.governance_state || 'n/a'}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Selected Policy</h2>
            {selectedPolicy ? (
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <p>Policy ID: {selectedPolicy.id}</p>
                <p>Name: {selectedPolicy.name}</p>
                <p>Version: {selectedPolicy.version}</p>
                <p>Status: {selectedPolicy.status}</p>
                <p>Governance: {selectedPolicy.governance_state || 'n/a'}</p>
                <p>Block threshold: {selectedPolicy.thresholds?.block_risk_score ?? 'n/a'}</p>
                <p>Stabilize threshold: {selectedPolicy.thresholds?.stabilize_risk_score ?? 'n/a'}</p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-300">No policies found for your organization.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
