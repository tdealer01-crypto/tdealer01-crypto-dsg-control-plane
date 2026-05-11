const sections = [
  {
    title: 'Data handling boundary',
    body: 'DSG ONE V1 should only process customer data required to operate the app-builder, readiness, proof, and governance workflows. Sensitive or regulated data must be classified before use.',
  },
  {
    title: 'Evidence and audit data',
    body: 'Readiness proof, audit events, generated PRDs, and operational logs may be retained to support traceability and customer review. Retention periods must be finalized before marketplace submission.',
  },
  {
    title: 'No sale of customer data',
    body: 'Customer data should not be sold to third parties. Any subprocessors or integrated services must be documented before enterprise marketplace approval.',
  },
  {
    title: 'Customer controls',
    body: 'Customers should be able to request deletion, export, or review of their workspace data according to the final support and data retention process.',
  },
];

export default function EnterprisePrivacyPage() {
  return (
    <main className="min-h-screen bg-[#090b0f] px-5 py-8 text-slate-100 md:px-10">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-emerald-200">Enterprise Privacy</p>
        <h1 className="mt-3 font-serif text-4xl font-black tracking-tight md:text-6xl">Privacy Notice</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Status: review draft. This page creates a customer-visible privacy boundary. It must be approved and matched to real data flows before marketplace submission.
        </p>
        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
              <h2 className="text-xl font-black text-white">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">{section.body}</p>
            </article>
          ))}
        </div>
        <a href="/enterprise/readiness" className="mt-6 inline-flex rounded-full border border-emerald-400/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-emerald-200">
          Back to readiness
        </a>
      </section>
    </main>
  );
}
