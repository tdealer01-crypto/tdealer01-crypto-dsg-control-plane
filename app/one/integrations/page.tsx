import Link from 'next/link';

export const dynamic = 'force-dynamic';

/**
 * Integrations — the systems a plan may touch.
 *
 * DSG deliberately uses what the customer already has rather than building a
 * parallel ecosystem. See docs/product/DSG_ONE_VERIFIED_EXECUTION.md §4.
 */
const INTEGRATIONS = [
  {
    id: 'github',
    name: 'GitHub',
    role: 'Code, pull requests, and CI checks.',
    operations: ['checks.read', 'branch.push', 'pull_request.create', 'file.read'],
    settings: '/dashboard/integration',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    role: 'Preview and production deployments.',
    operations: ['deployment.create', 'deployment.promote', 'deployment.health'],
    settings: '/dashboard/integration',
  },
  {
    id: 'supabase',
    name: 'Supabase',
    role: 'Data, migrations, and evidence storage.',
    operations: ['migration.apply', 'schema.read'],
    settings: '/dashboard/integration',
  },
] as const;

export default function IntegrationsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Integrations</h1>
      <p className="mt-1 text-sm text-slate-400">
        The systems a plan is allowed to touch. A step targeting anything else is out of plan.
      </p>

      <ul className="mt-6 space-y-3">
        {INTEGRATIONS.map((integration) => (
          <li
            key={integration.id}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold">{integration.name}</h2>
                <p className="mt-0.5 text-sm text-slate-400">{integration.role}</p>
              </div>
              <Link
                href={integration.settings}
                className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/5"
              >
                Manage
              </Link>
            </div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {integration.operations.map((operation) => (
                <li
                  key={operation}
                  className="rounded-full border border-slate-700 bg-slate-800/50 px-2.5 py-0.5 font-mono text-[11px] text-slate-400"
                >
                  {operation}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        DSG orchestrates and judges; your own runtime performs the work and reports what it
        observed. Credentials for these systems stay where they are today — DSG does not hold them
        on your behalf.
      </p>
    </div>
  );
}
