'use client';

import { useEffect, useState } from 'react';

interface StatusData { ok: boolean; env: string; version: string; checks: { db: boolean }; }

export default function LiveStatusBadge() {
  const [data, setData] = useState<StatusData | null>(null);

  useEffect(() => {
    fetch('/api/agent/status')
      .then((r) => r.json() as Promise<StatusData>)
      .then(setData)
      .catch(() => null);
  }, []);

  if (!data) return null;

  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-semibold ${data.ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
        <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${data.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        DSG Gate {data.ok ? 'Online' : 'Degraded'}
      </span>
      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-400">
        DB {data.checks.db ? '✓' : '✗'}
      </span>
      <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-400">{data.env}</span>
    </div>
  );
}
