"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  EntropyMatrix,
  type AuditEvent,
  type DeterminismResult,
} from "../../../../components/audit/entropy-matrix";

function metricValue(value: number, loading: boolean) {
  return loading ? "..." : String(value);
}

export default function AuditMatrixPage() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [determinism, setDeterminism] = useState<DeterminismResult[]>([]);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      setWarning("");

      try {
        const res = await fetch("/api/audit?limit=100", { cache: "no-store" });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load audit matrix");
        }

        if (!alive) return;

        setItems(json.items || []);
        setDeterminism(json.determinism || []);

        if (json.error) {
          setWarning(json.error);
        }
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

  const metrics = useMemo(() => {
    const sequences = new Set<number>();
    const regions = new Set<string>();

    for (const item of items) {
      const sequence = Number(item.sequence);
      if (Number.isFinite(sequence)) {
        sequences.add(sequence);
      }
      if (item.region_id) {
        regions.add(item.region_id);
      }
    }

    const deterministicCount = determinism.filter(
      (item) => item.ok && item.data?.deterministic
    ).length;

    const freezeCount = determinism.filter(
      (item) =>
        item.ok && (item.data?.gate_action || "").toUpperCase() === "FREEZE"
    ).length;

    return {
      audit_events: items.length,
      sequence_count: sequences.size,
      region_count: regions.size,
      deterministic_count: deterministicCount,
      freeze_count: freezeCount,
    };
  }, [items, determinism]);

  const cards = [
    { label: "audit_events", value: metrics.audit_events },
    { label: "sequence_count", value: metrics.sequence_count },
    { label: "region_count", value: metrics.region_count },
    { label: "deterministic_count", value: metrics.deterministic_count },
    { label: "freeze_count", value: metrics.freeze_count },
  ];

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
              DSG
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Audit Entropy Matrix</h1>
            <p className="mt-2 text-slate-400">
              Matrix view for sequence-by-region entropy, gate outcomes, and
              determinism signals from DSG core audit data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/audit"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Back to Audit
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
            {error}
          </div>
        ) : null}

        {warning ? (
          <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-200">
            {warning}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-5">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
            >
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="mt-3 text-3xl font-semibold">
                {metricValue(card.value, loading)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <EntropyMatrix
            items={items}
            determinism={determinism}
            loading={loading}
          />
        </div>
      </div>
    </main>
  );
}
