'use client';

import { useEffect, useState } from 'react';

interface StatusData { ok: boolean; repo: string; version: string; env: string; ts: string; checks: { db: boolean }; }

export default function SystemStatus() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agent/status')
      .then((r) => r.json() as Promise<StatusData>)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-5 py-3">
      <p className="text-xs text-slate-500">Checking system status...</p>
    </div>
  );

  if (!data) return (
    <div className="mt-6 rounded-2xl border border-red-400/20 bg-red-400/5 px-5 py-3">
      <p className="text-xs text-red-400">Status check unavailable</p>
    </div>
  );

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Live System Status</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${data.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
          <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${data.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
          {data.ok ? 'Online' : 'Degraded'}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${data.checks.db ? 'border-emerald-400/20 text-emerald-400' : 'border-red-400/20 text-red-400'}`}>
          DB {data.checks.db ? '✓' : '✗'}
        </span>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">{data.env}</span>
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-slate-500">{data.version.slice(0, 7)}</span>
      </div>
    </div>
  );
}
