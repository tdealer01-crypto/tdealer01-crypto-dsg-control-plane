'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Verdict, { toVerdict } from '../../_components/Verdict';
import { shortHash, type RunView } from '../../_components/types';

const LIVE_POLL_MS = 2_000;

const RISK_LABEL: Record<string, string> = {
  low: 'low risk',
  medium: 'medium risk',
  high: 'high risk',
  critical: 'critical risk',
};

function StepIcon({ status }: { status: RunStepStatus }) {
  const glyph =
    status === 'PASSED'
      ? '✓'
      : status === 'BLOCKED'
        ? '✕'
        : status === 'REVIEW'
          ? '△'
          : status === 'DISPATCHED'
            ? '●'
            : status === 'SKIPPED'
              ? '–'
              : '○';

  const color =
    status === 'PASSED'
      ? 'text-emerald-400'
      : status === 'BLOCKED'
        ? 'text-red-400'
        : status === 'REVIEW'
          ? 'text-yellow-400'
          : status === 'DISPATCHED'
            ? 'animate-pulse text-white'
            : 'text-slate-600';

  return (
    <span aria-hidden="true" className={`w-4 shrink-0 text-center ${color}`}>
      {glyph}
    </span>
  );
}

type RunStepStatus = RunView['steps'][number]['status'];

export default function RunClient({ runId }: { runId: string }) {
  const [run, setRun] = useState<RunView | null>(null);
  const [phase, setPhase] = useState<string>('Planning');
  const [blockedReason, setBlockedReason] = useState<string | null>(null);
  const [pendingPlanHash, setPendingPlanHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Kept in a ref so the poll effect does not restart on every status change.
  const statusRef = useRef<string>('DRAFT');

  const load = useCallback(async () => {
    const response = await fetch(`/api/dsg/v1/runs/${runId}`, { cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || payload.error || 'Could not load this run.');
    }
    setRun(payload.run);
    setPhase(payload.phase);
    setBlockedReason(payload.blockedReason ?? null);
    statusRef.current = payload.run.status;
  }, [runId]);

  useEffect(() => {
    let alive = true;
    load()
      .catch((err) => {
        if (alive) setError(err instanceof Error ? err.message : 'Could not load this run.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [load]);

  // Live Verification: poll only while the run is actually moving.
  useEffect(() => {
    const timer = setInterval(() => {
      if (statusRef.current !== 'LOCKED' && statusRef.current !== 'RUNNING') return;
      void load().catch(() => {
        /* transient; the next tick retries */
      });
    }, LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  async function decide(decision: 'approve' | 'reject') {
    setApproving(true);
    setError(null);
    try {
      const response = await fetch(`/api/dsg/v1/runs/${runId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || payload.error || 'Could not record your decision.');
      }
      setRun(payload.run);
      setPhase(payload.phase);
      statusRef.current = payload.run.status;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record your decision.');
    } finally {
      setApproving(false);
    }
  }

  useEffect(() => {
    if (run?.status !== 'DRAFT') return;
    // Show the hash the approval will freeze, so the user can see the plan
    // identity before committing to it.
    setPendingPlanHash(run.planHash);
  }, [run]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading run…</p>;
  }

  if (error && !run) {
    return (
      <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!run) return null;

  const verdict = toVerdict(run.status);
  const isDraft = run.status === 'DRAFT';
  const isLive = run.status === 'LOCKED' || run.status === 'RUNNING';

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-slate-500">Requested action</p>
        <h1 className="mt-1 text-xl font-semibold">{run.plan.intent}</h1>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* ── Layer 1: Plan Lock ─────────────────────────────────────────── */}
      {isDraft && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold">The agent will</h2>
          <ol className="mt-3 space-y-2">
            {run.plan.steps.map((step) => (
              <li key={step.stepId} className="flex gap-3 text-sm">
                <span className="w-4 shrink-0 text-slate-600">{step.ordinal}.</span>
                <span className="flex-1">
                  {step.summary}
                  <span className="ml-2 text-xs text-slate-500">
                    {step.targetSystem} · {RISK_LABEL[step.riskLevel] ?? step.riskLevel}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <h2 className="mt-5 text-sm font-semibold">It will not</h2>
          <ul className="mt-2 space-y-1.5">
            {run.plan.exclusions.map((exclusion) => (
              <li key={exclusion} className="flex gap-3 text-sm text-slate-400">
                <span aria-hidden="true" className="w-4 shrink-0 text-center">
                  ✕
                </span>
                <span>{exclusion}</span>
              </li>
            ))}
          </ul>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-slate-800 pt-4 text-xs">
            <div>
              <dt className="text-slate-500">Systems</dt>
              <dd className="mt-0.5 text-slate-300">{run.plan.allowedTargetSystems.join(', ')}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Policy</dt>
              <dd className="mt-0.5 text-slate-300">v{run.plan.policyVersion}</dd>
            </div>
          </dl>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              disabled={approving}
              onClick={() => void decide('approve')}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {approving ? 'Starting…' : 'Approve & Run'}
            </button>
            <button
              type="button"
              disabled={approving}
              onClick={() => void decide('reject')}
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              Cancel
            </button>
            <p className="ml-auto text-xs text-slate-500">
              DSG will not ask again unless the agent leaves this plan.
            </p>
          </div>
        </section>
      )}

      {/* ── Layer 4: Live Verification ─────────────────────────────────── */}
      {!isDraft && (
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold">
              {isLive ? phase : 'Result'}
              {isLive && <span className="ml-2 animate-pulse text-slate-500">…</span>}
            </h2>
            {verdict && <Verdict value={verdict} />}
          </div>

          <ol className="mt-4 space-y-2.5">
            {run.steps.map((step) => (
              <li key={step.stepId} className="flex gap-3 text-sm">
                <StepIcon status={step.status} />
                <div className="flex-1">
                  <span
                    className={
                      step.status === 'SKIPPED' || step.status === 'PENDING'
                        ? 'text-slate-500'
                        : 'text-slate-200'
                    }
                  >
                    {step.summary}
                  </span>
                  {step.judgement?.message && (
                    <p className="mt-1 text-xs text-slate-400">{step.judgement.message}</p>
                  )}
                </div>
                {step.status === 'DISPATCHED' && (
                  <span className="shrink-0 text-xs text-slate-500">{step.phase}</span>
                )}
              </li>
            ))}
          </ol>

          {blockedReason && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {blockedReason}
            </p>
          )}

          <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-800 pt-4 text-xs">
            <div>
              <dt className="text-slate-500">Plan</dt>
              <dd className="mt-0.5 font-mono text-slate-300">
                {shortHash(run.planHash ?? pendingPlanHash)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Approved by</dt>
              <dd className="mt-0.5 truncate text-slate-300">{run.approvedBy ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Steps</dt>
              <dd className="mt-0.5 text-slate-300">
                {run.steps.filter((step) => step.status === 'PASSED').length} / {run.steps.length}{' '}
                passed
              </dd>
            </div>
          </dl>

          {verdict && run.status !== 'CANCELLED' && (
            <Link
              href={`/one/proofs/${run.runId}`}
              className="mt-5 inline-block rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/5"
            >
              View proof receipt
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
