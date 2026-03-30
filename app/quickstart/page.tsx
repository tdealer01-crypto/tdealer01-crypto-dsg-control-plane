import Link from 'next/link';
import { requireProvisionedOperator } from '../../lib/auth-gate';

const steps = [
  'Sign in via /login and ensure your account is provisioned in users(auth_user_id + org_id + is_active=true).',
  'Create an agent from /api/agents with name, policy_id, and monthly_limit.',
  'Call /api/execute with Authorization: Bearer <agent_api_key> and a complete execution envelope.',
  'Open dashboard pages to inspect usage, proofs, and ledger trails.',
];

const executeBody = `{
  "agent_id": "agt_xxx",
  "approval_id": "apr_xxx",
  "request_id": "req_xxx",
  "action": "transfer",
  "next_v": {"amount": 100, "asset": "USDT"},
  "next_t": 1710000000,
  "next_g": "global_guard_v1",
  "next_i": "intent_hash_v1"
}`;

export default async function QuickstartPage() {
  await requireProvisionedOperator('/quickstart');

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

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Execute Contract</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-200">
            <code>{executeBody}</code>
          </pre>
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
