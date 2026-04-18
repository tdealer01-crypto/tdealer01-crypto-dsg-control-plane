'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type PlaygroundResult = {
  decision: 'ALLOW' | 'STABILIZE' | 'BLOCK';
  reason: string;
  risk_score: number;
  oscillation_detected: boolean;
  proof_hash: string;
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
    () => `curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/execute \\\n  -H "Authorization: Bearer $DSG_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{"agent_id":"$AGENT_ID","action":"scan","input":{"risk_score":${riskScore.toFixed(2)}}}'`,
    [riskScore]
  );

  const estimatedTokens = useMemo(() => {
    const prompt = `action:${action};risk:${riskScore.toFixed(2)};recent:${recentScores}`;
    return Math.max(24, Math.ceil(prompt.length / 3.6));
  }, [action, recentScores, riskScore]);
  const estimatedCostUsd = useMemo(() => Number(((estimatedTokens / 1000) * 0.0025).toFixed(5)), [estimatedTokens]);

  async function evaluate() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/playground/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risk_score: riskScore,
          recent_risk_scores: parseRecentScores(recentScores),
          action,
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

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-14 text-white">
      <div className="mx-auto max-w-7xl space-y-10">
        <header className="space-y-4">
          <h1 className="text-4xl font-bold md:text-6xl">Test the AI gate in under a minute</h1>
          <p className="max-w-4xl text-lg text-slate-300">
            Adjust the risk score and see how DSG decides: ALLOW, STABILIZE, or BLOCK.
          </p>
          <p className="rounded-2xl border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm text-cyan-100">
            No signup required. This page is for public evaluation only.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">What you are testing</h2>
            <ul className="mt-4 space-y-2 text-slate-200">
              <li>• Risk threshold behavior</li>
              <li>• Decision visibility</li>
              <li>• Estimated token and cost impact</li>
            </ul>

            <div className="mt-6">
              <p className="text-sm text-slate-300">Risk score</p>
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

            <label className="mt-6 block">
              <span className="text-sm text-slate-300">Recent scores (optional)</span>
              <input
                type="text"
                value={recentScores}
                onChange={(event) => setRecentScores(event.target.value)}
                placeholder="0.1, 0.6, 0.2"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm text-slate-300">Action</span>
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
              className="mt-6 rounded-2xl bg-emerald-400 px-6 py-3 font-semibold text-slate-950 disabled:opacity-60"
            >
              {loading ? 'Evaluating...' : 'Run decision'}
            </button>
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold">Runtime decision</h2>
            <p className="mt-2 text-sm text-slate-300">
              This public sandbox shows threshold behavior only. Authenticated workspace executions include workspace-scoped review and governance context.
            </p>
            {error ? <p className="mt-4 rounded-xl bg-rose-500/20 px-3 py-2 text-rose-200">{error}</p> : null}
            {result ? (
              <div className="mt-5 space-y-3">
                <p className="text-4xl font-bold">{result.decision}</p>
                <p className="text-slate-200">{result.reason}</p>
                <p className="text-sm text-slate-300">Risk score: {result.risk_score.toFixed(2)}</p>
                <p className="text-sm text-slate-300">Estimated tokens: {estimatedTokens}</p>
                <p className="text-sm text-slate-300">Estimated cost: ${estimatedCostUsd} USD</p>
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-400">Run a test to see ALLOW, STABILIZE, or BLOCK.</p>
            )}

            <div className="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="font-semibold text-emerald-100">Want to test this in your own workspace?</p>
              <p className="mt-2 text-sm text-emerald-50">
                Create a trial workspace to run authenticated executions, manage agents, and review usage and audit views.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/signup" className="rounded-xl bg-white px-4 py-3 font-semibold text-slate-950">
                  Start workspace trial
                </Link>
                <Link href="/docs" className="rounded-xl border border-white/25 bg-white/10 px-4 py-3 font-semibold text-white">
                  Read API docs
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-semibold">Production example</h2>
          <p className="mt-2 text-sm text-slate-300">Use this route inside a workspace setup with your authenticated configuration.</p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-sm text-slate-200">{codeSnippet}</pre>
        </section>

        <section className="rounded-[1.75rem] border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold">What changes inside a workspace?</h2>
          <p className="mt-3 text-slate-200">
            Public evaluation helps you understand the gate. A workspace trial adds authenticated execution, agent setup,
            usage visibility, and governance review surfaces.
          </p>
          <Link href="/signup" className="mt-5 inline-flex rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950">
            Create your workspace
          </Link>
        </section>
      </div>
    </main>
  );
}
