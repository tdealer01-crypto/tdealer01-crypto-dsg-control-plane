import Link from 'next/link';

export default function ContactPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Enterprise contact</p>
      <h1 className="mt-4 text-4xl font-bold md:text-5xl">Request Enterprise pilot</h1>
      <p className="mt-6 text-lg leading-8 text-slate-300">
        Need rollout planning or governance onboarding? Request an Enterprise pilot.
      </p>

      <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
        <p className="text-slate-200">For enterprise planning, contact DSG support and include your workspace or organization context.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/support" className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950">
            Contact support
          </Link>
          <Link href="/pricing" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-white">
            Back to pricing
          </Link>
        </div>
      </div>
    </main>
  );
}
