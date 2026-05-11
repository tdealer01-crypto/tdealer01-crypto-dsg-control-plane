const sections = [
  {
    title: 'Use of service',
    body: 'DSG ONE V1 is provided as a governed app-builder and readiness workspace. Operators must verify generated plans, proofs, and deployment evidence before treating any output as production-ready.',
  },
  {
    title: 'No unsupported production claim',
    body: 'The service must not be represented as fully enterprise marketplace ready, compliance-approved, or autonomous-complete unless the required readiness evidence is attached and review gates are marked accordingly.',
  },
  {
    title: 'Customer responsibilities',
    body: 'Customers are responsible for verifying workspace access, data permissions, billing entitlements, and any regulated use case before deployment to end users.',
  },
  {
    title: 'Availability and changes',
    body: 'Operational readiness, deployment status, support coverage, and incident response commitments must be documented in the support page and validated before marketplace submission.',
  },
];

export default function EnterpriseTermsPage() {
  return (
    <main className="min-h-screen bg-[#090b0f] px-5 py-8 text-slate-100 md:px-10">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-200">Enterprise Terms</p>
        <h1 className="mt-3 font-serif text-4xl font-black tracking-tight md:text-6xl">Terms of Service</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Status: review draft. This page gives customers a visible operating boundary for marketplace review. It is not marked as legal-approved until counsel or the responsible operator approves it.
        </p>
        <div className="mt-6 grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
              <h2 className="text-xl font-black text-white">{section.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">{section.body}</p>
            </article>
          ))}
        </div>
        <a href="/enterprise/readiness" className="mt-6 inline-flex rounded-full border border-amber-400/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-amber-200">
          Back to readiness
        </a>
      </section>
    </main>
  );
}
