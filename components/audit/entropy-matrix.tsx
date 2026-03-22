"use client";

import { useMemo } from "react";

export type AuditEvent = {
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

export type DeterminismResult = {
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

type EntropyMatrixProps = {
  items: AuditEvent[];
  determinism: DeterminismResult[];
  loading?: boolean;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatEntropy(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return value.toFixed(3);
}

function normalizeLabel(value?: string | null) {
  if (!value) return "-";
  return value.replace(/_/g, " ").toLowerCase();
}

function getCellTone(entropy: number, gateResult: string) {
  const gate = (gateResult || "").toUpperCase();

  if (gate.includes("FREEZE") || gate.includes("BLOCK")) {
    return "border-red-500/40 bg-red-500/20 text-red-100";
  }

  if (gate.includes("STABILIZE") || entropy >= 1) {
    return "border-amber-500/40 bg-amber-500/20 text-amber-100";
  }

  if (entropy >= 0.35) {
    return "border-cyan-500/40 bg-cyan-500/20 text-cyan-100";
  }

  return "border-emerald-500/40 bg-emerald-500/20 text-emerald-100";
}

function getDeterminismTone(item: DeterminismResult) {
  if (!item.ok) {
    return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  }

  if (item.data?.deterministic) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
  }

  return "border-red-500/30 bg-red-500/10 text-red-100";
}

export function EntropyMatrix({
  items,
  determinism,
  loading = false,
}: EntropyMatrixProps) {
  const { sequences, regions, cellMap } = useMemo(() => {
    const sequenceSet = new Set<number>();
    const regionSet = new Set<string>();
    const nextCellMap = new Map<string, AuditEvent>();

    for (const item of items) {
      const sequence = Number(item.sequence);
      const region = item.region_id || "unknown";

      if (!Number.isFinite(sequence)) continue;

      sequenceSet.add(sequence);
      regionSet.add(region);

      const key = `${region}::${sequence}`;
      const current = nextCellMap.get(key);

      if (!current) {
        nextCellMap.set(key, item);
        continue;
      }

      const currentTime = new Date(current.created_at).getTime();
      const nextTime = new Date(item.created_at).getTime();

      if (Number.isNaN(currentTime) || nextTime >= currentTime) {
        nextCellMap.set(key, item);
      }
    }

    return {
      sequences: Array.from(sequenceSet).sort((a, b) => a - b),
      regions: Array.from(regionSet).sort((a, b) => a.localeCompare(b)),
      cellMap: nextCellMap,
    };
  }, [items]);

  const orderedDeterminism = useMemo(() => {
    return [...determinism].sort((a, b) => a.sequence - b.sequence);
  }, [determinism]);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Entropy Matrix</h2>
          <p className="mt-2 text-sm text-slate-400">
            X = sequence, Y = region_id. Cell color reflects entropy and gate_result.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-emerald-100">
            low entropy
          </span>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-cyan-100">
            medium entropy
          </span>
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-amber-100">
            stabilize
          </span>
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-red-100">
            freeze / block
          </span>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
          Determinism
        </h3>

        <div className="mt-3 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            <div className="rounded-xl border border-slate-800 p-4 text-slate-400">
              Loading determinism checks...
            </div>
          ) : null}

          {!loading && orderedDeterminism.length === 0 ? (
            <div className="rounded-xl border border-slate-800 p-4 text-slate-400">
              No determinism checks available.
            </div>
          ) : null}

          {orderedDeterminism.map((item) => (
            <div
              key={item.sequence}
              className={`rounded-xl border p-4 ${getDeterminismTone(item)}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">Sequence {item.sequence}</p>
                  <p className="mt-1 text-sm opacity-80">
                    {item.ok
                      ? item.data?.deterministic
                        ? "deterministic"
                        : "diverged"
                      : "warning"}
                  </p>
                </div>

                <span className="rounded-full border border-current/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
                  {item.ok ? normalizeLabel(item.data?.gate_action) : "error"}
                </span>
              </div>

              {item.ok && item.data ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-current/20 px-3 py-1">
                    {item.data.deterministic ? "deterministic" : "diverged"}
                  </span>
                  <span className="rounded-full border border-current/20 px-3 py-1">
                    gate_action: {normalizeLabel(item.data.gate_action)}
                  </span>
                  <span className="rounded-full border border-current/20 px-3 py-1">
                    unique_state_hashes: {item.data.unique_state_hashes}
                  </span>
                  <span className="rounded-full border border-current/20 px-3 py-1">
                    max_entropy: {formatEntropy(item.data.max_entropy)}
                  </span>
                </div>
              ) : (
                <p className="mt-3 text-sm opacity-90">
                  {item.error || "Determinism check failed."}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto overflow-y-visible rounded-2xl border border-slate-800">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/60">
              <th className="sticky left-0 z-10 min-w-[180px] border-r border-slate-800 bg-slate-950/95 px-4 py-3 text-left text-sm font-medium text-slate-300">
                region_id
              </th>
              {sequences.map((sequence) => (
                <th
                  key={sequence}
                  className="min-w-[112px] border-r border-slate-800 px-4 py-3 text-center text-sm font-medium text-slate-300 last:border-r-0"
                >
                  sequence {sequence}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={Math.max(sequences.length + 1, 2)}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  Loading matrix...
                </td>
              </tr>
            ) : null}

            {!loading && regions.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(sequences.length + 1, 2)}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  No audit events found.
                </td>
              </tr>
            ) : null}

            {!loading &&
              regions.map((region) => (
                <tr key={region} className="border-b border-slate-800 last:border-b-0">
                  <th className="sticky left-0 z-10 border-r border-slate-800 bg-slate-900/95 px-4 py-4 text-left text-sm font-medium text-slate-200">
                    {region}
                  </th>

                  {sequences.map((sequence) => {
                    const cell = cellMap.get(`${region}::${sequence}`);

                    return (
                      <td
                        key={`${region}-${sequence}`}
                        className="border-r border-slate-800 p-3 align-top last:border-r-0"
                      >
                        {cell ? (
                          <div
                            className={`group relative min-h-[88px] rounded-xl border p-3 transition-transform duration-150 hover:-translate-y-0.5 ${getCellTone(
                              cell.entropy,
                              cell.gate_result
                            )}`}
                          >
                            <p className="text-lg font-semibold">
                              {formatEntropy(cell.entropy)}
                            </p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.2em] opacity-80">
                              {cell.gate_result}
                            </p>
                            <p className="mt-2 truncate text-xs opacity-70">
                              {cell.state_hash}
                            </p>

                            <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-72 -translate-x-1/2 rounded-xl border border-slate-700 bg-slate-950/95 p-3 text-left text-xs text-slate-200 shadow-2xl group-hover:block">
                              <div className="grid gap-2">
                                <p>
                                  <span className="text-slate-400">region:</span>{" "}
                                  {cell.region_id}
                                </p>
                                <p>
                                  <span className="text-slate-400">sequence:</span>{" "}
                                  {cell.sequence}
                                </p>
                                <p>
                                  <span className="text-slate-400">entropy:</span>{" "}
                                  {formatEntropy(cell.entropy)}
                                </p>
                                <p>
                                  <span className="text-slate-400">gate_result:</span>{" "}
                                  {cell.gate_result}
                                </p>
                                <p className="break-all">
                                  <span className="text-slate-400">state_hash:</span>{" "}
                                  {cell.state_hash}
                                </p>
                                <p>
                                  <span className="text-slate-400">epoch:</span>{" "}
                                  {cell.epoch}
                                </p>
                                <p>
                                  <span className="text-slate-400">created_at:</span>{" "}
                                  {formatDate(cell.created_at)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex min-h-[88px] items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-sm text-slate-500">
                            -
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
