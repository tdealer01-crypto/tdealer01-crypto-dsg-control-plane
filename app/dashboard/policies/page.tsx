"use client";

import { useEffect, useMemo, useState } from "react";

type PolicyRow = {
  id: string;
  name: string;
  version: string;
  status: "active" | "draft" | "archived" | string;
  description: string | null;
  config: {
    block_risk_score?: number;
    stabilize_risk_score?: number;
    [key: string]: unknown;
  } | null;
  updated_at?: string;
};

type ApprovalHistoryItem = {
  id: string;
  action: string;
  status: string;
  approved_at: string;
  used_at: string | null;
  expires_at: string | null;
  metadata?: {
    policy_id?: string;
    [key: string]: unknown;
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

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/policies", { cache: "no-store" });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load policies");
        }

        if (!alive) return;
        const nextPolicies = Array.isArray(data?.items) ? data.items : [];
        const nextHistory = Array.isArray(data?.approval_history) ? data.approval_history : [];

        setPolicies(nextPolicies);
        setApprovalHistory(nextHistory);
        setSelectedId(nextPolicies[0]?.id || "");
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load policies");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const selectedPolicy = useMemo(() => {
    if (!policies.length) return null;
    return policies.find((item) => item.id === selectedId) || policies[0];
  }, [policies, selectedId]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl">
        <div>
          <p className="mb-3 text-sm uppercase tracking-[0.25em] text-emerald-400">Policies</p>
          <h1 className="text-4xl font-bold">Policy Management</h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Real policies and approval history from the database, aligned with runtime route contracts.
          </p>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">{error}</div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Policies</h2>
              <span className="text-sm text-slate-400">{loading ? "Loading..." : `${policies.length} items`}</span>
            </div>
            <div className="mt-4 space-y-4">
              {!loading && policies.length === 0 ? (
                <div className="rounded-xl border border-slate-800 p-4 text-slate-400">No policies found.</div>
              ) : null}
              {policies.map((policy) => (
                <button
                  key={policy.id}
                  onClick={() => setSelectedId(policy.id)}
                  className={[
                    "w-full rounded-2xl border p-5 text-left transition",
                    selectedPolicy?.id === policy.id
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
                  <p className="mt-3 text-sm text-slate-300">{policy.description || "-"}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Selected Policy</h2>
            {selectedPolicy ? (
              <>
                <div className="mt-4 grid gap-3 text-sm text-slate-300">
                  <p>Policy ID: {selectedPolicy.id}</p>
                  <p>Name: {selectedPolicy.name}</p>
                  <p>Version: {selectedPolicy.version}</p>
                  <p>Status: {selectedPolicy.status}</p>
                  <p>Block threshold: {String(selectedPolicy.config?.block_risk_score ?? "-")}</p>
                  <p>Stabilize threshold: {String(selectedPolicy.config?.stabilize_risk_score ?? "-")}</p>
                  <p>Updated: {formatDate(selectedPolicy.updated_at || null)}</p>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-800 p-4 text-slate-400">No policy selected.</div>
            )}
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Approval History</h2>
            <span className="text-sm text-slate-400">{loading ? "Loading..." : `${approvalHistory.length} rows`}</span>
          </div>
          <div className="mt-4 space-y-3">
            {!loading && approvalHistory.length === 0 ? (
              <div className="rounded-xl border border-slate-800 p-4 text-slate-400">No approval history found.</div>
            ) : null}
            {approvalHistory.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{item.action}</p>
                    <p className="text-xs text-slate-400">{item.id}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                    {item.status}
                  </span>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
                  <p>Approved: {formatDate(item.approved_at)}</p>
                  <p>Used: {formatDate(item.used_at)}</p>
                  <p>Expires: {formatDate(item.expires_at)}</p>
                  <p>Policy ref: {String(item.metadata?.policy_id || "-")}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
