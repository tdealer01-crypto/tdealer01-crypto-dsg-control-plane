'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Verdict, { toVerdict } from '../_components/Verdict';
import { shortHash, type RunSummaryView } from '../_components/types';

function when(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

/** Proofs — receipts for settled runs. A run only appears once it has a verdict. */
export default function ProofsPage() {
  const [runs, setRuns] = useState<RunSummaryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/dsg/v1/runs?limit=50', { cache: 'no-store' })
      .then(async (response) => ({ ok: response.ok, payload: await response.json() }))
      .then(({ ok, payload }) => {
        if (!alive) return;
        if (!ok || !payload.ok) throw new Error(payload.error || 'Could not load proofs.');
        // CANCELLED runs never ran, so they have nothing to prove.
        setRuns(
          (payload.runs as RunSummaryView[]).filter((run) =>
            ['VERIFIED', 'NEEDS_REVIEW', 'BLOCKED'].includes(run.status),
          ),
        );
      })
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load proofs.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <h1 className="text-xl font-semibold">Proofs</h1>
      <p className="mt-1 text-sm text-slate-400">
        One receipt per finished run. Each one replays to the same verdict, or says why not.
      </p>

      {error && (
        <div role="alert" className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && <p className="mt-6 text-sm text-slate-400">Loading…</p>}

      {!loading && !error && runs.length === 0 && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-8 text-center">
          <p className="text-sm text-slate-400">No finished runs yet.</p>
          <Link href="/one" className="mt-3 inline-block text-sm text-slate-200 underline underline-offset-4">
            Start one
          </Link>
        </div>
      )}

      <ul className="mt-6 space-y-2">
        {runs.map((run) => (
          <li key={run.runId}>
            <Link
              href={`/one/proofs/${run.runId}`}
              className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 transition-colors hover:border-slate-700 hover:bg-slate-900"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-slate-200">{run.intent}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {when(run.updatedAt)} · plan {shortHash(run.planHash)}
                </p>
              </div>
              <Verdict value={toVerdict(run.status)!} size="sm" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
