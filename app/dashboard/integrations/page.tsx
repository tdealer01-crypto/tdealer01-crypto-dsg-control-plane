import Link from 'next/link';

const quickstart = [
  {
    title: '1) Register integration',
    description: 'Create a trial org, managed agent, policy binding, and one-time API key for server-to-server calls.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/integrations/register \\\n  -H 'content-type: application/json' \\\n  -d '{\"email\":\"dev@customer.com\",\"app_name\":\"Customer ERP\"}'",
    output: 'Returns org_id, agent_id, and api_key. Store the key once; DSG stores only a hash.',
  },
  {
    title: '2) Attach callback / webhook',
    description: 'Connect the customer app back to DSG with a callback URL and allowed browser origins.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/integrations/webhooks \\\n  -H 'content-type: application/json' \\\n  -H 'Authorization: Bearer dsg_live_xxx' \\\n  -d '{\"agent_id\":\"agt_xxx\",\"webhook_url\":\"https://customer.com/dsg/webhook\",\"allowed_origins\":[\"https://customer.com\"]}'",
    output: 'Returns the persisted integration profile and normalized allowed origins.',
  },
  {
    title: '3) Execute one governed action',
    description: 'Send one action through DSG first. The first rollout should prove REVIEW/BLOCK/ALLOW behavior before broad production use.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/execute \\\n  -H 'content-type: application/json' \\\n  -H 'Authorization: Bearer dsg_live_xxx' \\\n  -d '{\"agent_id\":\"agt_xxx\",\"action\":\"approve_invoice\",\"input\":{\"invoice_id\":\"INV-001\",\"amount\":1250}}'",
    output: 'Returns the governed decision, latency, policy context, and audit/evidence posture.',
  },
];

const connectorCards = [
  ['REST API', 'Best for customer apps, ERP wrappers, CRM, finance ops, and internal services.', 'Use /api/integrations/register + /api/execute'],
  ['Webhook', 'Best for events, callbacks, and quick pilots without replacing the customer system.', 'Register callback URL and allowed origins'],
  ['Zapier / Make', 'Best for business teams already using no-code automation.', 'Use DSG as a policy gate before the final action step'],
  ['n8n / Workato', 'Best for ops teams with existing workflow engines.', 'Add DSG as an HTTP node before high-risk actions'],
  ['GitHub / Vercel', 'Best for release, deploy, and go/no-go controls.', 'Route deployment claims through proof checks'],
  ['CSV / SFTP', 'Best for legacy finance or audit batch workflows.', 'Import evidence first, automate later'],
];

const proofChecklist = [
  'agent_id is bound to one org',
  'api_key is hashed server-side',
  'policy is resolved before action',
  'approval state is visible when needed',
  'nonce / idempotency / request hash are present for replay protection',
  'audit hook and evidence hook are visible before production claim',
];

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.92)_45%,rgba(245,197,92,0.08))] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">DSG Enterprise Setup</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Connect one existing workflow in minutes.</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Start with the customer system they already use. Register one integration, attach one callback, run one governed action, then export proof before rollout. No migration required for the first pilot.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/enterprise-ready" className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-5 py-3 text-sm font-bold text-emerald-100">View enterprise flow</Link>
              <Link href="/enterprise-proof/demo" className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">Run proof demo</Link>
              <Link href="/dashboard" className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">Back to dashboard</Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {quickstart.map((step) => (
            <article key={step.title} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-lg font-black text-white">{step.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">{step.description}</p>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 text-xs leading-6 text-emerald-200"><code>{step.command}</code></pre>
              <p className="mt-3 text-xs leading-6 text-slate-400">{step.output}</p>
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0b0d10] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Connector options</p>
          <h2 className="mt-3 text-3xl font-black text-white">Use the customer stack first, not a forced migration.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {connectorCards.map(([name, body, action]) => (
              <article key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-xl font-black text-white">{name}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p>
                <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-xs font-semibold leading-6 text-amber-100">{action}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
          <div className="rounded-3xl border border-amber-300/25 bg-amber-300/10 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Quota-aware rollout</p>
            <h2 className="mt-3 text-2xl font-black text-white">Use local proof first. Deploy once.</h2>
            <p className="mt-3 text-sm leading-7 text-amber-50">
              To preserve Vercel quota, validate copy, routes, typecheck, unit tests, and deterministic gates locally or in a branch. Push to production only after the proof path is reviewed.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Evidence required before enterprise claim</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {proofChecklist.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-semibold text-slate-200">{item}</div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
