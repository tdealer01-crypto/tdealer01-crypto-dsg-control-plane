#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

if [ -d "$ROOT/app" ]; then
  mkdir -p "$ROOT/app/dsg-architecture"
  cat > "$ROOT/app/dsg-architecture/page.tsx" <<'TSX'
'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Decision = 'ALLOW' | 'BLOCK' | 'REVIEW' | 'ASK_MORE_INFO';
type Mode = 'monitor' | 'gateway' | 'critical';

const layers = [
  ['1. User & Agent Layer', ['Users', 'Existing AI Agents', 'Sales Agent', 'Finance Agent', 'Support Agent', 'DevOps Agent']],
  ['2. DSG Gateway Protocol', ['API Key Auth', 'Plan Check API', 'Tool Execution Gateway', 'Commit API', 'Webhook Ingress', 'SDK / REST / MCP Adapter']],
  ['3. Governance Decision Layer', ['Policy Engine', 'Invariant Guard', 'Tool Allowlist', 'Risk Engine', 'Approval Rules', 'Deterministic Engine']],
  ['4. Audit & Proof Layer', ['Audit Ledger', 'Request Hash', 'Response Hash', 'Execution Proof', 'Plan Token', 'Export Evidence']],
  ['5. Tool & API Connectors', ['Stripe', 'Shopify', 'HubSpot', 'Slack', 'Gmail', 'LINE', 'Bank API', 'MCP Tools']],
] as const;

const tools = ['finance.read_balance', 'payment.create', 'treasury.wire', 'gmail.send', 'shopify.refund', 'slack.post_message'];

function stableHash(value: string) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function evaluate(input: { tool: string; amount: number; trust: string; approval: string; mode: Mode }) {
  let decision: Decision = 'ALLOW';
  let rule = 'allow-governed-request';
  let reason = 'Request is inside policy, invariant, risk, and tool allowlist.';
  const highRisk = ['payment.create', 'treasury.wire', 'gmail.send', 'shopify.refund'].includes(input.tool) || input.amount >= 5000;
  const critical = input.tool === 'treasury.wire' || input.amount >= 50000;
  if (input.trust === 'low') {
    decision = 'BLOCK';
    rule = 'block-low-trust-agent';
    reason = 'Low-trust agent cannot execute governed tools.';
  } else if (critical && input.approval !== 'approved') {
    decision = 'REVIEW';
    rule = 'review-critical-action';
    reason = 'Critical action requires human approval before execution.';
  } else if (highRisk && input.approval === 'missing') {
    decision = 'ASK_MORE_INFO';
    rule = 'ask-more-info-high-risk';
    reason = 'High-risk action requires approval context.';
  }
  const requestHash = stableHash(JSON.stringify(input));
  const decisionHash = stableHash(JSON.stringify({ requestHash, decision, rule, reason }));
  return { decision, rule, reason, requestHash: `req_${requestHash}`, decisionHash: `dec_${decisionHash}` };
}

export default function DSGArchitecturePage() {
  const [tool, setTool] = useState('payment.create');
  const [amount, setAmount] = useState(12000);
  const [trust, setTrust] = useState('high');
  const [approval, setApproval] = useState('missing');
  const [mode, setMode] = useState<Mode>('gateway');
  const result = useMemo(() => evaluate({ tool, amount, trust, approval, mode }), [tool, amount, trust, approval, mode]);
  const decisionClass = result.decision === 'ALLOW' ? 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100' : result.decision === 'BLOCK' ? 'border-red-300/40 bg-red-500/10 text-red-100' : result.decision === 'REVIEW' ? 'border-amber-300/40 bg-amber-400/10 text-amber-100' : 'border-violet-300/40 bg-violet-400/10 text-violet-100';

  return (
    <main className="min-h-screen bg-[#040918] text-white">
      <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="rounded-xl border border-cyan-300/25 bg-white/5 px-4 py-2 text-sm font-semibold text-cyan-100">← Back</Link>
          <Link href="/finance-governance/app" className="rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100">Open finance workspace</Link>
        </div>
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">DSG Architecture</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-cyan-100 sm:text-6xl">DSG Governance Gateway Architecture</h1>
          <p className="mt-2 text-lg font-semibold text-cyan-300">Use existing APIs. No runtime changes required.</p>
          <p className="mx-auto mt-4 max-w-5xl rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm text-cyan-100">DSG decisions are deterministic by policy; AI outputs are governed, constrained, and audited.</p>
        </header>
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-3 rounded-2xl border border-cyan-400/20 bg-[#061224] p-4">
            {layers.map(([title, items]) => (
              <section key={title} className="rounded-2xl border border-white/15 bg-gradient-to-r from-blue-500/20 to-cyan-400/10 p-4">
                <h3 className="text-xl font-extrabold text-white">{title}</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {items.map((item) => <span key={item} className="rounded-lg border border-white/20 bg-[#0b1a33]/70 px-3 py-2 text-xs font-semibold text-blue-100">{item}</span>)}
                </div>
              </section>
            ))}
          </div>
          <aside className="rounded-2xl border border-cyan-400/25 bg-[#07172f] p-4">
            <h2 className="text-lg font-bold text-cyan-200">Live Gateway Simulator</h2>
            <div className="mt-4 grid gap-3">
              <select value={tool} onChange={(e) => setTool(e.target.value)} className="rounded-xl border border-cyan-300/20 bg-slate-950 px-4 py-3 text-sm text-white">{tools.map((item) => <option key={item}>{item}</option>)}</select>
              <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value || 0))} className="rounded-xl border border-cyan-300/20 bg-slate-950 px-4 py-3 text-sm text-white" />
              <select value={trust} onChange={(e) => setTrust(e.target.value)} className="rounded-xl border border-cyan-300/20 bg-slate-950 px-4 py-3 text-sm text-white"><option>high</option><option>medium</option><option>low</option></select>
              <select value={approval} onChange={(e) => setApproval(e.target.value)} className="rounded-xl border border-cyan-300/20 bg-slate-950 px-4 py-3 text-sm text-white"><option>approved</option><option>missing</option><option>rejected</option></select>
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="rounded-xl border border-cyan-300/20 bg-slate-950 px-4 py-3 text-sm text-white"><option>monitor</option><option>gateway</option><option>critical</option></select>
            </div>
            <div className={`mt-5 rounded-2xl border px-5 py-3 text-2xl font-black ${decisionClass}`}>{result.decision}</div>
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">{result.reason}</div>
            <div className="mt-3 font-mono text-xs text-cyan-100">{result.requestHash}<br />{result.decisionHash}</div>
          </aside>
        </div>
      </section>
    </main>
  );
}
TSX
  echo "Created $ROOT/app/dsg-architecture/page.tsx"
else
  echo "No supported Next.js app layout found at $ROOT" >&2
  exit 1
fi
