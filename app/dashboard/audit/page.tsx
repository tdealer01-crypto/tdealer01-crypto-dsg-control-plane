'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, EvidenceRow, MetricTile, RuntimeWorkflowPage, WorkflowPanel } from '../_components/runtime-workflow';
import { Card } from '@/components/ui/Card';

type AuditEvent = {
  id?: number;
  epoch: string;
  sequence: number;
  region_id: string;
  state_hash: string;
  entropy: number;
  gate_result: string;
  z3_proof_hash?: string | null;
  signature?: string | null;
  created_at: string;
};

type DeterminismResult = {
  sequence: number;
  ok: boolean;
  data: null | {
    sequence: number;
    region_count: number;
    unique_state_hashes: number;
    max_entropy: number;
    deterministic: boolean;
    gate_action: string;
  };
  error: string | null;
};

const steps = [
  { label: '1', title: 'Read timeline', body: 'View audit events ordered by sequence and timestamp to detect incidents quickly' },
  { label: '2', title: 'Check determinism', body: 'Inspect deterministic state, entropy, and gate actions that should be frozen or reviewed' },
  { label: '3', title: 'Open evidence', body: 'View hash, signature, z3 proof, and state metadata for retroactive verification' },
  { label: '4', title: 'Export proof', body: 'Use evidence with customer compliance requirements or as Marketplace smoke proof' },
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function shortenHash(value?: string | null) {
  if (!value) return '-';
  if (value.length < 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function resultTone(result?: string): 'green' | 'blue' | 'red' | 'gold' | 'slate' {
  const normalized = String(result || '').toUpperCase();
  if (normalized === 'ALLOW' || normalized === 'PASS' || normalized === 'VERIFIED') return 'green';
  if (normalized === 'STABILIZE' || normalized === 'REVIEW') return 'gold';
  if (normalized === 'BLOCK' || normalized === 'FREEZE' || normalized === 'FAIL') return 'red';
  return 'slate';
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [determinism, setDeterminism] = useState<DeterminismResult[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSequence, setSelectedSequence] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/audit?limit=20', { cache: 'no-store' });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Failed to load audit data');
        if (!alive) return;
        const nextItems = (json.items || []) as AuditEvent[];
        setItems(nextItems);
        setDeterminism((json.determinism || []) as DeterminismResult[]);
        setSelectedSequence((current) => current ?? nextItems[0]?.sequence ?? null);
        if (json.error) setError(json.error);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load audit data');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  const selectedItem = useMemo(
    () => items.find((item) => item.sequence === selectedSequence) || items[0] || null,
    [items, selectedSequence],
  );

  const selectedDeterminism = useMemo(
    () => determinism.find((item) => item.sequence === selectedItem?.sequence) || null,
    [determinism, selectedItem],
  );

  const freezeCount = determinism.filter((item) => item.ok && item.data?.gate_action === 'FREEZE').length;
  const nondeterministicCount = determinism.filter((item) => item.ok && !item.data?.deterministic).length;
  const verifiedCount = determinism.filter((item) => item.ok && item.data?.deterministic).length;
  const ledgerHealth = useMemo(() => {
    if (!determinism.length) return '--';
    return `${((verifiedCount / determinism.length) * 100).toFixed(1)}%`;
  }, [determinism.length, verifiedCount]);

  const evidenceJson = useMemo(() => {
    return JSON.stringify(
      {
        audit_event: selectedItem,
        determinism: selectedDeterminism,
        proof_ready: Boolean(selectedItem?.state_hash || selectedItem?.signature || selectedItem?.z3_proof_hash),
      },
      null,
      2,
    );
  }, [selectedItem, selectedDeterminism]);

  return (
    <RuntimeWorkflowPage
      active="/dashboard/audit"
      eyebrow="DSG Audit Evidence"
      title="Audit Evidence Flow"
      description="The new audit page is user-benefit focused: see the timeline, check determinism, open the proof package, and know which page to navigate to next"
      status={loading ? 'Loading' : `${items.length} events`}
      statusTone={nondeterministicCount > 0 || freezeCount > 0 ? 'red' : 'green'}
      actions={[{ href: '/dashboard/executions', label: 'Open executions', tone: 'gold' }, { href: '/dashboard/verification', label: 'Verify proof', tone: 'slate' }]}
      steps={steps}
    >
      {error ? <Card variant="warning" className="mt-6 text-sm">{error}</Card> : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Ledger health" value={loading ? '…' : ledgerHealth} helper="deterministic sequences" tone={nondeterministicCount > 0 ? 'red' : 'green'} />
            <MetricTile label="Audit events" value={loading ? '…' : String(items.length)} helper="latest audit feed" tone="blue" />
            <MetricTile label="Open audits" value={loading ? '…' : String(nondeterministicCount)} helper="non-deterministic findings" tone={nondeterministicCount > 0 ? 'red' : 'green'} />
            <MetricTile label="Freeze advised" value={loading ? '…' : String(freezeCount)} helper="gate action freeze" tone={freezeCount > 0 ? 'red' : 'gold'} />
          </div>

          <WorkflowPanel eyebrow="Timeline" title="Audit events">
            <div className="space-y-2">
              {loading ? <EmptyState title="Loading audit" body="Loading audit timeline from backend" /> : null}
              {!loading && items.length === 0 ? <EmptyState title="No audit events found" body="No audit evidence to review yet. Run Auto-Setup or an execution first." href="/dashboard/executions" action="Open executions" /> : null}
              {items.map((item) => {
                const selected = selectedItem?.sequence === item.sequence;
                return (
                  <button key={`${item.sequence}-${item.region_id}-${item.created_at}`} type="button" onClick={() => setSelectedSequence(item.sequence)} className="w-full text-left">
                    <div className={['border p-3 transition', selected ? 'border-amber-300/40 bg-amber-300/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25'].join(' ')}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-mono text-sm text-white">SEQ {item.sequence}</span>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.gate_result}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{formatDate(item.created_at)}</p>
                      <p className="mt-2 break-all font-mono text-xs text-sky-100">{shortenHash(item.state_hash)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </WorkflowPanel>
        </div>

        <div className="space-y-6">
          <WorkflowPanel eyebrow="Selected proof" title={selectedItem ? `Sequence ${selectedItem.sequence}` : 'No audit selected'}>
            {selectedItem ? (
              <div className="space-y-3">
                <EvidenceRow label="Gate result" value={selectedItem.gate_result} tone={resultTone(selectedItem.gate_result)} />
                <EvidenceRow label="Region" value={selectedItem.region_id || '-'} />
                <EvidenceRow label="Epoch" value={selectedItem.epoch || '-'} tone="blue" />
                <EvidenceRow label="Entropy" value={typeof selectedItem.entropy === 'number' ? selectedItem.entropy.toFixed(5) : '-'} tone="gold" />
                <EvidenceRow label="State hash" value={shortenHash(selectedItem.state_hash)} />
                <EvidenceRow label="Proof" value={shortenHash(selectedItem.z3_proof_hash || selectedItem.signature)} />
              </div>
            ) : (
              <EmptyState title="No audit selected" body="Select an audit event to view the proof package" />
            )}
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Determinism" title="Runtime proof result">
            <div className="space-y-3">
              <EvidenceRow label="Deterministic" value={selectedDeterminism?.data?.deterministic ? 'YES' : selectedDeterminism ? 'NO' : '-'} tone={selectedDeterminism?.data?.deterministic ? 'green' : selectedDeterminism ? 'red' : 'slate'} />
              <EvidenceRow label="Gate action" value={selectedDeterminism?.data?.gate_action || '-'} tone={resultTone(selectedDeterminism?.data?.gate_action)} />
              <EvidenceRow label="Region count" value={String(selectedDeterminism?.data?.region_count ?? '-')} />
              <EvidenceRow label="Max entropy" value={String(selectedDeterminism?.data?.max_entropy ?? '-')} tone="gold" />
            </div>
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Evidence package" title="Export-ready JSON">
            <pre className="max-h-[360px] overflow-auto border border-white/10 bg-black/40 p-4 text-xs leading-6 text-slate-200">{evidenceJson}</pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="/api/audit/export?format=json&limit=1000"
                download
                className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
              >
                ⬇ Download JSON
              </a>
              <a
                href="/api/audit/export?format=csv&limit=1000"
                download
                className="rounded-xl bg-blue-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-blue-300"
              >
                ⬇ Download CSV
              </a>
              <Link href="/dashboard/verification" className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">Verify proof</Link>
              <Link href="/dashboard/live-control" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">Back to live control</Link>
            </div>
            <p className="mt-3 text-xs text-slate-500">JSON และ CSV มี hash, signature และ evidence ครบ — ส่งให้ compliance team ได้เลย</p>
          </WorkflowPanel>
        </div>
      </section>
    </RuntimeWorkflowPage>
  );
}
