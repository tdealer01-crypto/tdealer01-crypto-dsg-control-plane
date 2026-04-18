const goals = [
  'Protect authenticated runtime operations',
  'Restrict workspace access by organization boundary',
  'Support reviewable governance workflows',
  'Reduce operational ambiguity around execution decisions',
];

export default function SecurityPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <h1 className="text-4xl font-bold md:text-5xl">Security overview</h1>
      <p className="mt-4 text-lg text-slate-300">
        DSG Control Plane is designed to protect workspace-scoped runtime operations, authenticated administration, and
        governance access.
      </p>

      <section className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Security goals</h2>
        <ul className="mt-5 space-y-3 text-sm text-slate-200">
          {goals.map((goal) => (
            <li key={goal}>• {goal}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Operational boundary</h2>
        <p className="mt-4 text-slate-200">
          Public routes support evaluation and health checks. Workspace-scoped routes are used for authenticated
          execution, audit visibility, and governance review.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Access model</h2>
        <p className="mt-4 text-slate-200">
          Workspace access is intended for authorized users operating inside an active organizational environment.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Security contact</h2>
        <p className="mt-4 text-slate-200">For security questions or reporting, contact the DSG team through the support channel listed below.</p>
      </section>
    </main>
  );
}
