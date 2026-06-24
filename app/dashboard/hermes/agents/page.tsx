'use client';

import { useEffect, useRef, useState } from 'react';
import type { AgentResult } from '@/lib/hermes-orchestrator';
import { AGENTS, type AgentRole } from '@/lib/agent-registry';

type RunState = 'idle' | 'loading' | 'complete' | 'error';

export default function HermesAgentsPage() {
  const [runState, setRunState] = useState<RunState>('idle');
  const [input, setInput] = useState(
    'Benchmark all 5 roles: plan, code, audit, tool, summary a minimal DSG deploy checklist.'
  );
  const [result, setResult] = useState<{
    ok: boolean;
    response: string;
    agentsUsed: AgentResult[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latencies, setLatencies] = useState<Record<string, number>>({});

  const roles = Object.keys(AGENTS) as AgentRole[];

  const runBenchmark = async () => {
    setRunState('loading');
    setError(null);
    setResult(null);
    setLatencies({});

    try {
      const res = await fetch('/api/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationHistory: [],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
      }

      const json = (await res.json()) as {
        ok: boolean;
        response: string;
        meta?: { agentsUsed?: AgentResult[] };
      };

      const agentsUsed = json.meta?.agentsUsed ?? [];
      const lat: Record<string, number> = {};
      for (const a of agentsUsed) {
        lat[a.role] = a.latencyMs;
      }
      setLatencies(lat);
      setResult({
        ok: json.ok,
        response: json.response,
        agentsUsed,
      });
      setRunState('complete');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setRunState('error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Hermes Multi-Agent Mesh</h1>
          <p className="mt-2 text-slate-400">
            5 Agent roles ทำงานขนานผ่าน Hermes Orchestrator — ทดสอบและตรวจสอบผลลัพธ์ได้ที่นี่
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const agent = AGENTS[role];
            const latest = result?.agentsUsed.find((a) => a.role === role);
            const latency = latencies[role];
            const isOk = latest?.ok ?? false;
            const isRunning = runState === 'loading';

            return (
              <div
                key={role}
                className={`rounded-xl border p-5 transition ${
                  isRunning
                    ? 'border-slate-700 bg-slate-900'
                    : isOk
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-900'
                }`}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{agent.label}</h3>
                    <p className="text-xs text-slate-500">{agent.description}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isRunning
                        ? 'bg-amber-500/20 text-amber-300'
                        : isOk
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {isRunning ? 'Running' : isOk ? 'Done' : 'Idle'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Model</span>
                    <span className="font-mono text-slate-300">{agent.defaultModel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Latency</span>
                    <span className="font-mono text-slate-300">
                      {latency ? `${latency}ms` : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Role key</span>
                    <span className="font-mono text-slate-300">{role}</span>
                  </div>
                </div>

                {latest?.output && (
                  <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/60 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                      Output
                    </p>
                    <p className="whitespace-pre-wrap text-xs leading-6 text-slate-200">
                      {latest.output.length > 300
                        ? latest.output.slice(0, 300) + '...'
                        : latest.output}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-500">
            Benchmark Prompt
          </label>
          <textarea
            className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-400 focus:outline-none"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="button"
            disabled={runState === 'loading'}
            onClick={runBenchmark}
            className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-400 disabled:opacity-50"
          >
            {runState === 'loading' ? 'Running parallel mesh...' : 'Run Benchmark'}
          </button>

          {error && (
            <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          )}

          {result?.response && (
            <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-violet-300">
                Synthesized Response
              </p>
              <p className="whitespace-pre-wrap text-sm leading-7 text-violet-100">
                {result.response}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.agentsUsed
                  .filter((a) => a.ok)
                  .map((a) => (
                    <span
                      key={a.role}
                      className="rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-0.5 text-xs font-bold text-violet-200"
                    >
                      {AGENTS[a.role].label}: {a.latencyMs}ms
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-xs text-slate-600">
          <p>Docs: docs/MULTI_AGENT_BENCHMARK.md</p>
          <p className="mt-1">Org: Hermes Multi-Agent Mesh · Router: OpenRouter · Mode: Parallel</p>
        </div>
      </div>
    </div>
  );
}
