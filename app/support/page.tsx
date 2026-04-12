import Link from 'next/link';

const supportChannels = [
  {
    title: 'Email support',
    detail: 'support@dsg.one',
    description:
      'Best for production incidents, account access issues, and policy decision anomalies that require investigation.',
  },
  {
    title: 'Response target',
    detail: 'Within 1 business day',
    description:
      'Pilot and paid workspaces receive triage updates on every open incident until closure.',
  },
  {
    title: 'Escalation path',
    detail: 'Subject: ESCALATION',
    description:
      'For severe impact (blocked operations, incorrect enforcement, or billing disruption), include workspace ID and execution ID.',
  },
];

export default function SupportPage() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Support</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Operational support for DSG Control Plane</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          Use this page as the customer-facing support surface for pilot and production environments.
          Contact the team for incident handling, rollout assistance, and billing-related requests.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {supportChannels.map((channel) => (
          <section key={channel.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{channel.title}</p>
            <h2 className="mt-3 text-2xl font-semibold">{channel.detail}</h2>
            <p className="mt-4 leading-7 text-slate-200">{channel.description}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
        <h3 className="text-xl font-semibold">What to include in a support request</h3>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-slate-200">
          <li>Workspace name and organization ID</li>
          <li>Affected endpoint or dashboard path (for example: /dashboard, /api/usage)</li>
          <li>Execution ID or timestamp range in UTC</li>
          <li>Impact severity (degraded, blocked, or data discrepancy)</li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link href="/docs" className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white">
            Read operator docs
          </Link>
          <Link href="/dashboard" className="rounded-2xl bg-emerald-400 px-6 py-3 text-base font-semibold text-slate-950">
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
