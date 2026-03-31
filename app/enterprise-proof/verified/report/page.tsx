import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { buildVerifiedRuntimeProofReport, summarizeVerifiedRuntimeReport } from '../../../../lib/enterprise/proof-runtime';
import { validateOrgAgentScope } from '../../../../lib/enterprise/proof-access';

type Props = {
  searchParams: {
    org_id?: string;
    agent_id?: string;
  };
};

function Section(props: { title: string; observed: string; interpretation: string; confidence: string; gaps: string }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid={props.title.toLowerCase().replace(/\s+/g, '-')}>
      <h2 className="text-2xl font-semibold">{props.title}</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div><dt className="font-semibold text-emerald-300">Observed</dt><dd className="text-slate-200">{props.observed}</dd></div>
        <div><dt className="font-semibold text-cyan-300">Interpretation</dt><dd className="text-slate-200">{props.interpretation}</dd></div>
        <div><dt className="font-semibold text-amber-300">Confidence</dt><dd className="text-slate-200">{props.confidence}</dd></div>
        <div><dt className="font-semibold text-rose-300">Gaps</dt><dd className="text-slate-200">{props.gaps}</dd></div>
      </dl>
    </section>
  );
}

export default async function VerifiedEnterpriseProofReportPage({ searchParams }: Props) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) redirect('/login');

  const orgId = searchParams.org_id || String(profile.org_id);
  const agentId = searchParams.agent_id;

  if (orgId !== profile.org_id) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          Cross-org access is forbidden.
        </div>
      </main>
    );
  }

  if (!agentId) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Verified Runtime Evidence</p>
          <h1 className="mt-3 text-2xl font-semibold">Agent ID is required</h1>
          <p className="mt-3 text-slate-300">Open this page with both org_id and agent_id query params to render runtime-backed evidence.</p>
          <code className="mt-4 block rounded-lg border border-white/10 bg-slate-900 p-3 text-xs text-emerald-200">
            /enterprise-proof/verified/report?org_id={String(profile.org_id)}&agent_id=&lt;agent_id&gt;
          </code>
        </div>
      </main>
    );
  }


  const scope = await validateOrgAgentScope({ orgId: String(orgId), agentId: String(agentId) });
  if (!scope.ok) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
          {scope.error}
        </div>
      </main>
    );
  }

  const report = await buildVerifiedRuntimeProofReport({ orgId: String(orgId), agentId: String(agentId) });
  const summary = summarizeVerifiedRuntimeReport(report);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white" data-testid="verified-runtime-report">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">
          <div>
            <div className="inline-flex rounded-full border border-emerald-300/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-200">
              Verified Runtime Evidence
            </div>
            <h1 className="mt-3 text-3xl font-bold">Enterprise verified runtime report</h1>
            <p className="mt-2 text-sm text-emerald-100">Generated at: {report.generated_at}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/enterprise-proof/report" className="rounded-xl border border-white/15 px-4 py-2">Public Narrative</Link>
            <Link href={`/api/enterprise-proof/runtime-report?org_id=${encodeURIComponent(report.org_id)}&agent_id=${encodeURIComponent(report.agent_id)}`} className="rounded-xl bg-slate-900 px-4 py-2">Open Runtime JSON</Link>
          </div>
        </div>

        <Section
          title="Org / Agent Context"
          observed={`org_id=${report.org_id}, agent_id=${report.agent_id}`}
          interpretation="Evidence is constrained to authenticated org and selected agent scope."
          confidence="High"
          gaps={report.gaps.length ? report.gaps.join(' | ') : 'None'}
        />

        <Section
          title="Runtime Summary"
          observed={`truth_sequence=${report.runtime_summary.truth_sequence ?? 'unknown'}, latest_truth_hash=${report.runtime_summary.latest_truth_hash ?? 'unknown'}`}
          interpretation="Latest runtime truth and ledger identity provide current state visibility."
          confidence={report.runtime_summary.latest_truth_hash ? 'Medium-High' : 'Low'}
          gaps={report.runtime_summary.latest_truth_hash ? 'None' : 'No truth hash available'}
        />

        <Section
          title="Anti-Replay Proof"
          observed={`replay_protected=${report.approval_anti_replay.replay_protected}, terminal_enforced=${report.approval_anti_replay.terminal_approval_enforced}`}
          interpretation="Approval lifecycle indicates whether pending requests can be replayed."
          confidence={report.approval_anti_replay.terminal_approval_enforced ? 'Medium' : 'Low'}
          gaps={report.approval_anti_replay.terminal_approval_enforced ? 'None' : 'No terminal approval records yet'}
        />

        <Section
          title="Ledger Lineage"
          observed={`latest_ledger_sequence=${report.truth_ledger_lineage.latest_ledger_sequence ?? 'unknown'}, drift_detected=${report.truth_ledger_lineage.drift_detected}`}
          interpretation="Ledger/truth drift flag indicates whether lineage continuity appears healthy."
          confidence={report.truth_ledger_lineage.latest_ledger_sequence ? 'Medium-High' : 'Low'}
          gaps={report.truth_ledger_lineage.latest_ledger_sequence ? 'None' : 'No ledger sequence available'}
        />

        <Section
          title="Checkpoint Recovery"
          observed={`pass=${report.checkpoint_recovery.pass}, missing_lineage_count=${report.checkpoint_recovery.missing_lineage_count}`}
          interpretation="Checkpoint recomputation checks whether latest recoverable state is self-consistent."
          confidence={report.checkpoint_recovery.pass ? 'Medium-High' : 'Low'}
          gaps={report.checkpoint_recovery.missing_lineage_count > 0 ? 'Lineage gaps detected' : 'None'}
        />

        <Section
          title="Governance / RBAC"
          observed={`runtime_roles=${report.governance.runtime_roles.join(', ') || 'none'}, policy_count=${report.governance.policy_count}`}
          interpretation="Runtime role assignment and policy inventory indicate governance enforcement posture."
          confidence={report.governance.rbac_enforced ? 'High' : 'Low'}
          gaps={report.governance.rbac_enforced ? 'None' : 'No runtime roles found'}
        />

        <Section
          title="Usage / Billing Value"
          observed={`executions_this_period=${report.billing_operational_value.executions_this_period}, usage_events=${report.billing_operational_value.usage_events}, billed_estimate_usd=${report.billing_operational_value.billed_estimate_usd}`}
          interpretation="Operational and billing counters quantify actual runtime activity in this scope."
          confidence={report.billing_operational_value.usage_events > 0 ? 'Medium' : 'Low'}
          gaps={report.billing_operational_value.usage_events > 0 ? 'None' : 'No usage events found'}
        />

        <Section
          title="Final Verdict"
          observed={`verdict=${summary.final_verdict}, drift_detected=${summary.drift_detected}, checkpoint_pass=${summary.checkpoint_pass}`}
          interpretation="Verified status requires healthy lineage, checkpoint pass, and no unresolved evidence gaps."
          confidence={summary.final_verdict === 'verified' ? 'High' : 'Medium'}
          gaps={summary.gaps.length ? summary.gaps.join(' | ') : 'None'}
        />
      </div>
    </main>
  );
}
