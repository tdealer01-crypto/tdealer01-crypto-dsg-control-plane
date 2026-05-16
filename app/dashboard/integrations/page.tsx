import Link from 'next/link';
import CopyButton from '../../../components/CopyButton';

const quickstart = [
  {
    title: '1. Register your integration',
    description: 'Creates an org, managed agent, policy binding, and a one-time API key for server-to-server calls. Store the key once — DSG only keeps a hash.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/integrations/register \\\n  -H 'content-type: application/json' \\\n  -d '{\"email\":\"dev@yourcompany.com\",\"app_name\":\"Your App\"}'",
    response: 'Returns: org_id, agent_id, api_key',
  },
  {
    title: '2. Attach a webhook callback',
    description: 'Connect your app back to DSG so governance decisions can be delivered as events. Set the webhook URL and allowed browser origins.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/integrations/webhooks \\\n  -H 'content-type: application/json' \\\n  -H 'Authorization: Bearer dsg_live_YOUR_KEY' \\\n  -d '{\"agent_id\":\"agt_xxx\",\"webhook_url\":\"https://yourapp.com/dsg/events\",\"allowed_origins\":[\"https://yourapp.com\"]}'",
    response: 'Returns: integration profile with normalized allowed_origins',
  },
  {
    title: '3. Run your first governed action',
    description: 'Send one action through DSG. Verify the ALLOW/REVIEW/BLOCK response and check the decision hash before rolling out to production.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/execute \\\n  -H 'content-type: application/json' \\\n  -H 'Authorization: Bearer dsg_live_YOUR_KEY' \\\n  -d '{\"agent_id\":\"agt_xxx\",\"action\":\"approve_invoice\",\"input\":{\"invoice_id\":\"INV-001\",\"amount\":1250}}'",
    response: 'Returns: decision (ALLOW/REVIEW/BLOCK), latency_ms, policy context, audit evidence',
  },
];

const connectorCards = [
  {
    name: 'REST API',
    use: 'ERP wrappers, CRM, finance ops, internal services',
    hint: '/api/integrations/register + /api/execute',
  },
  {
    name: 'Webhook',
    use: 'Event-driven apps, callbacks, quick pilots without system replacement',
    hint: 'Register callback URL + allowed origins',
  },
  {
    name: 'Zapier / Make',
    use: 'Business teams on no-code automation stacks',
    hint: 'Add DSG as a policy gate before the final action step',
  },
  {
    name: 'n8n / Workato',
    use: 'Ops teams with existing workflow engines',
    hint: 'Add DSG as an HTTP node before high-risk actions',
  },
  {
    name: 'GitHub / Vercel',
    use: 'Release, deploy, and go/no-go controls',
    hint: 'Route deployment claims through proof checks',
  },
  {
    name: 'CSV / SFTP',
    use: 'Legacy finance or audit batch workflows',
    hint: 'Import evidence first, automate the gate later',
  },
];

const evidenceChecklist = [
  { item: 'agent_id is bound to one org', done: true },
  { item: 'api_key is hashed server-side (never stored in plaintext)', done: true },
  { item: 'Policy is resolved before every action', done: true },
  { item: 'Approval state is visible when a review is required', done: true },
  { item: 'Replay protection: nonce + idempotency key + request hash present', done: true },
  { item: 'Audit hook visible before production claim', done: true },
];

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">

        {/* Hero */}
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.16),rgba(15,23,42,0.92)_45%,rgba(245,197,92,0.08))] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-200">Enterprise Setup</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
                Connect your existing workflow in 3 steps.
              </h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                No migration required. Register one integration, attach a callback, run one governed action, then export proof. Works with any system that supports REST or webhooks.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/enterprise-ready" className="rounded-2xl border border-emerald-300/40 bg-emerald-300/10 px-5 py-3 text-sm font-bold text-emerald-100">
                View enterprise flow
              </Link>
              <Link href="/enterprise-proof/demo" className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950">
                Run proof demo
              </Link>
              <Link href="/dashboard" className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Quickstart steps */}
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {quickstart.map((step) => (
            <article key={step.title} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="text-base font-black text-white">{step.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">{step.description}</p>
              <div className="relative mt-4">
                <pre className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 pr-16 text-xs leading-6 text-emerald-200">
                  <code>{step.command}</code>
                </pre>
                <CopyButton text={step.command} />
              </div>
              <p className="mt-3 rounded-xl border border-emerald-400/10 bg-emerald-400/5 px-3 py-2 text-xs font-medium text-emerald-300">
                {step.response}
              </p>
            </article>
          ))}
        </section>

        {/* Connector options */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0b0d10] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Connector options</p>
          <h2 className="mt-3 text-2xl font-black text-white">Use your existing stack — no migration required.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {connectorCards.map((card) => (
              <article key={card.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="text-lg font-black text-white">{card.name}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{card.use}</p>
                <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-100">
                  {card.hint}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Evidence checklist */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Before making an enterprise claim</p>
          <h2 className="mt-3 text-xl font-black text-white">Verify all 6 evidence requirements are met.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {evidenceChecklist.map(({ item, done }) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                <span className={`mt-0.5 shrink-0 text-base ${done ? 'text-emerald-400' : 'text-slate-600'}`}>
                  {done ? '✓' : '○'}
                </span>
                <p className="text-sm text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
