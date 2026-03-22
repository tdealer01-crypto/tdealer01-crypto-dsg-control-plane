"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EntropyMatrix } from "../../../../../components/audit/entropy-matrix";

type MatrixResponse = {
  ok: boolean;
  sequences: number[];
  regions: string[];
  cells: Array<{
    sequence: number;
    region_id: string;
    entropy: number;
    gate_result: string;
    state_hash: string;
    created_at: string;
    epoch: string;
    z3_proof_hash?: string | null;
    signature?: string | null;
  }>;
  determinism: Array<{
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
  }>;
  summary: {
    audit_events: number;
    sequence_count: number;
    region_count: number;
    deterministic_count: number;
    freeze_count: number;
  };
};

export default function AuditMatrixPage() {
  const [data, setData] = useState<MatrixResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/audit/matrix?limit=60", {
          cache: "no-store",
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load audit matrix");
        }

        if (!alive) return;
        setData(json);
      } catch (err) {
        if (!alive) return;
        setError(
          err instanceof Error ? err.message : "Failed to load audit matrix"
        );
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              DSG
            </p>
            <h1 className="mt-2 text-3xl font-semibold">
              Audit Entropy Matrix
            </h1>
            <p className="mt-2 text-slate-400">
              Region-by-sequence heatmap for entropy, gate result, and determinism.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/audit"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Audit
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
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-5">
          <MetricCard
            label="Audit events"
            value={loading ? "..." : String(data?.summary.audit_events ?? 0)}
          />
          <MetricCard
            label="Sequences"
            value={loading ? "..." : String(data?.summary.sequence_count ?? 0)}
          />
          <MetricCard
            label="Regions"
            value={loading ? "..." : String(data?.summary.region_count ?? 0)}
          />
          <MetricCard
            label="Deterministic"
            value={loading ? "..." : String(data?.summary.deterministic_count ?? 0)}
          />
          <MetricCard
            label="Freeze"
            value={loading ? "..." : String(data?.summary.freeze_count ?? 0)}
          />
        </div>

        <div className="mt-8">
          {data ? (
            <EntropyMatrix
              sequences={data.sequences}
              regions={data.regions}
              cells={data.cells}
              determinism={data.determinism}
            />
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
              {loading ? "Loading matrix..." : "No matrix data"}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </div>
  );
}
