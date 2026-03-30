'use client';

import { useState } from 'react';

type EffectResponse = {
  ok: boolean;
  items?: Array<{
    effect_id: string;
    request_id: string;
    action: string;
    status: string;
    payload_hash: string;
    external_receipt: Record<string, unknown>;
    updated_at: string;
  }>;
  error?: string;
};

export function EffectInspector() {
  const [effectId, setEffectId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EffectResponse | null>(null);

  async function inspectNow() {
    try {
      setLoading(true);
      setResult(null);

      const url = effectId
        ? `/api/effects?effect_id=${encodeURIComponent(effectId)}`
        : '/api/effects';

      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json();
      setResult(json);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-400">Effects</p>
        <h3 className="mt-2 text-lg font-medium">Effect Inspector</h3>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm">
          <span className="text-neutral-400">Effect ID</span>
          <input
            value={effectId}
            onChange={(e) => setEffectId(e.target.value)}
            placeholder="leave empty to list recent effects"
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <button
          onClick={inspectNow}
          disabled={loading}
          className="rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-black transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Inspect Effect'}
        </button>

        {result ? (
          <div className="space-y-3">
            {(result.items || []).map((item) => (
              <div key={item.effect_id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="font-medium">{item.action}</div>
                  <div className="text-xs uppercase text-neutral-400">{item.status}</div>
                </div>

                <div className="mt-2 text-xs text-neutral-400">req {item.request_id}</div>

                <div className="mt-2 break-all font-mono text-xs text-neutral-300">{item.effect_id}</div>

                <details className="mt-3 rounded-2xl bg-white/5 p-3">
                  <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-neutral-400">
                    external receipt
                  </summary>
                  <pre className="mt-3 overflow-x-auto text-xs text-neutral-300">
                    {JSON.stringify(item.external_receipt, null, 2)}
                  </pre>
                </details>
              </div>
            ))}

            {!result.items || result.items.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-neutral-500">
                No effects found.
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
