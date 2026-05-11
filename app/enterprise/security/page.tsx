const controls = [
  {
    title: 'Evidence-first readiness gates',
    body: 'Marketplace readiness gates remain REVIEW or BLOCKED until backed by a real route, test, deployment, customer-facing page, or audit proof.',
  },
  {
    title: 'Access control expectations',
    body: 'Enterprise deployment must prove server-side RBAC, organization isolation, deny-by-default behavior, and audit events for privileged actions before the security gate can pass.',
  },
  {
    title: 'Secrets and production boundaries',
    body: 'Secrets must stay in the deployment environment and must not be exposed through generated apps, client logs, public pages, or model prompts.',
  },
  {
    title: 'Incident and vulnerability intake',
    body: 'A customer-visible support path must exist for security reports, incident triage, remediation status, and coordinated disclosure before marketplace launch.',
  },
];

export default function EnterpriseSecurityPage() {
  return (
    <main className="min-h-screen bg-[#090b0f] px-5 py-8 text-slate-100 md:px-10">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200">Enterprise Security</p>
        <h1 className="mt-3 font-serif text-4xl font-black tracking-tight md:text-6xl">Security Overview</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Status: review draft. This page states the security control targets for marketplace review. It does not claim SOC 2, ISO, penetration-test, or compliance approval without external evidence.
        </p>
        <div className="mt-6 grid gap-4">
          {controls.map((control) => (
            <article key={control.title} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
              <h2 className="text-xl font-black text-white">{control.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">{control.body}</p>
            </article>
          ))}
        </div>
        <a href="/enterprise/readiness" className="mt-6 inline-flex rounded-full border border-cyan-400/40 px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-cyan-200">
          Back to readiness
        </a>
      </section>
    </main>
  );
}
