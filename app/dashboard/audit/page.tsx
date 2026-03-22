"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuditEvent = {
  id?: number;
  epoch: string;
  sequence: number;
  region_id: string;
  state_hash: string;
  entropy: number;
  gate_result: string;
  z3_proof_hash?: string | null;
  signature?: string | null;
  created_at: string;
};

type DeterminismResult = {
  sequence: number;
  ok: boolean;
  data: null | {
    sequence: number;
    region_count: number;
    unique_state_hashes: number;
    max_entropy: number;
    deterministic: boolean;
    gate_action: string;
  };
  error: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [determinism, setDeterminism] = useState<DeterminismResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/audit?limit=20", { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to load audit data");
        }
        if (!alive) return;
        setItems(json.items || []);
        setDeterminism(json.determinism || []);
        if (json.error) setError(json.error);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load audit data");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const freezeCount = determinism.filter(
    (item) => item.ok && item.data?.gate_action === "FREEZE"
  ).length;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">DSG</p>
            <h1 className="mt-2 text-3xl font-semibold">Audit Layer</h1>
            <p className="mt-2 text-slate-400">
              Region-aware audit events, determinism checks, entropy, and freeze recommendations from DSG core.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/audit/matrix"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Matrix
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">{error}</div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Audit events</p>
            <p className="mt-3 text-3xl font-semibold">{loading ? "..." : items.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Determinism checks</p>
            <p className="mt-3 text-3xl font-semibold">{loading ? "..." : determinism.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Recommended freeze</p>
            <p className="mt-3 text-3xl font-semibold">{loading ? "..." : freezeCount}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Recent Audit Events</h2>
              <span className="text-sm text-slate-400">{loading ? "Loading..." : `${items.length} rows`}</span>
            </div>
            <div className="mt-4 space-y-3">
              {items.length === 0 && !loading ? (
                <div className="rounded-xl border border-slate-800 p-4 text-slate-400">No audit events found.</div>
              ) : null}
              {items.map((item, index) => (
                <div key={`${item.sequence}-${item.region_id}-${index}`} className="rounded-xl border border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">Sequence {item.sequence}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.region_id}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">{item.gate_result}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-300">
                    <p>Epoch: {item.epoch}</p>
                    <p>State hash: {item.state_hash}</p>
                    <p>Entropy: {item.entropy}</p>
                    <p>Z3 proof hash: {item.z3_proof_hash || "-"}</p>
                    <p>Created: {formatDate(item.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Determinism Results</h2>
              <span className="text-sm text-slate-400">{loading ? "Loading..." : `${determinism.length} checks`}</span>
            </div>
            <div className="mt-4 space-y-3">
              {determinism.length === 0 && !loading ? (
                <div className="rounded-xl border border-slate-800 p-4 text-slate-400">No determinism checks found.</div>
              ) : null}
              {determinism.map((item) => (
                <div key={item.sequence} className="rounded-xl border border-slate-800 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">Sequence {item.sequence}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.ok ? "Computed by DSG core" : "Core returned warning"}</p>
                    </div>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-wide text-slate-300">
                      {item.ok ? item.data?.gate_action : "ERROR"}
                    </span>
                  </div>
                  {item.ok && item.data ? (
                    <div className="mt-3 grid gap-2 text-sm text-slate-300">
                      <p>Deterministic: {item.data.deterministic ? "yes" : "no"}</p>
                      <p>Regions: {item.data.region_count}</p>
                      <p>Unique hashes: {item.data.unique_state_hashes}</p>
                      <p>Max entropy: {item.data.max_entropy}</p>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-amber-200">{item.error || "Unknown audit warning"}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
