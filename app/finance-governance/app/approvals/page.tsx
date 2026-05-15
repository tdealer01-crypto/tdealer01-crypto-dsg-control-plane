import ApprovalsTable from '../../../../components/finance/ApprovalsTable';
import ErrorBoundary from '../../../../components/ErrorBoundary';
import { FinanceGovernanceRepository } from '../../../../lib/finance-governance/repository';
import { getOrg } from '../../../../lib/server/getOrg';

const repository = new FinanceGovernanceRepository();
export const dynamic = 'force-dynamic';

export default async function FinanceGovernanceApprovalsPage() {
  const orgId = await getOrg();
  const approvals = await repository.getApprovals(orgId);

  const pending = approvals.filter((a) => !['approved', 'rejected'].includes(a.status.toLowerCase()));

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 text-white">
      <div className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Approval queue</p>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Finance approvals</h1>
        <p className="mt-4 text-base leading-7 text-slate-400">
          {pending.length > 0
            ? `${pending.length} item${pending.length === 1 ? '' : 's'} waiting for your decision.`
            : 'All caught up — no pending approvals.'}
        </p>
      </div>

      <div className="mt-8">
        <ErrorBoundary>
          <ApprovalsTable approvals={approvals} />
        </ErrorBoundary>
      </div>
    </main>
  );
}
