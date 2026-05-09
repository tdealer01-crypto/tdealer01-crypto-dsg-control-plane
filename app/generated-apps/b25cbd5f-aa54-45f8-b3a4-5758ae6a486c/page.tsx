'use client';

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

const APP_ID = 'b25cbd5f-aa54-45f8-b3a4-5758ae6a486c';
const PLAN_HASH = '3a9c4fc27b62684ee7f8ac0503938269f55fbb0c98b285a36141545da57f7950';
const APPROVAL_HASH = '48d9c411898b906632215e4e28ac847cece2e6b3f6f6e3d85a54aa61349c0927';
const SCREEN_WIDTH = 1000;
const SCREEN_HEIGHT = 640;

const bootLines = [
  'DSG Virtual PC Shell',
  'Windows runtime profile: provider pending',
  'Network: connected through governed gateway contract',
  'Mouse API: /api/generated-apps/' + APP_ID + '/remote-mouse',
  'Invariant gate: enabled before every pointer action',
];

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
      const response = await fetch(`/api/generated-apps/${APP_ID}/remote-mouse`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, x: Math.round(x), y: Math.round(y), agentToken, target: 'virtual-pc-monitor' }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error?.message || 'REMOTE_MOUSE_REQUEST_FAILED');
      const data = json.data as MouseDecision;
      setLastDecision(data);
      if (data.decision !== 'block') setCursor(data.cursor);
      setStatus(`${data.status}: ${data.decision.toUpperCase()} · ${data.actionId}`);
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
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#E0B95B]">DSG Generated Governed App</p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">Virtual PC Agent Console</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[#D7D9DE]">
                A governed virtual PC workspace with a Windows-style monitor surface, remote mouse API contract, invariant checks before every pointer action, and audit evidence returned from the endpoint.
              </p>
            </div>
            <div className="grid gap-2 rounded-2xl border border-[#C8A24D]/40 bg-[#071326] p-3 text-xs font-mono text-[#D7D9DE]">
              <div className="truncate">planHash: <span className="text-[#E0B95B]">{PLAN_HASH}</span></div>
              <div className="truncate">approvalHash: <span className="text-[#E0B95B]">{APPROVAL_HASH}</span></div>
              <div>claim: <span className="text-[#D9363E]">IMPLEMENTED_UNVERIFIED</span></div>
            </div>
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

              <div
                onClick={handleMonitorClick}
                onMouseMove={handleMonitorMove}
                className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-[#C8A24D]/50 bg-gradient-to-br from-[#0A1D3A] via-[#0C2340] to-[#071326] shadow-inner"
              >
                <div className="absolute inset-0 opacity-35" style={{ backgroundImage: 'linear-gradient(rgba(224,185,91,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(224,185,91,.10) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
                <div className="absolute left-4 top-4 rounded-xl border border-[#C8A24D]/40 bg-[#071326]/85 px-3 py-2 text-xs text-[#D7D9DE]">
                  {bootLines.map((line) => <div key={line}>{line}</div>)}
                </div>
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-[#C8A24D]/30 bg-[#071326]/90 px-3 py-2 text-xs">
                  <span className="font-black text-[#E0B95B]">Start</span>
                  <span className="text-[#D7D9DE]">Network · Mouse API · DSG Gate</span>
                  <span className="text-[#E0B95B]">10:09</span>
                </div>
                <div className="absolute h-5 w-5 -translate-x-1 -translate-y-1 rounded-full border-2 border-[#E0B95B] bg-[#D9363E] shadow-[0_0_16px_rgba(224,185,91,0.9)]" style={{ left: `${(cursor.x / SCREEN_WIDTH) * 100}%`, top: `${(cursor.y / SCREEN_HEIGHT) * 100}%` }} />
              </div>

              <p className="mt-3 text-xs leading-5 text-[#D7D9DE]">
                Tap/click inside the monitor to send a governed click. Hold Shift while moving the pointer on desktop to send governed move events.
              </p>
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
              <div className="mt-4 rounded-xl border border-[#C8A24D]/30 bg-[#071326] p-3 text-xs leading-5 text-[#D7D9DE]">
                POST /api/generated-apps/{APP_ID}/remote-mouse<br />
                body: {'{ action, x, y, agentToken, target }'}
              </div>
            </section>

            <section className="rounded-3xl border border-[#C8A24D] bg-[#0C2340] p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E0B95B]">Governance Evidence</p>
              <h2 className="mt-2 text-xl font-black">Invariant Gate Result</h2>
              <p className="mt-2 text-sm text-[#D7D9DE]">{status}</p>
              {lastDecision ? (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="rounded-xl border border-[#C8A24D]/30 bg-[#071326] p-3">
                    <p>decision: <span className="font-black text-[#E0B95B]">{lastDecision.decision}</span></p>
                    <p>status: {lastDecision.status}</p>
                    <p>cursor: {lastDecision.cursor.x}, {lastDecision.cursor.y}</p>
                    <p className="break-all">requestHash: {lastDecision.requestHash}</p>
                    <p className="break-all">auditHash: {lastDecision.auditHash}</p>
                  </div>
                  <div className="space-y-2">
                    {lastDecision.invariantResults.map((item) => (
                      <div key={item.name} className="rounded-xl border border-[#C8A24D]/20 bg-[#071326] p-3">
                        <p className="font-black text-[#E0B95B]">{item.name}: {item.status}</p>
                        <p className="mt-1 text-[#D7D9DE]">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                  <p className="rounded-xl border border-[#D9363E]/40 bg-[#D9363E]/10 p-3 text-[#ffb4b8]">{lastDecision.truthBoundary}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#C8A24D]/40 p-4 text-sm text-[#D7D9DE]">No mouse action yet. Click the monitor to create live endpoint evidence.</div>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
