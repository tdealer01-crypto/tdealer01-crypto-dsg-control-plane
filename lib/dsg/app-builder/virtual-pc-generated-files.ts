import type { AppBuilderJob } from './model';
import type { AppBuilderRuntimeHandoff } from './runtime-handoff';

type GeneratedFile = {
  path: string;
  content: string;
  evidenceKind: 'frontend' | 'backend_api' | 'database_migration' | 'documentation';
};

function safeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'app';
}

function timestampForMigration(now = new Date()) {
  return now.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
}

export function isVirtualPcAppBuilderJob(job: AppBuilderJob) {
  const text = JSON.stringify({ goal: job.goal, prd: job.prd, plan: job.proposedPlan }).toLowerCase();
  return /virtual pc|pc เสมือน|คอมเสมือน|คอมพิวเตอร์เสมือน|windows|วินโด้|วินโดว์|remote mouse|รีโมตเมาส์|รีโหมดเม้า|mouse api|monitor|มอนิเตอร์|จอ/.test(text);
}

function frontend(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff) {
  const appId = JSON.stringify(job.id);
  const planHash = JSON.stringify(handoff.planHash);
  const approvalHash = JSON.stringify(handoff.approvalHash);
  return `'use client';

import React, { useState } from 'react';

type MouseDecision = {
  ok: boolean;
  actionId: string;
  decision: 'allow' | 'review' | 'block';
  status: 'accepted' | 'review_required' | 'blocked';
  cursor: { x: number; y: number };
  invariantResults: Array<{ name: string; status: 'pass' | 'review' | 'fail'; detail: string }>;
  requestHash: string;
  auditHash: string;
  evidence: string[];
  truthBoundary: string;
};

const APP_ID = ${appId};
const PLAN_HASH = ${planHash};
const APPROVAL_HASH = ${approvalHash};
const SCREEN_WIDTH = 1000;
const SCREEN_HEIGHT = 640;

export default function VirtualPcAgentAppPage() {
  const [cursor, setCursor] = useState({ x: 500, y: 320 });
  const [status, setStatus] = useState('Ready for governed remote mouse actions');
  const [busy, setBusy] = useState(false);
  const [lastDecision, setLastDecision] = useState<MouseDecision | null>(null);
  const [agentToken, setAgentToken] = useState('agent-runtime-demo');

  async function sendMouseAction(action: 'move' | 'click' | 'double_click', x: number, y: number) {
    setBusy(true);
    setStatus('Sending governed mouse action...');
    try {
      const response = await fetch(\`/api/generated-apps/\${APP_ID}/remote-mouse\`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, x: Math.round(x), y: Math.round(y), agentToken, target: 'virtual-pc-monitor' }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message || 'REMOTE_MOUSE_REQUEST_FAILED');
      const data = json.data as MouseDecision;
      setLastDecision(data);
      if (data.decision !== 'block') setCursor(data.cursor);
      setStatus(\`\${data.status}: \${data.decision.toUpperCase()} · \${data.actionId}\`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'REMOTE_MOUSE_REQUEST_FAILED');
    } finally {
      setBusy(false);
    }
  }

  function handleMonitorClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SCREEN_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * SCREEN_HEIGHT;
    void sendMouseAction('click', x, y);
  }

  function handleMonitorMove(event: React.MouseEvent<HTMLDivElement>) {
    if (!event.shiftKey) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * SCREEN_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * SCREEN_HEIGHT;
    void sendMouseAction('move', x, y);
  }

  return (
    <main className="min-h-screen bg-[#071326] px-4 py-6 text-[#F5F7FA] md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="rounded-[2rem] border border-[#C8A24D] bg-[#0C2340] p-5 shadow-[0_0_48px_rgba(200,162,77,0.24)]">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#E0B95B]">DSG AI-Generated Governed App</p>
          <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">Virtual PC Agent Console</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#D7D9DE]">Windows-style virtual monitor, remote mouse API, DSG invariant gate, and audit evidence for every pointer action. This is a governed control contract, not a verified Windows VM provider.</p>
          <div className="mt-5 grid gap-3 text-xs font-mono md:grid-cols-2">
            <div className="truncate rounded-2xl border border-[#C8A24D]/40 bg-[#071326] p-4">planHash: <span className="text-[#E0B95B]">{PLAN_HASH}</span></div>
            <div className="truncate rounded-2xl border border-[#C8A24D]/40 bg-[#071326] p-4">approvalHash: <span className="text-[#E0B95B]">{APPROVAL_HASH}</span></div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="rounded-[2rem] border border-[#C8A24D] bg-[#F6F0E1] p-3 shadow-[0_0_40px_rgba(25,115,180,0.28)]">
            <div className="rounded-[1.5rem] border border-[#C8A24D]/70 bg-[#071326] p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Monitor</p>
                  <h2 className="text-xl font-black">Windows-ready Virtual Screen</h2>
                </div>
                <div className="rounded-full border border-[#C8A24D]/40 px-3 py-1 text-xs font-black text-[#E0B95B]">{busy ? 'RUNNING' : 'READY'}</div>
              </div>

              <div onClick={handleMonitorClick} onMouseMove={handleMonitorMove} className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#C8A24D]/50 bg-gradient-to-br from-[#0A1D3A] via-[#0C2340] to-[#071326] shadow-inner">
                <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(224,185,91,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(224,185,91,.10) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                <div className="absolute left-4 top-4 rounded-xl border border-[#C8A24D]/40 bg-[#071326]/85 px-3 py-2 text-xs text-[#D7D9DE]">
                  <div>DSG Virtual PC Shell</div><div>Windows runtime profile: provider pending</div><div>Network: governed gateway contract</div><div>Mouse API: /remote-mouse</div><div>Invariant gate: enabled</div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-[#C8A24D]/30 bg-[#071326]/90 px-3 py-2 text-xs"><span className="font-black text-[#E0B95B]">Start</span><span className="text-[#D7D9DE]">Network · Mouse API · DSG Gate</span><span className="text-[#E0B95B]">Ready</span></div>
                <div className="absolute h-5 w-5 -translate-x-1 -translate-y-1 rounded-full border-2 border-[#E0B95B] bg-[#D9363E] shadow-[0_0_16px_rgba(224,185,91,0.9)]" style={{ left: String((cursor.x / SCREEN_WIDTH) * 100) + '%', top: String((cursor.y / SCREEN_HEIGHT) * 100) + '%' }} />
              </div>
              <p className="mt-3 text-xs leading-5 text-[#D7D9DE]">Tap/click inside the monitor to send a governed click. Hold Shift while moving the pointer on desktop to send governed move events.</p>
            </div>
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-[#C8A24D] bg-[#0C2340] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Remote Mouse API</p>
              <h2 className="mt-2 text-xl font-black">Agent Control Contract</h2>
              <label className="mt-4 block text-xs font-black uppercase text-[#D7D9DE]">Agent token label</label>
              <input value={agentToken} onChange={(event) => setAgentToken(event.target.value)} className="mt-2 w-full rounded-xl border border-[#C8A24D]/50 bg-[#071326] px-3 py-2 text-sm text-white outline-none" />
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button onClick={() => sendMouseAction('move', 500, 320)} className="rounded-xl border border-[#C8A24D] bg-[#071326] px-3 py-2 text-xs font-black text-[#E0B95B]">Center</button>
                <button onClick={() => sendMouseAction('click', cursor.x, cursor.y)} className="rounded-xl border border-[#C8A24D] bg-[#E0B95B] px-3 py-2 text-xs font-black text-[#071326]">Click</button>
                <button onClick={() => sendMouseAction('double_click', cursor.x, cursor.y)} className="rounded-xl border border-[#D9363E] bg-[#D9363E]/20 px-3 py-2 text-xs font-black text-[#ffb4b8]">Double</button>
              </div>
            </section>

            <section className="rounded-3xl border border-[#C8A24D] bg-[#0C2340] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Governance Evidence</p>
              <h2 className="mt-2 text-xl font-black">Invariant Gate Result</h2>
              <p className="mt-2 text-sm text-[#D7D9DE]">{status}</p>
              {lastDecision ? <div className="mt-4 rounded-xl border border-[#C8A24D]/30 bg-[#071326] p-3 text-xs leading-5 text-[#D7D9DE]"><p>decision: <span className="font-black text-[#E0B95B]">{lastDecision.decision}</span></p><p>status: {lastDecision.status}</p><p>cursor: {lastDecision.cursor.x}, {lastDecision.cursor.y}</p><p className="break-all">requestHash: {lastDecision.requestHash}</p><p className="break-all">auditHash: {lastDecision.auditHash}</p><p className="mt-2 text-[#ffb4b8]">{lastDecision.truthBoundary}</p></div> : <div className="mt-4 rounded-xl border border-dashed border-[#C8A24D]/40 p-4 text-sm text-[#D7D9DE]">No mouse action yet. Click the monitor to create live endpoint evidence.</div>}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
`;
}

