'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { EmptyState, EvidenceRow, MetricTile, RuntimeWorkflowPage, WorkflowPanel } from '../_components/runtime-workflow';

type Execution = {
  id: string;
  agent_id: string;
  decision: string;
  latency_ms: number;
  policy_version: string | null;
  reason: string | null;
  created_at: string;
};

type CoreLedgerItem = {
  id?: number;
  agent_id: string;
  action: string;
  decision: string;
  stability_score: number;
  reason: string;
  evaluated_at: string;
};

type CoreMetrics = {
  total_executions: number;
  allow_count: number;
  stabilize_count: number;
  block_count: number;
};

type ExecutionsResponse = {
  ok?: boolean;
  executions?: Execution[];
  core?: {
    ledger_items?: CoreLedgerItem[];
    metrics?: CoreMetrics | null;
    error?: string | null;
  };
  error?: string;
};

const steps = [
  { label: '1', title: 'Review executions', body: 'ดูรายการ action ที่ agent ส่งเข้า runtime gate ล่าสุด' },
  { label: '2', title: 'Filter decision', body: 'แยก ALLOW, STABILIZE, BLOCK เพื่อเห็นความเสี่ยงเร็ว' },
  { label: '3', title: 'Inspect evidence', body: 'เปิด trace, latency, policy version, reason และ ledger preview' },
  { label: '4', title: 'Take next step', body: 'ส่งต่อไป audit หรือ policy workflow เมื่อต้องแก้ rule/threshold' },
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function decisionTone(decision?: string): 'green' | 'blue' | 'red' | 'slate' {
  const normalized = String(decision || '').toUpperCase();
  if (normalized === 'ALLOW') return 'green';
  if (normalized === 'STABILIZE') return 'blue';
  if (normalized === 'BLOCK' || normalized === 'FREEZE') return 'red';
  return 'slate';
}

function countDecision(items: Execution[], decision: string) {
  return items.filter((item) => String(item.decision).toUpperCase() === decision).length;
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [coreLedger, setCoreLedger] = useState<CoreLedgerItem[]>([]);
  const [coreMetrics, setCoreMetrics] = useState<CoreMetrics | null>(null);
  const [coreError, setCoreError] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');
      setCoreError('');
      try {
        const res = await fetch('/api/executions?limit=20', { cache: 'no-store' });
        const json = (await res.json().catch(() => ({}))) as ExecutionsResponse;
        if (!res.ok) throw new Error(json.error || 'Failed to load executions');
        if (!alive) return;

        const nextExecutions = json.executions || [];
        setExecutions(nextExecutions);
        setCoreLedger(json.core?.ledger_items || []);
        setCoreMetrics(json.core?.metrics || null);
        setSelectedId((current) => current || nextExecutions[0]?.id || null);
        if (json.core?.error) setCoreError(json.core.error);
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load executions');
      } finally {
        if (alive) setLoading(false);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, []);

  const filteredExecutions = useMemo(() => {
    if (filter === 'ALL') return executions;
    return executions.filter((item) => String(item.decision).toUpperCase() === filter);
  }, [executions, filter]);

  const selectedExecution = useMemo(
    () => executions.find((item) => item.id === selectedId) || filteredExecutions[0] || executions[0] || null,
    [executions, filteredExecutions, selectedId],
  );

  const relatedLedger = useMemo(() => {
    if (!selectedExecution) return null;
    return coreLedger.find((item) => item.agent_id === selectedExecution.agent_id) || coreLedger[0] || null;
  }, [coreLedger, selectedExecution]);

  const payloadJson = useMemo(() => {
    return JSON.stringify(
      {
        trace_id: selectedExecution?.id || null,
        agent_id: selectedExecution?.agent_id || null,
        decision: selectedExecution?.decision || null,
        latency_ms: selectedExecution?.latency_ms || 0,
        policy_version: selectedExecution?.policy_version || null,
        reason: selectedExecution?.reason || null,
        created_at: selectedExecution?.created_at || null,
        core_metrics: coreMetrics,
        ledger_preview: relatedLedger,
      },
      null,
      2,
    );
  }, [selectedExecution, coreMetrics, relatedLedger]);

  return (
    <RuntimeWorkflowPage
      active="/dashboard/executions"
      eyebrow="DSG Execution Evidence"
      title="Execution Review Flow"
      description="หน้ารีวิว action ที่ผ่าน runtime gate: เห็น decision, latency, policy version และหลักฐานที่ต้องใช้ตัดสินใจต่อ"
      status={loading ? 'Loading' : `${executions.length} traces`}
      statusTone="blue"
      actions={[{ href: '/dashboard/audit', label: 'Open audit', tone: 'gold' }, { href: '/dashboard/policies', label: 'Tune policy', tone: 'slate' }]}
      steps={steps}
    >
      {error ? <div className="mt-6 border border-rose-300/25 bg-rose-300/10 p-4 text-sm text-rose-100">{error}</div> : null}
      {coreError ? <div className="mt-6 border border-sky-300/25 bg-sky-300/10 p-4 text-sm text-sky-100">Core ledger unavailable; showing database execution view.</div> : null}

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Total" value={String(coreMetrics?.total_executions ?? executions.length)} helper="executions loaded" tone="blue" />
            <MetricTile label="Allow" value={String(coreMetrics?.allow_count ?? countDecision(executions, 'ALLOW'))} helper="passed actions" tone="green" />
            <MetricTile label="Stabilize" value={String(coreMetrics?.stabilize_count ?? countDecision(executions, 'STABILIZE'))} helper="needs guardrails" tone="gold" />
            <MetricTile label="Block" value={String(coreMetrics?.block_count ?? countDecision(executions, 'BLOCK'))} helper="requires audit" tone="red" />
          </div>

          <WorkflowPanel eyebrow="Decision filter" title="เลือกดูตามผลลัพธ์">
            <div className="flex flex-wrap gap-2">
              {['ALL', 'ALLOW', 'STABILIZE', 'BLOCK'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={[
                    'rounded-xl border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]',
                    filter === item ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/[0.03] text-slate-400',
                  ].join(' ')}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {loading ? <EmptyState title="Loading executions" body="กำลังโหลด execution จาก backend" /> : null}
              {!loading && filteredExecutions.length === 0 ? <EmptyState title="No matching executions" body="ไม่มี execution ใน filter นี้ ให้เปลี่ยน filter หรือรัน agent เพิ่ม" href="/dashboard/live-control" action="Open live control" /> : null}
              {filteredExecutions.slice(0, 8).map((execution) => (
                <button key={execution.id} type="button" onClick={() => setSelectedId(execution.id)} className="w-full text-left">
                  <EvidenceRow label={execution.decision} value={`${execution.id.slice(0, 8)} · ${execution.latency_ms}ms`} tone={decisionTone(execution.decision)} />
                </button>
              ))}
            </div>
          </WorkflowPanel>
        </div>

        <div className="space-y-6">
          <WorkflowPanel eyebrow="Selected trace" title={selectedExecution ? selectedExecution.id : 'No trace selected'}>
            {selectedExecution ? (
              <div className="space-y-3">
                <EvidenceRow label="Decision" value={selectedExecution.decision} tone={decisionTone(selectedExecution.decision)} />
                <EvidenceRow label="Agent" value={selectedExecution.agent_id} />
                <EvidenceRow label="Latency" value={`${selectedExecution.latency_ms} ms`} tone="blue" />
                <EvidenceRow label="Policy" value={selectedExecution.policy_version || 'v1'} tone="gold" />
                <EvidenceRow label="Created" value={formatDate(selectedExecution.created_at)} />
                <EvidenceRow label="Reason" value={selectedExecution.reason || '-'} />
              </div>
            ) : (
              <EmptyState title="No trace selected" body="เลือก execution ด้านซ้ายเพื่อดูหลักฐาน" />
            )}
          </WorkflowPanel>

          <WorkflowPanel eyebrow="Evidence JSON" title="Trace package">
            <pre className="max-h-[420px] overflow-auto border border-white/10 bg-black/40 p-4 text-xs leading-6 text-slate-200">{payloadJson}</pre>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/dashboard/audit" className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">Open audit trail</Link>
              <Link href="/dashboard/policies" className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100">Adjust policy</Link>
            </div>
          </WorkflowPanel>
        </div>
      </section>
    </RuntimeWorkflowPage>
  );
}
