const supportItems = [
  {
    title: 'Support intake',
    body: 'Customers need a documented channel for product issues, security reports, billing questions, and marketplace installation blockers.',
  },
  {
    title: 'Severity handling',
    body: 'Incidents should be classified by severity, business impact, data exposure risk, and customer workaround availability before a response commitment is made.',
  },
  {
    title: 'Operational runbook',
    body: 'Support responses should reference deployment status, readiness gates, smoke-test output, rollback notes, and known blocked evidence before giving a customer decision.',
  },
  {
    title: 'Marketplace handoff',
    body: 'Submission should include demo script, first-time user checklist, escalation route, and owner for legal/security/support approval.',
  },
];

export default function EnterpriseSupportPage() {
  return (
    <main className="min-h-screen bg-[#090b0f] px-5 py-8 text-slate-100 md:px-10">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-violet-200">Enterprise Support</p>
        <h1 className="mt-3 font-serif text-4xl font-black tracking-tight md:text-6xl">Support and SLA Boundary</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Status: review draft. This page defines the support boundary needed for marketplace readiness. It does not promise a final SLA until support owners and response times are approved.
        </p>
        <div className="mt-6 grid gap-4">
          {supportItems.map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
              <h2 className="text-xl font-black text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">{item.body}</p>
            </article>
          ))}
        </div>
        <a href="/enterprise/readiness" className="mt-6 inline-flex rounded-full border border-violet-400/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-violet-200">
          Back to readiness
        </a>
      </section>
    </main>
  );
}
