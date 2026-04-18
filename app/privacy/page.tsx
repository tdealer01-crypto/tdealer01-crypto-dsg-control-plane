const covers = [
  'Workspace account information',
  'Runtime request and execution metadata',
  'Usage and audit visibility',
  'Organizational access boundaries',
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <h1 className="text-4xl font-bold md:text-5xl">Privacy overview</h1>
      <p className="mt-4 text-lg text-slate-300">
        This page describes how DSG handles workspace data, access boundaries, runtime records, and operational
        metadata.
      </p>

      <section className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">What this page covers</h2>
        <ul className="mt-4 space-y-2 text-slate-200">
          {covers.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Public and workspace routes</h2>
        <p className="mt-4 text-slate-200">
          Public routes are available for product evaluation and service checks. Workspace routes are used for
          authenticated execution and operational review.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Operational use of data</h2>
        <p className="mt-4 text-slate-200">
          Runtime and workspace information may be used to support service operation, usage visibility, governance
          review, and account administration.
        </p>
      </section>

      <section className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
        <h2 className="text-2xl font-semibold">Contact</h2>
        <p className="mt-4 text-slate-200">For privacy questions, contact the DSG team through the support channel listed below.</p>
      </section>
    </main>
  );
}
