'use client';

import Link from 'next/link';

export default function AppStabilityRoute() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold">Stability</h1>
        <p className="mt-2 text-slate-400">Route entry for stability and entropy monitoring.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard/mission" className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 font-semibold text-slate-100 hover:border-emerald-400">
            Open Mission Dashboard
          </Link>
          <Link href="/dashboard/audit" className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 font-semibold text-slate-100 hover:border-emerald-400">
            Open Audit Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