function api(job: AppBuilderJob) {
  const appId = JSON.stringify(job.id);
  return `import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';

const APP_ID = ${appId};
const SCREEN_WIDTH = 1000;
const SCREEN_HEIGHT = 640;

type MouseAction = 'move' | 'click' | 'double_click';
type GateStatus = 'pass' | 'review' | 'fail';
type InvariantResult = { name: string; status: GateStatus; detail: string };

function sha256(value: string) { return createHash('sha256').update(value).digest('hex'); }
function isMouseAction(value: unknown): value is MouseAction { return value === 'move' || value === 'click' || value === 'double_click'; }
function invariant(name: string, status: GateStatus, detail: string): InvariantResult { return { name, status, detail }; }

function evaluate(input: { action: MouseAction; x: number; y: number; agentToken: string; target: string }) {
  const results: InvariantResult[] = [];
  results.push(input.x >= 0 && input.x <= SCREEN_WIDTH && input.y >= 0 && input.y <= SCREEN_HEIGHT ? invariant('coordinate_bounds', 'pass', 'Pointer coordinates are inside the virtual monitor boundary.') : invariant('coordinate_bounds', 'fail', 'Pointer coordinates are outside the virtual monitor boundary.'));
  results.push(input.target === 'virtual-pc-monitor' ? invariant('target_zone', 'pass', 'The requested target is the governed virtual PC monitor surface.') : invariant('target_zone', 'fail', 'The target is not approved for remote mouse control.'));
  results.push(input.agentToken.trim().length >= 6 ? invariant('agent_identity_label', 'pass', 'A non-empty agent identity label was provided for audit correlation.') : invariant('agent_identity_label', 'review', 'Agent identity label is too short; review recommended before real provider execution.'));
  results.push(input.action === 'double_click' ? invariant('high_impact_pointer_action', 'review', 'Double-click may trigger application actions and should be reviewed for real VM execution.') : invariant('high_impact_pointer_action', 'pass', 'Pointer action is low impact for this virtual contract demo.'));
  results.push(invariant('provider_boundary', 'review', 'This endpoint records governed mouse intent only. A real Windows VM provider has not been verified in this request.'));
  const hasFail = results.some((item) => item.status === 'fail');
  const hasReview = results.some((item) => item.status === 'review');
  return { results, decision: hasFail ? 'block' : hasReview ? 'review' : 'allow', status: hasFail ? 'blocked' : hasReview ? 'review_required' : 'accepted' };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : 'REMOTE_MOUSE_REQUEST_FAILED';
  return NextResponse.json({ ok: false, error: { code: message, message } }, { status: 400 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!isMouseAction(body?.action)) throw new Error('REMOTE_MOUSE_ACTION_INVALID');
    const x = Number(body.x); const y = Number(body.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('REMOTE_MOUSE_COORDINATES_REQUIRED');
    const input = { action: body.action, x: Math.round(x), y: Math.round(y), agentToken: typeof body.agentToken === 'string' ? body.agentToken : '', target: typeof body.target === 'string' ? body.target : '' };
    const actionId = \`mouse_\${randomUUID()}\`;
    const requestHash = sha256(JSON.stringify({ appId: APP_ID, actionId, input }));
    const gate = evaluate(input);
    const auditHash = sha256(JSON.stringify({ requestHash, gate, appId: APP_ID }));
    const cursor = gate.decision === 'block' ? { x: 500, y: 320 } : { x: input.x, y: input.y };
    return NextResponse.json({ ok: true, data: { ok: gate.decision !== 'block', appId: APP_ID, actionId, decision: gate.decision, status: gate.status, cursor, invariantResults: gate.results, requestHash, auditHash, evidence: ['requestHash', 'auditHash', 'invariantResults', 'cursor'], truthBoundary: 'This is a governed remote mouse API contract and audit proof for the generated app. It does not prove a real Windows VM provider is attached yet.' } });
  } catch (error) { return fail(error); }
}
`;
}

