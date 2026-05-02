import Link from 'next/link';
import { FinanceGovernanceRepository } from '../../../lib/finance-governance/repository';
import { getOrg } from '../../../lib/server/getOrg';

const repository = new FinanceGovernanceRepository();
export const dynamic = 'force-dynamic';

export default async function FinanceGovernanceAppHomePage() {
  const orgId = await getOrg();
  const workspace = await repository.getWorkspaceSummary(orgId);
  const cards = [
    {
      title: 'Pending approvals',
      value: String(workspace.counts.pendingApprovals),
      text: 'Items waiting for reviewer action in the current workspace.',
    },
    {
      title: 'Open exceptions',
      value: String(workspace.counts.openExceptions),
      text: 'Cases that require exception review, waiver, or follow-up.',
    },
    {
      title: 'Ready exports',
      value: String(workspace.counts.readyExports),
      text: 'Evidence bundles available for internal or external review.',
    },
  ];
  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Workspace</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance governance workspace</h1>
        <p className="mt-6 text-lg leading-8 text-slate-300">
          This is the in-app starting point for onboarding, approval operations, case review, and audit export flows.
        </p>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {cards.map((card) => (
          <section key={card.title} className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
            <p className="text-sm text-slate-400">{card.title}</p>
            <p className="mt-3 text-4xl font-bold text-white">{card.value}</p>
            <p className="mt-4 leading-7 text-slate-200">{card.text}</p>
          </section>
        ))}
      </div>

      <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
        <h2 className="text-2xl font-semibold">Quick links</h2>
        <div className="mt-5 flex flex-wrap gap-4">
          {workspace.quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 text-base font-semibold text-white">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
