import Link from 'next/link';

const steps = [
  {
    title: '1) Register integration',
    description: 'Create a managed org + agent and receive an API key for server-to-server calls.',
    command:
      "curl -X POST /api/integrations/register -d '{\"email\":\"dev@customer.com\",\"app_name\":\"My ERP\"}'",
  },
  {
    title: '2) Register webhook',
    description: 'Attach callback URL and browser CORS origins using the API key from step 1.',
    command:
      "curl -X POST /api/integrations/webhooks -H 'Authorization: Bearer dsg_live_xxx' -d '{\"agent_id\":\"agt_xxx\",\"webhook_url\":\"https://customer.com/webhook\",\"allowed_origins\":[\"https://customer.com\"]}'",
  },
  {
    title: '3) Execute actions',
    description: 'Use the agent/API key pair against /api/execute or install @dsg/sdk.',
    command:
      "curl -X POST /api/execute -H 'Authorization: Bearer dsg_live_xxx' -d '{\"agent_id\":\"agt_xxx\",\"action\":\"approve_invoice\",\"input\":{}}'",
  },
];

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">DSG</p>
            <h1 className="mt-2 text-3xl font-semibold">Integrations</h1>
            <p className="mt-2 text-slate-400">
              Self-service onboarding for customer apps with API key provisioning, webhook setup,
              and SDK-ready execution flow.
            </p>
          </div>
          <Link href="/dashboard" className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-200">
            Back to dashboard
          </Link>
        </div>

        <section className="mt-8 space-y-4">
          {steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm text-slate-300">{step.description}</p>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-700 bg-slate-950 p-4 text-xs text-emerald-200">
                <code>{step.command}</code>
              </pre>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
