'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Report = {
  org_id: string;
  agent_id: string;
  generated_at: string;
  approval_anti_replay: { pending: number; consumed: number; replay_protected: boolean };
  truth_ledger_lineage: {
    latest_truth_hash: string | null;
    latest_ledger_sequence: number;
    latest_truth_sequence: number;
    drift_detected: boolean;
  };
  checkpoint_recovery: {
    pass: boolean;
    checkpoint_hash: string | null;
    recomputed_checkpoint_hash: string | null;
    missing_lineage_count: number;
  };
  governance: { runtime_roles: string[]; policy_count: number };
  billing_operational_value: { executions_this_period: number; usage_events: number; billed_estimate_usd: number };
};

function Badge({ pass }: { pass: boolean }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold print:border ${pass ? 'bg-emerald-100 text-emerald-800 print:border-emerald-400' : 'bg-red-100 text-red-800 print:border-red-400'}`}>
      {pass ? 'PASS' : 'FAIL'}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 py-2 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-mono text-slate-900 text-right break-all">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 print:break-inside-avoid">
      <h2 className="mb-3 text-base font-bold text-slate-800 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

export default function CompliancePDFPage() {
  const params = useParams();
  const agentId = typeof params.agentId === 'string' ? params.agentId : '';
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!agentId) return;
    fetch(`/api/enterprise-proof?agent_id=${encodeURIComponent(agentId)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('Failed to load report');
        return r.json() as Promise<Report>;
      })
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [agentId]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="rounded-xl border border-red-200 bg-white p-8 text-center">
          <p className="text-red-600">{error}</p>
          <p className="mt-2 text-sm text-slate-500">Make sure you are logged in and the agent_id is correct.</p>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-500 animate-pulse">Generating compliance report…</p>
      </main>
    );
  }

  const generatedDate = new Date(report.generated_at).toLocaleString('en-US', {
    dateStyle: 'long', timeStyle: 'short',
  });

  const allPass =
    report.approval_anti_replay.replay_protected &&
    !report.truth_ledger_lineage.drift_detected &&
    report.checkpoint_recovery.pass;

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          @page { margin: 20mm; size: A4; }
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between bg-slate-900 px-6 py-3 text-white">
        <span className="text-sm font-semibold">Compliance Proof Report — {agentId}</span>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-black hover:bg-amber-400 transition-colors"
          >
            ⬇ Download PDF
          </button>
          <button
            onClick={() => window.close()}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>

      {/* Report body */}
      <main className="min-h-screen bg-slate-100 px-6 py-8 print:bg-white print:p-0">
        <div className="mx-auto max-w-3xl bg-white rounded-2xl shadow-sm print:shadow-none print:rounded-none">
          <div className="p-8 print:p-0">

            {/* Header */}
            <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-6">
              <div>
                <div className="mb-1 text-xs font-bold uppercase tracking-widest text-amber-600">DSG ONE</div>
                <h1 className="text-2xl font-bold text-slate-900">Compliance Proof Report</h1>
                <p className="mt-1 text-sm text-slate-500">Cryptographic audit evidence for AI governance compliance</p>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold ${allPass ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  <span>{allPass ? '✅' : '⚠️'}</span>
                  <span>{allPass ? 'ALL CHECKS PASS' : 'REVIEW REQUIRED'}</span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <Section title="Report Metadata">
              <Row label="Generated at" value={generatedDate} />
              <Row label="Organization ID" value={report.org_id} />
              <Row label="Agent ID" value={report.agent_id} />
            </Section>

            {/* Anti-Replay */}
            <Section title="Anti-Replay Protection (EU AI Act Art. 12)">
              <Row label="Status" value={<Badge pass={report.approval_anti_replay.replay_protected} />} />
              <Row label="Consumed approvals" value={report.approval_anti_replay.consumed} />
              <Row label="Pending approvals" value={report.approval_anti_replay.pending} />
              <p className="mt-3 text-xs text-slate-400">
                Each approval request is single-use. Consumed approvals cannot be replayed, satisfying tamper-evidence requirements.
              </p>
            </Section>

            {/* Ledger Lineage */}
            <Section title="Truth Ledger Lineage (EU AI Act Art. 9)">
              <Row label="Drift detected" value={<Badge pass={!report.truth_ledger_lineage.drift_detected} />} />
              <Row label="Latest truth hash" value={report.truth_ledger_lineage.latest_truth_hash ?? '—'} />
              <Row label="Ledger sequence" value={report.truth_ledger_lineage.latest_ledger_sequence} />
              <Row label="Truth sequence" value={report.truth_ledger_lineage.latest_truth_sequence} />
              <p className="mt-3 text-xs text-slate-400">
                Every gate decision is hashed (SHA-256) and chained to a monotonic ledger. Drift detection ensures continuity.
              </p>
            </Section>

            {/* Checkpoint Recovery */}
            <Section title="Checkpoint Recovery Integrity">
              <Row label="Recovery check" value={<Badge pass={report.checkpoint_recovery.pass} />} />
              <Row label="Missing lineage entries" value={report.checkpoint_recovery.missing_lineage_count} />
              <Row label="Checkpoint hash" value={report.checkpoint_recovery.checkpoint_hash ?? '—'} />
              <Row label="Recomputed hash" value={report.checkpoint_recovery.recomputed_checkpoint_hash ?? '—'} />
            </Section>

            {/* Governance */}
            <Section title="Governance Configuration (EU AI Act Art. 14)">
              <Row label="Runtime roles" value={report.governance.runtime_roles.join(', ') || '—'} />
              <Row label="Active policies" value={report.governance.policy_count} />
              <p className="mt-3 text-xs text-slate-400">
                Runtime roles define human oversight boundaries. Policies configure which agent actions require approval.
              </p>
            </Section>

            {/* Operational Value */}
            <Section title="Operational Usage">
              <Row label="Executions this period" value={report.billing_operational_value.executions_this_period} />
              <Row label="Usage events" value={report.billing_operational_value.usage_events} />
              <Row label="Billed estimate" value={`$${report.billing_operational_value.billed_estimate_usd.toFixed(4)} USD`} />
            </Section>

            {/* Footer */}
            <div className="mt-8 border-t border-slate-200 pt-6 text-center">
              <p className="text-xs text-slate-400">
                This report was generated automatically by DSG ONE · dsg.one<br />
                EU AI Act Art. 9 (Risk Management) · Art. 12 (Record Keeping) · Art. 14 (Human Oversight)<br />
                Report hash: <span className="font-mono">{Buffer.from(JSON.stringify(report)).toString('base64').slice(0, 32)}…</span>
              </p>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
