import Link from 'next/link';

const setupSteps = [
  ['1. Choose an existing system', 'Start from REST, Webhook, Zapier, Make, n8n, ERP, GitHub, or Vercel without migrating anything first'],
  ['2. Place a single endpoint', 'Use a single URL or API route first, then let DSG wrap it with policy, approval, replay check, and evidence'],
  ['3. Run the first proof', 'The system shows PASS, REVIEW, BLOCK, or UNSUPPORTED with the next action required to resolve it'],
  ['4. Share evidence with your team', 'Share the proof trail with IT, risk, finance, or audit before expanding the rollout'],
];

const connectors = [
  ['REST API', 'Ideal for internal apps, ERP wrappers, CRM, finance ops, and custom services'],
  ['Webhook', 'The fastest path for pilots using inbound events and callbacks'],
  ['Zapier / Make', 'No-code bridge for workflows customers already use'],
  ['n8n / Workato', 'Place DSG as a governance layer in front of the existing workflow engine'],
  ['GitHub / Vercel', 'Control releases and deployments with proof checks'],
  ['CSV / SFTP', 'Support for legacy customers or those not yet API-first'],
];

const controls = [
  'SSO/JWKS readiness surface',
  'RBAC and app restrictions',
  'Approval routing',
  'Audit log and evidence export',
  'Replay protection',
  'Rate-limit posture',
  'Go/no-go checklist',
  'Truth boundary against false claims',
];

export default function EnterpriseReadyPage() {
  return (
    <main className="min-h-screen bg-[#07080a] text-slate-100">
      <section className="border-b border-white/10 bg-[linear-gradient(135deg,#07080a,#10131a_55%,#07080a)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-100">Enterprise Ready Autopilot</p>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-white md:text-7xl">Connect DSG to the systems customers already use.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">User-first setup for governed AI, workflow, finance, and deployment operations. Start with one proof, then expand safely.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard/integrations" className="rounded-2xl bg-amber-300 px-6 py-4 text-sm font-black text-slate-950 hover:bg-amber-200">Start setup</Link>
              <Link href="/enterprise-proof/demo" className="rounded-2xl border border-white/15 bg-white/[0.04] px-6 py-4 text-sm font-bold text-white hover:border-emerald-300/40">Run proof demo</Link>
              <Link href="/docs" className="rounded-2xl border border-white/15 px-6 py-4 text-sm font-bold text-slate-200 hover:border-amber-300/40">Launch docs</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-6 shadow-2xl shadow-black/40">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">User benefit</p>
            <div className="mt-5 space-y-3">
              {['One-page setup', 'Copy-paste API commands', 'No-code bridge options', 'Visible proof status', 'No false production claim'].map((item) => (
                <div key={item} className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-50">{item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">Setup flow</p>
        <h2 className="mt-3 text-4xl font-black text-white">Four steps to first governed proof</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {setupSteps.map(([title, body]) => (
            <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-lg font-black text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-slate-300">{body}</p></article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-[#0b0d10]"><div className="mx-auto max-w-7xl px-6 py-14"><p className="text-[11px] uppercase tracking-[0.28em] text-emerald-300">Connector catalog</p><h2 className="mt-3 text-4xl font-black text-white">Meet customers where their stack already is</h2><div className="mt-8 grid gap-4 md:grid-cols-3">{connectors.map(([name, body]) => (<article key={name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="text-2xl font-black text-white">{name}</h3><p className="mt-4 text-sm leading-7 text-slate-300">{body}</p></article>))}</div></div></section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Enterprise controls</p><h2 className="mt-3 text-4xl font-black text-white">Control without slowing the first pilot.</h2><p className="mt-4 text-sm leading-7 text-slate-300">Missing proof becomes a visible next action, not hidden risk.</p></div><div className="grid gap-3 md:grid-cols-2">{controls.map((item) => (<div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-semibold text-slate-200">{item}</div>))}</div></section>

      <section className="mx-auto max-w-7xl px-6 pb-14"><div className="rounded-3xl border border-amber-300/30 bg-amber-300/10 p-6 text-sm leading-7 text-amber-50"><p className="text-[11px] uppercase tracking-[0.28em] text-amber-200">Truth boundary</p><p className="mt-2">Enterprise-ready here means setup-ready, governance-ready, and evidence-ready for a controlled pilot. Certification, independent audit, and production go-live still require recorded proof.</p></div></section>
    </main>
  );
}
