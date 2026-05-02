import Link from 'next/link';
import { StatusBadge } from '../../components/StatusBadge';

export default function SyncCenterPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">DSG ONE — AI Runtime Control Plane</p>
          <h1 className="mt-3 text-4xl font-bold">Sync Center</h1>
          <p className="mt-4 text-slate-300">This page is a sync readiness and integration visibility surface for DSG ONE runtime governance workflows. Live connector orchestration is not yet verified on this public route.</p>
        </header>
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><StatusBadge status="REVIEW" explanation="Sync posture requires operator review." /><p className="mt-3 text-sm text-slate-300">What this page is: sync readiness overview.</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><StatusBadge status="UNSUPPORTED" explanation="No verified live sync execution on this public surface." /><p className="mt-3 text-sm text-slate-300">Live two-way sync execution is unsupported on this route.</p></div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4"><StatusBadge status="REVIEW" explanation="Route available as a compatibility/readiness surface; live sync execution remains unverified." /><p className="mt-3 text-sm text-slate-300">Route available as a compatibility/readiness surface; live sync execution remains unverified.</p></div>
        </section>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-semibold">Next useful actions</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/docs" className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-black">Open docs</Link>
            <Link href="/evidence-pack" className="rounded-xl border border-slate-700 px-4 py-2">View evidence pack</Link>
            <Link href="/dashboard" className="rounded-xl border border-slate-700 px-4 py-2">Open control plane</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