function migration(job: AppBuilderJob) {
  return `-- Generated by DSG App Builder Virtual PC renderer for job ${job.id}
create extension if not exists pgcrypto;
create table if not exists generated_virtual_pc_mouse_events (
  id uuid primary key default gen_random_uuid(),
  app_id text not null,
  action_id text not null,
  decision text not null,
  request_hash text,
  audit_hash text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists generated_virtual_pc_mouse_events_app_created_idx on generated_virtual_pc_mouse_events(app_id, created_at desc);
alter table generated_virtual_pc_mouse_events enable row level security;
`;
}

function runbook(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff) {
  return `# DSG Virtual PC Generated App Evidence

- App Builder Job: \`${job.id}\`
- Workspace: \`${job.workspaceId}\`
- Plan Hash: \`${handoff.planHash}\`
- Approval Hash: \`${handoff.approvalHash}\`
- Claim Status: \`IMPLEMENTED_UNVERIFIED\`

## Generated app

Virtual PC Agent Console with monitor UI, governed remote mouse endpoint, invariant gate, request hash, audit hash, and visible evidence panel.

## Truth boundary

This PR proves generated implementation files only. It does not prove a real Windows VM provider, production deployment, migration apply, or end-to-end runtime proof until those checks pass.
`;
}

export function buildVirtualPcGeneratedAppFiles(job: AppBuilderJob, handoff: AppBuilderRuntimeHandoff): GeneratedFile[] {
  const appSlug = safeSegment(job.id);
  const stamp = timestampForMigration();
  return [
    { path: `app/generated-apps/${appSlug}/page.tsx`, content: frontend(job, handoff), evidenceKind: 'frontend' },
    { path: `app/api/generated-apps/${appSlug}/remote-mouse/route.ts`, content: api(job), evidenceKind: 'backend_api' },
    { path: `supabase/migrations/${stamp}_create_virtual_pc_mouse_events_${appSlug.slice(0, 8)}.sql`, content: migration(job), evidenceKind: 'database_migration' },
    { path: `docs/dsg-generated-apps/${appSlug}.md`, content: runbook(job, handoff), evidenceKind: 'documentation' },
  ];
}
