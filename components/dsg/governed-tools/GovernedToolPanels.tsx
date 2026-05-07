'use client';

import { AlertTriangle, CheckCircle2, Database, ExternalLink, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import type { DsgGovernedToolExecutionResult, DsgGovernedToolPreparedRequest, StoredRecord } from '@/lib/dsg/tools/governed-tools';
import { cn } from '@/lib/utils';

const confirmationReasons = new Set([
  'BROWSER_CONFIRMATION_REQUIRED',
  'SEARCH_CONFIRMATION_REQUIRED',
  'API_CONFIRMATION_REQUIRED',
  'GOOGLE_WORKSPACE_CONFIRMATION_REQUIRED',
]);

const allowlistReasons = new Set([
  'BROWSER_HOST_NOT_ALLOWLISTED',
  'SEARCH_ENDPOINT_HOST_NOT_ALLOWLISTED',
  'API_HOST_NOT_ALLOWLISTED',
  'GOOGLE_WORKSPACE_ENDPOINT_HOST_NOT_ALLOWLISTED',
]);

type GovernedToolPanelProps = {
  prepared?: DsgGovernedToolPreparedRequest | null;
  result?: DsgGovernedToolExecutionResult | null;
  persistedRecords?: StoredRecord[];
  busy?: boolean;
  onApprove?: () => void;
};

function statusTone(status?: string) {
  if (status === 'blocked' || status === 'blocked_before_execution') return 'border-[#b4232b]/45 bg-[#b4232b]/10 text-[#ffb4b8]';
  if (status === 'review') return 'border-[#d66a2f]/45 bg-[#d66a2f]/10 text-[#ffd1a8]';
  if (status === 'ready' || status === 'runtime_evidence') return 'border-[#d6a63a]/45 bg-[#d6a63a]/10 text-[#f5d27a]';
  return 'border-[#c8c8c8]/15 bg-[#111113] text-[#c8c8c8]';
}

function pretty(value: unknown) {
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function getOutputRecord(output: unknown): StoredRecord | null {
  if (!output || typeof output !== 'object') return null;
  const record = (output as { record?: unknown }).record;
  if (!record || typeof record !== 'object') return null;
  return record as StoredRecord;
}

function getOutputRecords(output: unknown): StoredRecord[] {
  if (!output || typeof output !== 'object') return [];
  const value = (output as { records?: unknown }).records;
  return Array.isArray(value) ? (value as StoredRecord[]) : [];
}

function externalUrl(output: unknown) {
  if (!output || typeof output !== 'object') return null;
  const value = (output as { url?: unknown; endpoint?: unknown }).url ?? (output as { endpoint?: unknown }).endpoint;
  return typeof value === 'string' && value.startsWith('https://') ? value : null;
}

function outputField(output: unknown, key: string) {
  if (!output || typeof output !== 'object') return undefined;
  return (output as Record<string, unknown>)[key];
}

function InfoRow({ label, value }: { label: string; value?: unknown }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="rounded-xl border border-[#c8c8c8]/10 bg-[#0c0c0d] p-2">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8d8d8d]">{label}</p>
      <p className="mt-1 break-words font-mono text-[11px] text-[#d9d9d9]">{String(value)}</p>
    </div>
  );
}

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <details className="rounded-xl border border-[#c8c8c8]/10 bg-[#0c0c0d] p-3" open>
      <summary className="cursor-pointer text-xs font-black text-[#f2f2f2]">{label}</summary>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/35 p-2 text-[11px] leading-5 text-[#c8c8c8]">{pretty(value)}</pre>
    </details>
  );
}

