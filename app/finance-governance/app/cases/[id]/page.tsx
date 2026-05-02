import { FinanceGovernanceRepository } from '../../../../../lib/finance-governance/repository';
import { getOrg } from '../../../../../lib/server/getOrg';

type CaseDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const repository = new FinanceGovernanceRepository();

export default async function FinanceGovernanceCaseDetailPage({ params }: CaseDetailPageProps) {
  const { id } = await params;
  const orgId = await getOrg();
  const detail = await repository.getCaseDetail(orgId, id);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-16 text-white">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-7">
          <p className="text-sm uppercase tracking-[0.3em] text-violet-200">Case detail</p>
          <h1 className="mt-4 text-4xl font-bold md:text-5xl">Case {id}</h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">
            This page is the skeleton for transaction summary, policy snapshot, approval chain, and decision context within one governed case.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <p className="text-sm text-slate-400">Status</p>
              <p className="mt-2 text-xl font-semibold text-emerald-100">{detail.status}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-5">
              <p className="text-sm text-slate-400">Evidence export</p>
              <p className="mt-2 text-xl font-semibold text-emerald-100">{detail.exportStatus}</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-7">
          <h2 className="text-2xl font-semibold">Case timeline</h2>
          <div className="mt-6 grid gap-4">
            {detail.timeline.map((item, index) => (
              <div key={item} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-300/20 font-semibold text-cyan-100">
                  {index + 1}
                </div>
                <p className="text-sm text-slate-100">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
