'use client';

import { useState } from 'react';

type VerifyResponse = {
  ok: boolean;
  sequence?: number;
  verified?: boolean;
  entry_hash_valid?: boolean;
  chain_valid?: boolean;
  expected_entry_hash?: string;
  entry?: Record<string, unknown>;
  previous_entry?: Record<string, unknown> | null;
  execution?: Record<string, unknown> | null;
  checkpoint?: Record<string, unknown> | null;
  error?: string;
};

export function VerifyPanel() {
  const [sequence, setSequence] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResponse | null>(null);

  async function verifyNow() {
    try {
      setLoading(true);
      setResult(null);

      const res = await fetch(`/api/ledger/verify/${sequence}`, { cache: 'no-store' });
      const json = await res.json();
      setResult(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.22em] text-cyan-400">Verify</p>
        <h3 className="mt-2 text-lg font-medium">Sequence Verifier</h3>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm">
          <span className="text-neutral-400">Sequence</span>
          <input
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            placeholder="e.g. 42"
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <button
          onClick={verifyNow}
          disabled={loading || !sequence}
          className="rounded-2xl bg-cyan-500 px-4 py-3 font-medium text-black transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Verify Sequence'}
        </button>

        {result ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-black/25 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Verified</div>
                <div className="mt-2 text-2xl font-semibold text-white">{String(Boolean(result.verified))}</div>
              </div>

              <div className="rounded-2xl bg-black/25 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Entry Hash</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-300">{String(Boolean(result.entry_hash_valid))}</div>
              </div>

              <div className="rounded-2xl bg-black/25 p-3">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Chain</div>
                <div className="mt-2 text-2xl font-semibold text-amber-300">{String(Boolean(result.chain_valid))}</div>
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
