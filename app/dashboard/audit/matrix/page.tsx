"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  EntropyMatrix,
  type AuditEvent,
  type DeterminismResult,
} from "../../../../components/audit/entropy-matrix";

type MatrixCell = {
  sequence: number;
  region_id: string;
  entropy: number | null;
  gate_result: string | null;
  state_hash: string | null;
  created_at: string | null;
  epoch: string | number | null;
  z3_proof_hash: string | null;
  signature: string | null;
};

type MatrixSummary = {
  audit_events?: number;
  audit_event_count?: number;
  sequence_count?: number;
  region_count?: number;
  deterministic_count?: number;
  determinism_ok_count?: number;
  freeze_count?: number;
  core_error?: string | null;
};

type MatrixResponse = {
  ok: boolean;
  sequences?: number[];
  regions?: string[];
  cells?: MatrixCell[];
  determinism?: DeterminismResult[];
  summary?: MatrixSummary;
  error?: string;
};

function metricValue(value: number, loading: boolean) {
  return loading ? "..." : String(value);
}

function mapCellToAuditEvent(cell: MatrixCell): AuditEvent {
  return {
    epoch: String(cell.epoch ?? "-"),
    sequence: Number(cell.sequence),
    region_id: cell.region_id || "unknown",
    state_hash: cell.state_hash || "-",
    entropy:
      typeof cell.entropy === "number" && Number.isFinite(cell.entropy)
        ? cell.entropy
        : Number.NaN,
    gate_result: cell.gate_result || "-",
    z3_proof_hash: cell.z3_proof_hash || null,
    signature: cell.signature || null,
    created_at: cell.created_at || "",
  };
}

export default function AuditMatrixPage() {
  const [cells, setCells] = useState<MatrixCell[]>([]);
  const [determinism, setDeterminism] = useState<DeterminismResult[]>([]);
  const [summary, setSummary] = useState<MatrixSummary | null>(null);
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
        const res = await fetch("/api/audit/matrix?limit=100", {
          cache: "no-store",
        });
        const json: MatrixResponse = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to load audit matrix");
        }

        if (!alive) return;

        setCells(Array.isArray(json.cells) ? json.cells : []);
        setDeterminism(Array.isArray(json.determinism) ? json.determinism : []);
        setSummary(json.summary || null);

        if (json.summary?.core_error) {
          setWarning(json.summary.core_error);
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

  const items = useMemo(() => cells.map(mapCellToAuditEvent), [cells]);

  const sequenceCount = useMemo(() => {
    return new Set(cells.map((cell) => cell.sequence)).size;
  }, [cells]);

  const regionCount = useMemo(() => {
    return new Set(cells.map((cell) => cell.region_id)).size;
  }, [cells]);

  const deterministicCount = useMemo(() => {
    return determinism.filter((item) => item.ok && item.data?.deterministic).length;
  }, [determinism]);

  const freezeCount = useMemo(() => {
    return determinism.filter(
      (item) =>
        item.ok && (item.data?.gate_action || "").toUpperCase() === "FREEZE"
    ).length;
  }, [determinism]);

  const cards = [
    {
      label: "audit_events",
      value: summary?.audit_events ?? summary?.audit_event_count ?? items.length,
    },
    {
      label: "sequence_count",
      value: summary?.sequence_count ?? sequenceCount,
    },
    {
      label: "region_count",
      value: summary?.region_count ?? regionCount,
    },
    {
      label: "deterministic_count",
      value: summary?.deterministic_count ?? summary?.determinism_ok_count ?? deterministicCount,
    },
    {
      label: "freeze_count",
      value: summary?.freeze_count ?? freezeCount,
    },
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
