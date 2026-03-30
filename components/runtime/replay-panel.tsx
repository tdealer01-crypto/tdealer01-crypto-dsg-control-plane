'use client';

import { useState } from 'react';

type ReplayResponse = {
  ok: boolean;
  sequence?: number;
  replayed_state_hash?: string;
  expected_next_state_hash?: string;
  matches?: boolean;
  replayed_state?: Record<string, unknown>;
  checkpoint_used?: Record<string, unknown> | null;
  replay_entries?: Array<Record<string, unknown>>;
  error?: string;
};

export function ReplayPanel() {
  const [sequence, setSequence] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ReplayResponse | null>(null);

  async function replayNow() {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch(`/api/ledger/replay/${sequence}`, { cache: 'no-store' });
      const json = await res.json();
      setResult(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.22em] text-violet-400">Replay</p>
        <h3 className="mt-2 text-lg font-medium">State Replay Inspector</h3>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm">
          <span className="text-neutral-400">Target Sequence</span>
          <input
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            placeholder="e.g. 42"
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <button
          onClick={replayNow}
          disabled={loading || !sequence}
          className="rounded-2xl bg-violet-500 px-4 py-3 font-medium text-white transition hover:bg-violet-400 disabled:opacity-50"
        >
          {loading ? 'Replaying…' : 'Replay Sequence'}
        </button>

        {result ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-black/25 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Match</div>
                <div className="mt-2 text-2xl font-semibold text-white">{String(Boolean(result.matches))}</div>
              </div>

              <div className="rounded-2xl bg-black/25 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Replay Hash</div>
                <div className="mt-2 break-all font-mono text-xs text-neutral-300">{result.replayed_state_hash || '-'}</div>
              </div>

              <div className="rounded-2xl bg-black/25 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Expected Hash</div>
                <div className="mt-2 break-all font-mono text-xs text-neutral-300">{result.expected_next_state_hash || '-'}</div>
              </div>
            </div>

            <pre className="overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-neutral-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
