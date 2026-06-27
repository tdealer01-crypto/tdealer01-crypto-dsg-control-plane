'use client';

import { useEffect, useState } from 'react';

type ReadinessItem = { key: string; ok: boolean; detail?: string };
type ReadinessCategory = { name: string; items: ReadinessItem[] };
type GoLiveReadinessReport = {
  org_id: string;
  status: 'ready' | 'needs-attention' | 'not-ready';
  blockers: string[];
  warnings: string[];
  categories: ReadinessCategory[];
  recommended_next_steps: string[];
};

export default function GoLivePage() {
  const [report, setReport] = useState<GoLiveReadinessReport | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch('/api/settings/go-live', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setReport)
      .catch(() => setError(true));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-3xl font-semibold">Go-live readiness</h1>
      <p className="text-slate-300 mt-2">Structured checklist for enterprise rollout.</p>

      {error && <p className="mt-4 text-red-300">Unable to load the readiness report.</p>}
      {!error && !report && <p className="mt-4">Loading...</p>}

      {report && (
        <div className="mt-6">
          <div className="rounded border border-slate-700 bg-slate-900 p-4">
            <p className="text-sm text-slate-300">Overall status</p>
            <p className="text-2xl font-semibold">{report.status}</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {report.categories.map((c) => (
              <div key={c.name} className="rounded border border-slate-800 bg-slate-900 p-4">
                <p className="font-semibold">{c.name}</p>
                {c.items.map((i) => (
                  <p key={i.key} className="text-sm text-slate-300">
                    {i.ok ? '✅' : '⚠️'} {i.key}
                    {i.detail ? <span className="text-slate-500"> — {i.detail}</span> : null}
                  </p>
                ))}
              </div>
            ))}
          </div>

          <div className="mt-6">
            <p className="font-semibold">Blockers</p>
            {report.blockers.length > 0 ? (
              report.blockers.map((b) => (
                <p key={b} className="text-sm text-red-300">
                  • {b}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-400">None</p>
            )}

            <p className="font-semibold mt-4">Warnings</p>
            {report.warnings.length > 0 ? (
              report.warnings.map((w) => (
                <p key={w} className="text-sm text-amber-300">
                  • {w}
                </p>
              ))
            ) : (
              <p className="text-sm text-slate-400">None</p>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <a className="border border-slate-700 rounded px-3 py-2" href="/api/settings/go-live/export?format=json">
              Export JSON
            </a>
            <a className="border border-slate-700 rounded px-3 py-2" href="/api/settings/go-live/export?format=md">
              Export Markdown
            </a>
          </div>
        </div>
      )}
    </main>
  );
}
