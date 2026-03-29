import Link from 'next/link';

const steps = [
  'Create an agent from /api/agents with a policy_id and monthly_limit.',
  'Call /api/execute with the issued API key to run a deterministic decision cycle.',
  'Open dashboard pages to inspect usage, proofs, and ledger trails.',
];

export default function QuickstartPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Quickstart</p>
        <h1 className="mt-4 text-4xl font-bold">Run the product loop</h1>

        <div className="mt-8 space-y-4">
          {steps.map((step, index) => (
            <div key={step} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/10 font-semibold text-emerald-200">
                {index + 1}
              </div>
              <p className="text-sm leading-7 text-slate-200">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/workspace" className="rounded-2xl border border-white/10 px-4 py-3 font-semibold text-slate-200">
            Back to Workspace
          </Link>
          <Link href="/dashboard/executions" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-slate-100">
            View Executions
          </Link>
        </div>
      </div>
    </main>
  );
}
