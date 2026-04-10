"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

const BADGE_BASE =
  "rounded-full border px-2 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase";

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Date(value).toISOString();
  } catch {
    return value;
  }
}

function shortenHash(value?: string | null) {
  if (!value) return "-";
  if (value.length < 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
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

  const freezeCount = determinism.filter((item) => item.ok && item.data?.gate_action === "FREEZE").length;
  const nondeterministicCount = determinism.filter((item) => item.ok && !item.data?.deterministic).length;
  const ledgerHealth = useMemo(() => {
    if (!determinism.length) return "--";
    const healthy = Math.max(0, determinism.length - nondeterministicCount);
    return `${((healthy / determinism.length) * 100).toFixed(3)}%`;
  }, [determinism.length, nondeterministicCount]);

  return (
    <main className="min-h-screen bg-[#0d0e11] text-[#f7f6f9]">
      <div className="border-b border-[#47484b]/25 bg-[#121316] px-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[10px] text-[#ababae]">SYSTEM_NOMINAL // IMMUTABLE_LEDGER_ACTIVE</p>
            <h1 className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#81ecff]">AUDIT_EVIDENCE_LOG</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/audit/matrix" className="border border-[#81ecff]/25 bg-[#00e3fd]/10 px-3 py-2 text-xs font-semibold text-[#81ecff]">
              MATRIX
            </Link>
            <Link href="/dashboard" className="border border-[#757578]/30 bg-[#181a1d] px-3 py-2 text-xs font-semibold text-[#f7f6f9]">
              DASHBOARD
            </Link>
          </div>
        </div>

        {error ? <div className="mt-4 border border-[#ff716c]/40 bg-[#9f0519]/20 p-3 text-xs text-[#ffa8a3]">{error}</div> : null}

        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="border-l-4 border-[#81ecff] bg-[#1e2023] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#ababae]">ledger_health</p>
            <p className="mt-2 font-mono text-2xl text-[#81ecff]">{loading ? "..." : ledgerHealth}</p>
          </div>
          <div className="border-l-4 border-[#00fe66] bg-[#1e2023] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#ababae]">audit_events</p>
            <p className="mt-2 font-mono text-2xl text-[#00fe66]">{loading ? "..." : items.length}</p>
          </div>
          <div className="border-l-4 border-[#ff6e85] bg-[#1e2023] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#ababae]">open_audits</p>
            <p className="mt-2 font-mono text-2xl text-[#ff6e85]">{loading ? "..." : nondeterministicCount}</p>
          </div>
          <div className="border-l-4 border-[#00d4ec] bg-[#1e2023] p-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#ababae]">freeze_recommended</p>
            <p className="mt-2 font-mono text-2xl text-[#00d4ec]">{loading ? "..." : freezeCount}</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="overflow-auto border border-[#47484b]/30 bg-[#1e2023]">
          <table className="min-w-[860px] w-full border-collapse text-left">
            <thead className="bg-black/40">
              <tr className="border-b border-[#47484b]/50 text-[10px] uppercase tracking-[0.18em] text-[#ababae]">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Trace Hash</th>
                <th className="px-4 py-3">Policy Version</th>
                <th className="px-4 py-3">Cryptographic Proof</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#47484b]/25 font-mono text-xs">
              {!loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#ababae]">
                    No audit events found.
                  </td>
                </tr>
              ) : null}
              {items.map((item, index) => {
                const result = determinism.find((entry) => entry.sequence === item.sequence);
                const deterministic = result?.ok ? result.data?.deterministic : false;
                return (
                  <tr key={`${item.sequence}-${item.region_id}-${index}`} className="hover:bg-[#81ecff]/5">
                    <td className="px-4 py-3 text-[#f7f6f9]/85">{formatDate(item.created_at)}</td>
                    <td className="px-4 py-3 font-bold text-[#81ecff]">{shortenHash(item.state_hash)}</td>
                    <td className="px-4 py-3 text-[#f7f6f9]">{item.epoch}</td>
                    <td className="max-w-[320px] truncate px-4 py-3 text-[10px] text-[#ababae]">{item.z3_proof_hash || item.signature || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`${BADGE_BASE} ${
                          deterministic ? "border-[#00fe66]/40 bg-[#00fe66]/15 text-[#00fe66]" : "border-[#ff6e85]/40 bg-[#ff6e85]/15 text-[#ff909e]"
                        }`}
                      >
                        {deterministic ? "VERIFIED" : item.gate_result}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
