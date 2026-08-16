'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Verdict from '../../_components/Verdict';
import type { ReceiptCheckView, ReplayView, RunReceiptView } from '../../_components/types';

const CHECK_GLYPH: Record<ReceiptCheckView['status'], { mark: string; className: string }> = {
  PASS: { mark: 'PASS', className: 'text-emerald-400' },
  REVIEW: { mark: 'REVIEW', className: 'text-yellow-400' },
  BLOCK: { mark: 'BLOCK', className: 'text-red-400' },
  SKIPPED: { mark: '—', className: 'text-slate-600' },
};

/**
 * Proof Receipt — one job, one receipt.
 * See docs/product/DSG_ONE_VERIFIED_EXECUTION.md §2 layer 5.
 */
export default function ReceiptClient({ runId }: { runId: string }) {
  const [receipt, setReceipt] = useState<RunReceiptView | null>(null);
  const [replay, setReplay] = useState<ReplayView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/dsg/v1/runs/${runId}/receipt`, { cache: 'no-store' })
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => {
        if (!alive) return;
        if (!ok || !payload.ok) {
          throw new Error(payload.message || payload.error || 'No receipt for this run.');
        }
        setReceipt(payload.receipt);
        setReplay(payload.replay);
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'No receipt for this run.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [runId]);

  function exportProof() {
    if (!receipt) return;
    // The viewer sandbox blocks page-initiated downloads, so open the raw
    // receipt JSON in a new tab and let the user save it from there.
    window.open(`/api/dsg/v1/runs/${runId}/receipt`, '_blank', 'noopener');
  }

  if (loading) return <p className="text-sm text-slate-400">Loading receipt…</p>;

  if (error) {
    return (
      <div>
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
        <Link href="/one/activity" className="mt-4 inline-block text-sm text-slate-300 underline underline-offset-4">
          Back to activity
        </Link>
      </div>
    );
  }

  if (!receipt) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              DSG Execution Receipt
            </p>
            <h1 className="mt-1 text-lg font-semibold">{receipt.requestedAction}</h1>
          </div>
          <Verdict value={receipt.result} size="lg" />
        </div>

        <dl className="mt-4 space-y-2.5">
          {receipt.checks.map((check, index) => {
            const glyph = CHECK_GLYPH[check.status];
            return (
              <div key={`${check.label}-${index}`} className="flex items-baseline gap-4 text-sm">
                <dt className="min-w-0 flex-1 truncate text-slate-300">{check.label}</dt>
                <dd className={`shrink-0 font-mono text-xs ${glyph.className}`}>{glyph.mark}</dd>
              </div>
            );
          })}

          <div className="flex items-baseline gap-4 border-t border-slate-800 pt-3 text-sm">
            <dt className="flex-1 text-slate-300">Evidence</dt>
            <dd className="shrink-0 text-slate-400">{receipt.evidenceCount} artifacts</dd>
          </div>
          <div className="flex items-baseline gap-4 text-sm">
            <dt className="flex-1 text-slate-300">Replay</dt>
            <dd
              className={`shrink-0 font-mono text-xs ${
                replay?.replayMatch ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {replay?.replayMatch ? 'MATCH' : 'MISMATCH'}
            </dd>
          </div>
          <div className="flex items-baseline gap-4 text-sm">
            <dt className="flex-1 text-slate-300">Proof</dt>
            <dd className="shrink-0 font-mono text-xs text-slate-400">
              {receipt.chain.receiptHash.slice(0, 4)}…{receipt.chain.receiptHash.slice(-4)}
            </dd>
          </div>
        </dl>

        {replay && !replay.replayMatch && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {replay.reason}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/one/runs/${receipt.runId}`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/5"
          >
            View evidence
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/5"
          >
            Replay
          </button>
          <button
            type="button"
            onClick={exportProof}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/5"
          >
            Export proof
          </button>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">{receipt.boundary.note}</p>
    </div>
  );
}
