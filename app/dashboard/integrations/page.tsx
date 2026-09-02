import Link from 'next/link';
import CopyButton from '../../../components/CopyButton';

// Build the Stripe OAuth install URL from deployment environment variables.
// Falls back to the server-side install route, which applies the same logic.
function buildStripeInstallUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  if (clientId) {
    const redirectUri = appUrl
      ? `${appUrl}/stripe/oauth/callback`
      : '/stripe/oauth/callback';
    return `https://marketplace.stripe.com/oauth/v2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }
  if (process.env.NEXT_PUBLIC_STRIPE_INSTALL_URL) {
    return process.env.NEXT_PUBLIC_STRIPE_INSTALL_URL;
  }
  return '/api/stripe/connect/install';
}

const STRIPE_INSTALL_URL = buildStripeInstallUrl();

const quickstart = [
  {
    title: '1. Register integration',
    description: 'Create the organization binding, managed agent, policy binding, and one-time API key. Store the key once; DSG stores only its hash.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/integrations/register \\\n  -H 'content-type: application/json' \\\n  -d '{\"email\":\"dev@yourcompany.com\",\"app_name\":\"Your App\"}'",
    response: 'Returns: org_id, agent_id, api_key',
  },
  {
    title: '2. Attach callback',
    description: 'Register the webhook URL and allowed browser origins so governance decisions can be delivered back to your system.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/integrations/webhooks \\\n  -H 'content-type: application/json' \\\n  -H 'Authorization: Bearer $DSG_API_KEY' \\\n  -d '{\"agent_id\":\"agt_xxx\",\"webhook_url\":\"https://yourapp.com/dsg/events\",\"allowed_origins\":[\"https://yourapp.com\"]}'",
    response: 'Returns: integration profile with normalized allowed_origins',
  },
  {
    title: '3. Execute one governed action',
    description: 'Send one action through DSG. Read the decision and decision hash before expanding the rollout.',
    command: "curl -s -X POST https://YOUR_DSG_DOMAIN/api/execute \\\n  -H 'content-type: application/json' \\\n  -H 'Authorization: Bearer $DSG_API_KEY' \\\n  -d '{\"agent_id\":\"agt_xxx\",\"action\":\"approve_invoice\",\"input\":{\"invoice_id\":\"INV-001\",\"amount\":1250}}'",
    response: 'Returns: decision, latency_ms, policy context, audit evidence',
  },
];

const connectors = [
  {
    name: 'Stripe',
    label: 'OAuth install',
    body: 'Connect a Stripe account for payment and billing governance.',
    href: STRIPE_INSTALL_URL,
    external: true,
  },
  {
    name: 'REST API',
    label: 'Universal',
    body: 'Use the register and execute endpoints with ERP, CRM, internal services, or custom agents.',
    href: '#api-quickstart',
    external: false,
  },
  {
    name: 'Webhook',
    label: 'Event-driven',
    body: 'Add DSG before the final side effect and receive governance results through your callback.',
    href: '#api-quickstart',
    external: false,
  },
  {
    name: 'MCP / OpenAPI',
    label: 'Agent tools',
    body: 'Route existing agent tool calls through the governance surface without rebuilding the agent.',
    href: '/docs',
    external: false,
  },
] as const;

const productionRequirements = [
  'agent_id is bound to one organization',
  'API key is stored as a server-side hash, not plaintext',
  'Policy is resolved before the governed action',
  'Review-required actions expose approval state',
  'Replay protection data is present for protected execution paths',
  'Audit evidence is available before making a production claim',
] as const;

export default function IntegrationsPage() {
  return (
    <main className="min-h-screen bg-[#07080b] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="border-b border-white/[0.07] pb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-blue-300/20 bg-blue-300/[0.07] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-100">
                  Connect
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Start with one workflow
                </span>
              </div>
              <h1 className="mt-5 text-3xl font-bold tracking-[-0.035em] text-white sm:text-5xl">
                Connect one existing workflow in minutes.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Do not migrate the whole stack. Connect one system, execute one governed action, then verify the live decision and evidence before expanding.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/governance-live" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-bold text-white">
                Open live governance
              </Link>
              <Link href="/dashboard/integration" className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-400">
                System truth
              </Link>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-3 lg:grid-cols-3">
          {[
            ['01', 'Connect', 'Choose the smallest existing workflow that can produce one real governed event.'],
            ['02', 'Run', 'Execute one governed action through the same API or tool path your system will actually use.'],
            ['03', 'Verify', 'Read the decision, reason, evidence, and audit trail before adding more workflows.'],
          ].map(([index, title, body]) => (
            <article key={index} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
              <span className="text-xs font-bold text-blue-200">{index}</span>
              <h2 className="mt-4 text-lg font-bold text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{body}</p>
            </article>
          ))}
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">Choose a connection</p>
              <h2 className="mt-2 text-2xl font-bold text-white">Use the stack you already have.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-500">Start with the connector that creates the shortest path to one real action. More integrations can be added after the first proof.</p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {connectors.map((connector) => {
              const classes = 'group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-white/15 hover:bg-white/[0.045]';
              const content = (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-bold text-white">{connector.name}</h3>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                      {connector.label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{connector.body}</p>
                  <p className="mt-5 text-xs font-bold text-blue-200 group-hover:text-blue-100">Open setup →</p>
                </>
              );

              return connector.external ? (
                <a key={connector.name} href={connector.href} target="_blank" rel="noopener noreferrer" className={classes}>
                  {content}
                </a>
              ) : (
                <Link key={connector.name} href={connector.href} className={classes}>
                  {content}
                </Link>
              );
            })}
          </div>
        </section>

        <section id="api-quickstart" className="mt-10 rounded-3xl border border-white/[0.08] bg-[#0a0c10] p-5 sm:p-6">
          <div className="max-w-3xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">API quickstart</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Three calls to the first governed result.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              These commands are explicit so the user can inspect what will be created and sent. Replace the placeholder domain and values with the deployment you are actually using.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            {quickstart.map((step, index) => (
              <details key={step.title} open={index === 0} className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-bold text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{step.description}</p>
                    </div>
                    <span className="mt-1 text-xs font-bold text-slate-600 group-open:rotate-45">+</span>
                  </div>
                </summary>
                <div className="relative mt-4">
                  <pre className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/35 p-4 pr-16 text-xs leading-6 text-emerald-200">
                    <code>{step.command}</code>
                  </pre>
                  <CopyButton text={step.command} />
                </div>
                <p className="mt-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-xs font-medium text-slate-400">
                  {step.response}
                </p>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-blue-300/15 bg-blue-300/[0.045] p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">After the first action</p>
            <h2 className="mt-3 text-xl font-bold text-white">The output should be visible without reading raw logs.</h2>
            <div className="mt-5 grid gap-3">
              {[
                ['/dashboard/governance-live', 'Live decision', 'PASS / BLOCKED / WAITING_PERMISSION / UNVERIFIED plus the five governance stages.'],
                ['/dashboard/proofs', 'Evidence', 'Supporting proof and evidence references used by the governance result.'],
                ['/dashboard/audit', 'Audit', 'Persisted execution record for review and follow-up.'],
              ].map(([href, title, body]) => (
                <Link key={href} href={href} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 transition hover:border-white/15">
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{body}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">Quota-aware rollout</p>
            <h2 className="mt-3 text-xl font-bold text-white">Prove one path before scaling the integration.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-500">
              Keep hosting, API, and provider quotas visible during rollout. A larger rollout is not a success if the first governed action cannot be repeated reliably.
            </p>
            <ol className="mt-5 space-y-3 text-sm text-slate-400">
              <li>1. Connect one workflow.</li>
              <li>2. Run one real governed action.</li>
              <li>3. Verify decision + evidence + audit.</li>
              <li>4. Expand only after the same path is repeatable.</li>
            </ol>
          </div>
        </section>

        <section className="mt-10 rounded-3xl border border-white/[0.08] bg-white/[0.02] p-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-600">Production claim boundary</p>
          <h2 className="mt-3 text-xl font-bold text-white">Verify these requirements before calling the integration production-ready.</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {productionRequirements.map((item) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/[0.07] bg-black/20 p-4">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-white/15 text-[10px] text-slate-500">✓</span>
                <p className="text-sm leading-6 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-600">This checklist describes required evidence. It does not claim the current deployment has passed every item.</p>
        </section>
      </div>
    </main>
  );
}
