'use client';

import { useState } from 'react';
import Link from 'next/link';

type Step = 'pending' | 'reviewing' | 'approved' | 'rejected';

const SAMPLE_REQUEST = {
  id: 'req-demo-8f2a',
  agent: 'FinanceAgent v2.1',
  action: 'Process vendor payment — $48,500 USD',
  vendor: 'Acme Cloud Services',
  policy: 'payments > $10,000 require human approval',
  riskScore: 72,
  submittedAt: '2026-05-16T09:14:22Z',
  evidence: {
    inputHash: 'sha256:a3f8e2c1d4b7...',
    policyVersion: 'policy-v3.2.1',
    agentId: 'agent_finance_001',
    requestId: 'req-demo-8f2a',
  },
};

function AuditLine({ text, delay }: { text: string; delay: string }) {
  return (
    <div className="animate-fade-in font-mono text-xs text-emerald-300" style={{ animationDelay: delay }}>
      <span className="text-slate-500">{new Date().toISOString().slice(11, 19)}Z</span>{' '}
      {text}
    </div>
  );
}

export default function DemoPage() {
  const [step, setStep] = useState<Step>('pending');
  const [comment, setComment] = useState('');

  function approve() {
    setStep('reviewing');
    setTimeout(() => setStep('approved'), 1200);
  }
  function reject() {
    setStep('reviewing');
    setTimeout(() => setStep('rejected'), 1200);
  }
  function reset() {
    setStep('pending');
    setComment('');
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <p className="text-center text-xs uppercase tracking-widest text-emerald-400">Interactive Demo</p>
        <h1 className="mt-2 text-center text-3xl font-black md:text-4xl">
          AI asks for approval — you decide
        </h1>
        <p className="mt-3 text-center text-slate-400">
          This is a live simulation of DSG ONE&apos;s approval workflow. No login required.
        </p>

        {/* Request card */}
        <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Approval Request</p>
              <p className="mt-1 text-lg font-bold text-white">{SAMPLE_REQUEST.action}</p>
              <p className="mt-1 text-sm text-slate-400">
                Agent: <span className="text-slate-200">{SAMPLE_REQUEST.agent}</span> ·{' '}
                Vendor: <span className="text-slate-200">{SAMPLE_REQUEST.vendor}</span>
              </p>
            </div>
            <div className={[
              'shrink-0 rounded-xl px-3 py-1 text-xs font-bold',
              step === 'pending' ? 'bg-amber-500/20 text-amber-300' :
              step === 'reviewing' ? 'bg-blue-500/20 text-blue-300' :
              step === 'approved' ? 'bg-emerald-500/20 text-emerald-300' :
              'bg-rose-500/20 text-rose-300',
            ].join(' ')}>
              {step === 'reviewing' ? 'Processing…' : step.toUpperCase()}
            </div>
          </div>

          <div className="mt-4 grid gap-2 rounded-xl bg-slate-950 p-4 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Policy triggered</span>
              <span className="text-slate-300">{SAMPLE_REQUEST.policy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Risk score</span>
              <span className={SAMPLE_REQUEST.riskScore > 60 ? 'font-bold text-amber-300' : 'text-emerald-300'}>
                {SAMPLE_REQUEST.riskScore}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Input hash</span>
              <span className="font-mono text-slate-400">{SAMPLE_REQUEST.evidence.inputHash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Policy version</span>
              <span className="font-mono text-slate-400">{SAMPLE_REQUEST.evidence.policyVersion}</span>
            </div>
          </div>

          {/* Actions */}
          {step === 'pending' && (
            <>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a review comment (optional)…"
                rows={2}
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
              />
              <div className="mt-3 flex gap-3">
                <button
                  onClick={approve}
                  className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-bold text-black hover:bg-emerald-400"
                >
                  ✅ Approve Payment
                </button>
                <button
                  onClick={reject}
                  className="flex-1 rounded-xl border border-rose-500/40 bg-rose-500/10 py-3 text-sm font-bold text-rose-300 hover:bg-rose-500/20"
                >
                  ❌ Reject
                </button>
              </div>
            </>
          )}

          {step === 'reviewing' && (
            <div className="mt-4 text-center text-sm text-slate-400 animate-pulse">
              Writing to audit ledger…
            </div>
          )}

          {/* Result */}
          {(step === 'approved' || step === 'rejected') && (
            <div className={[
              'mt-4 rounded-xl border p-4',
              step === 'approved' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10',
            ].join(' ')}>
              <p className="font-bold">
                {step === 'approved' ? '✅ Payment approved and queued' : '❌ Payment rejected'}
              </p>
              {comment && <p className="mt-1 text-sm text-slate-400">Comment: &quot;{comment}&quot;</p>}

              <div className="mt-4 space-y-1.5 rounded-xl bg-slate-950 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">Audit Trail — Live</p>
                <AuditLine text={`[GATE] policy=payments-over-10k triggered for ${SAMPLE_REQUEST.id}`} delay="0ms" />
                <AuditLine text={`[APPROVAL] decision=${step.toUpperCase()} reviewer=demo-user`} delay="200ms" />
                <AuditLine text={`[LEDGER] entry written hash=sha256:${Math.random().toString(16).slice(2, 18)}`} delay="400ms" />
                <AuditLine text={`[EVIDENCE] bundle signed policyVersion=${SAMPLE_REQUEST.evidence.policyVersion}`} delay="600ms" />
                <AuditLine text={`[NOTIFY] ${step === 'approved' ? 'payment queued for execution' : 'agent blocked, workflow halted'}`} delay="800ms" />
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={reset} className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500">
                  Try again
                </button>
                <Link
                  href="/request-access"
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-center text-sm font-bold text-black hover:bg-emerald-400"
                >
                  Use this in my org — Start Free Trial →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Feature bullets */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: '🔒', title: 'Every AI action gated', body: 'Policies block high-risk actions before execution' },
            { icon: '📋', title: 'Tamper-proof audit trail', body: 'Every decision signed and hashed in the ledger' },
            { icon: '⚡', title: 'Real-time notifications', body: 'Approvers get email + dashboard alerts instantly' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-2xl">{f.icon}</p>
              <p className="mt-2 font-bold">{f.title}</p>
              <p className="mt-1 text-sm text-slate-400">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/request-access"
            className="inline-block rounded-2xl bg-emerald-500 px-8 py-4 text-base font-bold text-black hover:bg-emerald-400"
          >
            Start Free Trial — No credit card required
          </Link>
          <p className="mt-3 text-xs text-slate-500">
            Trial includes 1,000 executions · 14-day free · Upgrade anytime
          </p>
        </div>
      </div>
    </main>
  );
}
