'use client';

import Link from 'next/link';

export default function AppOperationsRoute() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-semibold">Operations</h1>
        <p className="mt-2 text-slate-400">Route entry for the Operations view.</p>
        <div className="mt-8">
          <Link href="/dashboard/operations" className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 font-semibold text-slate-100 hover:border-emerald-400">
            Open Operations Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
