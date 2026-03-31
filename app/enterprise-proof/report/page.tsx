'use client';

import { useEffect, useState } from 'react';

export default function EnterpriseProofReportPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgId = params.get('org_id');
    const agentId = params.get('agent_id');
    if (!orgId || !agentId) {
      setError('org_id and agent_id query parameters are required.');
      return;
    }

    const token = process.env.NEXT_PUBLIC_DEMO_BOOTSTRAP_TOKEN || '';
    fetch(`/api/enterprise-proof/report?org_id=${encodeURIComponent(orgId)}&agent_id=${encodeURIComponent(agentId)}`, {
      headers: { 'x-demo-token': token },
      cache: 'no-store',
    })
      .then(async (res) => ({ ok: res.ok, json: await res.json() }))
      .then(({ ok, json }) => {
        if (!ok) throw new Error(json.error || 'Failed to load enterprise report');
        setData(json);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load enterprise report'));
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white" data-testid="enterprise-proof-report">
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="text-3xl font-semibold">Executive Enterprise Proof Report</h1>
        {error ? <div className="rounded-xl border border-red-700 bg-red-900/30 p-4">{error}</div> : null}
        {data ? (
          <>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" data-testid="value-landing">Enterprise value: deterministic, auditable runtime governance</section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" data-testid="security-context">
              Security context (org/agent): {data.org_id} / {data.agent_id}
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" data-testid="runtime-summary">
              Runtime summary: truth hash {data.truth_ledger_lineage.latest_truth_hash || 'none'}, sequence {data.truth_ledger_lineage.latest_ledger_sequence}
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" data-testid="ledger-lineage">
              Ledger lineage: truth seq {data.truth_ledger_lineage.latest_truth_sequence}, drift {String(data.truth_ledger_lineage.drift_detected)}
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" data-testid="governance-panel">
              Governance: roles {data.governance.runtime_roles.join(', ') || 'none'} / policies {data.governance.policy_count}
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" data-testid="checkpoint-recovery">
              Checkpoint recovery: pass {String(data.checkpoint_recovery.pass)}, missing lineage {data.checkpoint_recovery.missing_lineage_count}
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6" data-testid="billing-value">
              Billing value: executions {data.billing_operational_value.executions_this_period}, usage events {data.billing_operational_value.usage_events}, estimate ${data.billing_operational_value.billed_estimate_usd}
            </section>
            <section className="rounded-2xl border border-cyan-700 bg-cyan-900/20 p-6" data-testid="executive-proof-final">
              Anti-replay: {String(data.approval_anti_replay.replay_protected)} · Checkpoint hash match: {String(data.checkpoint_recovery.pass)}
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
