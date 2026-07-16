import Link from 'next/link';
import { EmptyState, EvidenceRow, MetricTile, RuntimeWorkflowPage, WorkflowPanel } from '../_components/runtime-workflow';
import { Button } from '@/components/ui/Button';

const verificationSteps = [
  {
    label: '1',
    title: 'Collect evidence',
    body: 'Aggregate executions, checkpoints, policies, and audit events from the live runtime before summarizing status',
  },
  {
    label: '2',
    title: 'Verify chain',
    body: 'Verify the ledger sequence, truth state, and checkpoint hash for completeness and continuity',
  },
  {
    label: '3',
    title: 'Review exceptions',
    body: 'Surface warnings and failures so users know whether to fix policy, runtime, or environment',
  },
  {
    label: '4',
    title: 'Package proof',
    body: 'Package evidence for customers, audits, Marketplace, or Cloud Run smoke evidence',
  },
];

const proofItems = [
  ['Runtime spine', 'truth_states + ledger_entries + checkpoints', 'green'],
  ['Policy source', 'runtime_policies with legacy fallback', 'blue'],
  ['Agent gate', 'Audit Only / Enforce Gate decision path', 'gold'],
  ['Evidence export', 'Ready after live smoke test passes', 'slate'],
] as const;

export default function VerificationPage() {
  return (
    <RuntimeWorkflowPage
      active="/dashboard/verification"
      eyebrow="DSG Evidence Verification"
      title="Verification Flow"
      description="Verify evidence before telling customers or Marketplace that the system is truly ready: see what the runtime has in place, what is still pending, and what needs to be done next"
      status="Evidence review"
      statusTone="blue"
      actions={[
        { href: '/dashboard/live-control', label: 'Open live control', tone: 'gold' },
        { href: '/dashboard/audit', label: 'Audit trail', tone: 'slate' },
      ]}
      steps={verificationSteps}
    >
      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Proof readiness" value="Review" helper="Awaiting smoke evidence from the latest production deployment" tone="blue" />
            <MetricTile label="Runtime spine" value="Ready" helper="RPC/checkpoint path has been filled in Supabase" tone="green" />
            <MetricTile label="Policy flow" value="Ready" helper="Policy workflow page and runtime_policies have been prepared" tone="gold" />
            <MetricTile label="Claim boundary" value="Pending" helper="Not claiming production-ready until Vercel build passes" tone="red" />
          </div>

          <WorkflowPanel
            eyebrow="What user gets"
            title="Where you see results immediately"
            body="Users do not need to read long logs before deciding. This page clearly separates what has passed, what needs re-examination, and which page to navigate to in order to close evidence"
            tone="green"
          />
        </div>

        <div className="space-y-6">
          <WorkflowPanel eyebrow="Verification checklist" title="Proof chain status">
            <div className="space-y-3">
              {proofItems.map(([label, value, tone]) => (
                <EvidenceRow key={label} label={label} value={value} tone={tone} />
              ))}
            </div>
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Next action" title="What to do next">
            <EmptyState
              title="Deploy evidence required before closing"
              body="After the Vercel production build passes, open Live Control and Audit to review runtime status, executions, and audit events, then record smoke evidence for Cloud Run/Marketplace"
              href="/dashboard/live-control"
              action="Go to live control"
            />
          </WorkflowPanel>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/dashboard/executions">
              <Button variant="secondary" className="w-full">
                Review executions
              </Button>
            </Link>
            <Link href="/dashboard/policies">
              <Button variant="primary" className="w-full">
                Review policy flow
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </RuntimeWorkflowPage>
  );
}
