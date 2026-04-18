export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Support</p>
        <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Support and contact</h1>

        <div className="mt-10 grid gap-4">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">Support</p>
            <p className="mt-2 text-sm text-slate-300">Questions about setup, trials, or workspace access? Contact DSG support.</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">Security contact</p>
            <p className="mt-2 text-sm text-slate-300">For security reporting and security-related questions, contact the DSG team directly.</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">Privacy contact</p>
            <p className="mt-2 text-sm text-slate-300">For privacy and data-handling questions, contact DSG support.</p>
          </article>
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="font-semibold text-white">Enterprise contact</p>
            <p className="mt-2 text-sm text-slate-300">Need rollout planning or governance onboarding? Request an Enterprise pilot.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