function BlockedReasonsList({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;
  return (
    <div className="rounded-xl border border-[#b4232b]/35 bg-[#b4232b]/10 p-3">
      <div className="flex items-center gap-2 text-[#ffb4b8]">
        <ShieldAlert className="h-4 w-4" />
        <p className="text-xs font-black uppercase tracking-[0.18em]">Blocked / review reasons</p>
      </div>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-[#ffd7d9]">
        {reasons.map((reason) => <li key={reason}>• {reason}</li>)}
      </ul>
    </div>
  );
}

function DecisionFramePanel({ prepared }: { prepared: DsgGovernedToolPreparedRequest }) {
  const frame = prepared.decisionFrame;
  return (
    <section className="space-y-2 rounded-xl border border-[#c8c8c8]/15 bg-[#111113] p-3">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#d6a63a]">Decision frame</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoRow label="Risk status" value={(frame.risk as { status?: string; state?: string }).status ?? frame.risk.state ?? 'unknown'} />
        <InfoRow label="Truth ok" value={String(frame.truthBoundary.ok)} />
      </div>
      {Array.isArray(frame.risk.reasons) && frame.risk.reasons.length ? <BlockedReasonsList reasons={frame.risk.reasons} /> : null}
      <div className="grid gap-2">
        <InfoRow label="User benefit" value={frame.benefit.userBenefit} />
        <InfoRow label="Easier" value={String(frame.benefit.easier)} />
        <InfoRow label="Tangible output" value={frame.benefit.tangibleOutput} />
        <InfoRow label="Next action" value={frame.benefit.nextAction} />
      </div>
      {frame.truthBoundary.blockedReasons?.length ? <BlockedReasonsList reasons={frame.truthBoundary.blockedReasons} /> : null}
    </section>
  );
}

function ApprovalPanel({ prepared, busy, onApprove }: { prepared: DsgGovernedToolPreparedRequest; busy?: boolean; onApprove?: () => void }) {
  const needsConfirmation = prepared.blockedReasons.some((reason) => confirmationReasons.has(reason));
  const needsAllowlist = prepared.blockedReasons.some((reason) => allowlistReasons.has(reason));
  if (!needsConfirmation && !needsAllowlist) return null;

  return (
    <section className="space-y-3 rounded-xl border border-[#d66a2f]/45 bg-[#d66a2f]/10 p-3 text-xs leading-5 text-[#ffd1a8]">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-black">External action requires explicit control</p>
          <p className="text-[#d9d9d9]">Review the tool, action, goal, and args before approving. Approval is sent as <span className="font-mono">args.approved=true</span>.</p>
        </div>
      </div>
      {needsAllowlist ? (
        <p className="rounded-lg border border-[#b4232b]/30 bg-[#b4232b]/10 p-2 text-[#ffb4b8]">Host is not allowlisted. Add the exact host to <span className="font-mono">allowedHosts</span>, then retry; do not bypass this for unknown endpoints.</p>
      ) : null}
      {needsConfirmation && onApprove ? (
        <button type="button" onClick={onApprove} disabled={busy} className="rounded-xl border border-[#d6a63a]/45 bg-[#d6a63a]/15 px-3 py-2 font-black text-[#f5d27a] disabled:cursor-not-allowed disabled:opacity-60">
          {busy ? 'Approving…' : 'Approve and execute governed tool'}
        </button>
      ) : null}
    </section>
  );
}

function ToolOutputViewer({ result }: { result: DsgGovernedToolExecutionResult }) {
  const output = result.output;
  const url = externalUrl(output);
  if (!output) return null;
  const tool = result.prepared.tool;
  const primaryFields = tool === 'browser'
    ? ['url', 'status', 'contentType', 'title']
    : tool === 'search'
      ? ['endpoint', 'status']
      : tool === 'api'
        ? ['url', 'method', 'status']
        : tool === 'google_workspace'
          ? ['operation', 'status']
          : tool === 'shell'
            ? ['stdout', 'stderr']
            : tool === 'file'
              ? ['path', 'contentHash']
              : ['operation', 'status'];
  return (
    <section className="space-y-2 rounded-xl border border-[#d6a63a]/25 bg-[#d6a63a]/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5d27a]">Execution output</p>
        {url ? <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#f5d27a] underline">Open URL<ExternalLink className="h-3 w-3" /></a> : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <InfoRow label="Verification" value={result.outputVerification} />
        <InfoRow label="Execution phase" value={result.executionDecisionFrame?.phase} />
        {primaryFields.map((field) => <InfoRow key={field} label={field} value={outputField(output, field)} />)}
      </div>
      {tool === 'browser' ? <JsonBlock label="Scraped text" value={outputField(output, 'text') ?? ''} /> : null}
      {tool === 'search' ? <JsonBlock label="Search results" value={outputField(output, 'results') ?? []} /> : null}
      {(tool === 'api' || tool === 'google_workspace') ? <JsonBlock label="Response body" value={outputField(output, 'body') ?? {}} /> : null}
      {(tool === 'shell' || tool === 'file') ? <JsonBlock label={`${tool} details`} value={output} /> : null}
      {!['browser', 'search', 'api', 'google_workspace', 'shell', 'file'].includes(tool) ? <JsonBlock label={`${tool} output`} value={output} /> : null}
    </section>
  );
}

function PersistedRecordsView({ records }: { records: StoredRecord[] }) {
  if (!records.length) return null;
  return (
    <section className="space-y-2 rounded-xl border border-[#c8c8c8]/15 bg-[#111113] p-3">
      <div className="flex items-center gap-2 text-[#d9d9d9]">
        <Database className="h-4 w-4 text-[#d6a63a]" />
        <p className="text-xs font-black uppercase tracking-[0.18em]">Persisted records</p>
      </div>
      <div className="space-y-2">
        {records.map((record) => (
          <details key={`${record.id}:${record.revision}:${record.eventHash}`} className="rounded-xl border border-[#c8c8c8]/10 bg-[#0c0c0d] p-3">
            <summary className="cursor-pointer text-xs font-black text-[#f2f2f2]">{record.id} · {record.status}</summary>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <InfoRow label="Tool" value={record.tool} />
              <InfoRow label="Action" value={record.action} />
              <InfoRow label="Goal" value={record.goal} />
              <InfoRow label="Created" value={record.createdAt} />
              <InfoRow label="Updated" value={record.updatedAt} />
              <InfoRow label="Request hash" value={record.requestHash} />
              <InfoRow label="Evidence hash" value={record.evidenceHash} />
            </div>
            <JsonBlock label="Record args" value={record.args} />
          </details>
        ))}
      </div>
    </section>
  );
}

export function collectPersistedRecords(result?: DsgGovernedToolExecutionResult | null): StoredRecord[] {
  if (!result) return [];
  const one = getOutputRecord(result.output);
  return [...(one ? [one] : []), ...getOutputRecords(result.output)];
}

export function GovernedToolPanel({ prepared, result, persistedRecords = [], busy, onApprove }: GovernedToolPanelProps) {
  const activePrepared = result?.prepared ?? prepared;
  const records = [...persistedRecords, ...collectPersistedRecords(result)];

  if (!activePrepared && !result) {
    return (
      <section className="rounded-xl border border-[#c8c8c8]/15 bg-[#0c0c0d] p-3 text-xs leading-5 text-[#8d8d8d]">
        No governed tool request prepared yet. Prepare a request to see status, audit truth, decision frame, approval controls, output, and persisted records.
      </section>
    );
  }

  if (!activePrepared) return null;

  return (
    <div className="space-y-3">
      <section className={cn('rounded-xl border p-3', statusTone(activePrepared.status))}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em]">Governed tool request</p>
            <h3 className="mt-1 text-lg font-black text-[#f2f2f2]">{activePrepared.tool} · {activePrepared.action}</h3>
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-black">{activePrepared.status}</span>
        </div>
        <div className="mt-3 grid gap-2">
          <InfoRow label="Goal" value={activePrepared.goal} />
          <InfoRow label="Audit id" value={activePrepared.audit.id} />
          <InfoRow label="Audit truth" value={activePrepared.audit.truth} />
          <InfoRow label="Request hash" value={activePrepared.audit.requestHash} />
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-[#d9d9d9]">
          {activePrepared.ok ? <CheckCircle2 className="h-4 w-4 text-[#d6a63a]" /> : <XCircle className="h-4 w-4 text-[#ffb4b8]" />}
          <span>{activePrepared.userOutcome}</span>
        </div>
      </section>

      <BlockedReasonsList reasons={activePrepared.blockedReasons} />
      <ApprovalPanel prepared={activePrepared} busy={busy} onApprove={onApprove} />
      <JsonBlock label="Prepared args" value={activePrepared.args} />
      <DecisionFramePanel prepared={activePrepared} />
      {result ? <ToolOutputViewer result={result} /> : null}
      <PersistedRecordsView records={records} />
      <section className={cn('rounded-xl border p-3 text-xs leading-5', statusTone(result?.outputVerification))}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          <p><span className="font-black">Output verification:</span> {result?.outputVerification ?? 'not executed yet'}</p>
        </div>
      </section>
    </div>
  );
}
