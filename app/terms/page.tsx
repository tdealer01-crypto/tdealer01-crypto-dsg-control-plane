export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <h1 className="text-4xl font-bold md:text-5xl">Terms of use</h1>
      <p className="mt-4 text-lg text-slate-300">
        These terms govern organizational use of DSG workspace features, authenticated access, billing plans, and
        operational controls.
      </p>

      <section className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Service scope</h2>
        <p className="mt-4 text-slate-200">
          DSG provides public evaluation routes and workspace-scoped operational features for governed AI execution.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Workspace use</h2>
        <p className="mt-4 text-slate-200">
          Authenticated workspace features are intended for authorized organizational users operating within an active
          workspace environment.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Plans and billing</h2>
        <p className="mt-4 text-slate-200">
          Paid plans, trials, and organizational usage are governed by the commercial terms attached to the selected
          plan.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Operational boundaries</h2>
        <p className="mt-4 text-slate-200">
          Public product pages and public evaluation routes are not the system of record for workspace-specific evidence
          or operational review.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="mt-4 text-slate-200">Questions about these terms should be directed to the DSG team through the support channel listed below.</p>
      </section>
    </main>
  );
}
