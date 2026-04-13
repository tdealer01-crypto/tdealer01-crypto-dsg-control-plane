'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PlaygroundResult = {
  decision: 'ALLOW' | 'STABILIZE' | 'BLOCK';
  reason: string;
  risk_score: number;
  oscillation_detected: boolean;
  proof_hash: string;
  policy: {
    block_threshold: number;
    stabilize_threshold: number;
    oscillation_window: number;
    oscillation_spread: number;
  };
  evaluated_at: string;
};

function parseRecentScores(input: string): number[] {
  return input
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((value) => Number.isFinite(value));
}

export default function PlaygroundPage() {
  const [riskScore, setRiskScore] = useState(0.1);
  const [recentScores, setRecentScores] = useState('');
  const [action, setAction] = useState('playground_eval');
  const [result, setResult] = useState<PlaygroundResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scoreColor = useMemo(() => {
    if (riskScore >= 0.8) return 'text-rose-400';
    if (riskScore >= 0.4) return 'text-amber-300';
    return 'text-emerald-300';
  }, [riskScore]);

  const codeSnippet = useMemo(
    () => `curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \\
  -H "Authorization: Bearer $DSG_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id":"$AGENT_ID","action":"scan","input":{"risk_score":${riskScore.toFixed(2)}}}'`,
    [riskScore]
  );

  async function evaluate(values?: { risk: number; recent: string; actionValue: string }) {
    const nextRisk = values?.risk ?? riskScore;
    const nextRecent = values?.recent ?? recentScores;
    const nextAction = values?.actionValue ?? action;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/playground/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risk_score: nextRisk,
          recent_risk_scores: parseRecentScores(nextRecent),
          action: nextAction,
        }),
      });

      const json = (await response.json()) as PlaygroundResult | { error?: string };
      if (!response.ok) {
        setResult(null);
        setError((json as { error?: string }).error ?? 'Unable to evaluate risk score');
        return;
      }

      setResult(json as PlaygroundResult);
    } catch {
      setResult(null);
      setError('Network error while evaluating risk score');
    } finally {
      setLoading(false);
    }
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(codeSnippet);
  }

  async function runPreset(preset: { risk: number; recent?: string }) {
    const nextRecent = preset.recent ?? '';
    setRiskScore(preset.risk);
    setRecentScores(nextRecent);
    await evaluate({ risk: preset.risk, recent: nextRecent, actionValue: action });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-14 text-white">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="space-y-6">
          <div className="inline-flex items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
            Free — no signup required
          </div>
          <h1 className="text-4xl font-bold md:text-6xl">AI Governance Playground</h1>
          <p className="max-w-4xl text-lg text-slate-300">
            ลองประเมิน risk score แล้วดูว่า DSG gate ตัดสินใจอย่างไร — ไม่ต้องสมัคร ไม่ต้อง login
          </p>
          <nav className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 hover:border-white/40">
              Back to home
            </Link>
            <Link href="/pricing" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 hover:border-white/40">
              View pricing
            </Link>
            <Link href="/login" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 hover:border-white/40">
              Login
            </Link>
          </nav>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Input</h2>
            <div className="mt-6 space-y-5">
              <div>
                <p className="text-sm text-slate-300">Risk Score</p>
                <p className={`mt-2 text-5xl font-bold ${scoreColor}`}>{riskScore.toFixed(2)}</p>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={riskScore}
                  onChange={(event) => setRiskScore(Number(event.target.value))}
                  className="mt-4 w-full"
                />
              </div>

              <label className="block">
                <span className="text-sm text-slate-300">Recent Risk Scores</span>
                <input
                  type="text"
                  value={recentScores}
                  onChange={(event) => setRecentScores(event.target.value)}
                  placeholder="0.1, 0.6, 0.2, 0.58"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Action name</span>
                <input
                  type="text"
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
                />
              </label>

              <button
                type="button"
                disabled={loading}
                onClick={() => evaluate()}
                className="rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Evaluating...' : 'Evaluate'}
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => runPreset({ risk: 0.1 })}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                >
                  Low risk (0.1)
                </button>
                <button
                  type="button"
                  onClick={() => runPreset({ risk: 0.5 })}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                >
                  Medium risk (0.5)
                </button>
                <button
                  type="button"
                  onClick={() => runPreset({ risk: 0.9 })}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                >
                  High risk (0.9)
                </button>
                <button
                  type="button"
                  onClick={() => runPreset({ risk: 0.2, recent: '0.1, 0.6, 0.2, 0.58' })}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm"
                >
                  Oscillation
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Result</h2>
            {error ? <p className="mt-4 rounded-xl bg-rose-500/20 px-3 py-2 text-rose-200">{error}</p> : null}
            {result ? (
              <div className="mt-5 space-y-4">
                <p
                  className={`text-4xl font-bold ${
                    result.decision === 'ALLOW'
                      ? 'text-emerald-300'
                      : result.decision === 'STABILIZE'
                        ? 'text-amber-300'
                        : 'text-rose-400'
                  }`}
                >
                  {result.decision}
                </p>
                <p className="text-slate-200">{result.reason}</p>
                <p>
                  Oscillation detected:{' '}
                  <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
                    {result.oscillation_detected ? 'yes' : 'no'}
                  </span>
                </p>
                <p className="truncate font-mono text-sm text-slate-300" title={result.proof_hash}>
                  {result.proof_hash}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">block: {result.policy.block_threshold}</div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">stabilize: {result.policy.stabilize_threshold}</div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">window: {result.policy.oscillation_window}</div>
                  <div className="rounded-xl border border-white/10 bg-slate-900/40 p-3">spread: {result.policy.oscillation_spread}</div>
                </div>
                <p className="text-sm text-slate-400">Evaluated at: {result.evaluated_at}</p>
                <div className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Decision Transparency Timeline</p>
                  <p className="mt-2 text-xs text-cyan-100">Codex proposed this feature to increase trust between people and AI.</p>
                  <ol className="mt-3 space-y-2 text-sm text-slate-100">
                    <li>1) Input received — risk_score {result.risk_score.toFixed(2)}.</li>
                    <li>2) Policy applied — threshold + oscillation checks executed.</li>
                    <li>3) Decision issued — {result.decision} ({result.reason}).</li>
                    <li>4) Proof generated — hash anchored for audit traceability.</li>
                  </ol>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-slate-400">Run evaluation to see decision details.</p>
            )}
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold">Threshold visualization</h3>
          <div className="mt-4">
            <div className="relative h-4 rounded-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-500">
              <span
                className="absolute -top-2 h-8 w-1 rounded bg-white"
                style={{ left: `${Math.max(0, Math.min(100, riskScore * 100))}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-300">
              <span>0</span>
              <span>0.4 (ALLOW)</span>
              <span>0.8 (STABILIZE)</span>
              <span>1.0 (BLOCK)</span>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-semibold">ใช้ใน production — แค่ 3 บรรทัด</h3>
            <button
              type="button"
              onClick={() => void copySnippet()}
              className="rounded-2xl bg-emerald-400 px-4 py-2 font-semibold text-slate-950"
            >
              Copy
            </button>
          </div>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-emerald-200">
            <code>{codeSnippet}</code>
          </pre>
          <Link href="/signup" className="mt-4 inline-flex text-emerald-400 hover:text-emerald-300">
            Start Free Trial →
          </Link>
        </section>
      </div>
    </main>
  );
}
