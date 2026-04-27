'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const benchmarkMetrics = [
  { label: 'Best-Mass test suite', value: '38 / 38 passed' },
  { label: 'Success rate', value: '98.2%' },
  { label: 'Average latency', value: '45.2 ms' },
  { label: 'Throughput', value: '1,429 req/min' },
  { label: 'Observed uptime', value: '99.99%' },
  { label: 'Transaction loss', value: '0 reported' },
];

const capabilities = [
  {
    title: 'Multi-agent orchestration',
    description:
      'Coordinate deterministic planners, operator agents, and policy gates in one execution fabric with explainable handoffs.',
  },
  {
    title: 'Dual-chain ledger controls',
    description:
      'Track governance outcomes and finance operations through auditable, dual-ledger evidence aligned to enterprise controls.',
  },
  {
    title: 'Enterprise security posture',
    description:
      'Use role boundaries, runtime policy checks, and replay-safe automation lanes built for regulated environments.',
  },
  {
    title: 'Real-time operational processing',
    description:
      'Monitor queue depth, failure domains, and decision traces with live service-level metrics and operator feedback loops.',
  },
];

const doiResearch = ['10.5281/zenodo.18244246', '10.5281/zenodo.18225586', '10.5281/zenodo.18212854'];

const narrationBlocks = [
  'Welcome to Pro Mode. This page summarizes benchmark evidence, architecture posture, and research references for enterprise evaluation.',
  'Current benchmark snapshot reports 38 out of 38 tests passed, 98.2 percent success rate, 45.2 milliseconds average latency, 1,429 requests per minute, 99.99 percent uptime, and zero reported transaction loss.',
  'Core capabilities include multi-agent orchestration, dual-chain ledger controls, enterprise security posture, and real-time operational processing.',
  'For due diligence, this page includes DOI references and separates evidence-pack disclosure from third-party certification language to avoid over-claiming.',
];

export default function ProModePage() {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('Voice summary is ready.');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const narrationText = useMemo(() => narrationBlocks.join(' '), []);

  const stopNarration = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setStatus('Voice summary stopped.');
  }, []);

  const startNarration = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatus('This browser does not support automatic voice playback.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(narrationText);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    utterance.onstart = () => {
      setIsPlaying(true);
      setStatus('Voice summary is playing.');
    };
    utterance.onend = () => {
      setIsPlaying(false);
      setStatus('Voice summary completed.');
    };
    utterance.onerror = () => {
      setIsPlaying(false);
      setStatus('Playback interrupted. Press Play summary to retry.');
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [narrationText]);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    setIsSupported(supported);

    if (supported) {
      startNarration();
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [startNarration]);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[2rem] border border-sky-300/25 bg-gradient-to-br from-sky-400/20 via-slate-900 to-slate-950 p-6 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200">Auto Voice Summary</p>
          <h2 className="mt-3 text-2xl font-semibold md:text-3xl">Read-along block</h2>
          <p className="mt-3 text-slate-200">
            This page starts a voice summary automatically when supported. Use the controls below to replay or stop.
          </p>
          <p className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-sm leading-7 text-slate-100">
            <span className="font-semibold text-sky-100">Summary script:</span> {narrationText}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startNarration}
              disabled={!isSupported}
              className="rounded-xl bg-sky-300 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Play summary
            </button>
            <button
              type="button"
              onClick={stopNarration}
              disabled={!isSupported || !isPlaying}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Stop
            </button>
            <span className="self-center text-sm text-slate-300">Status: {status}</span>
          </div>
        </section>

        <section className="rounded-[2rem] border border-amber-300/20 bg-gradient-to-br from-amber-400/15 via-slate-900 to-slate-950 p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200">Pro Mode</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">Evidence-first automation for finance-grade control planes</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-200 md:text-lg">
            Pro Mode provides a public proof surface for enterprise evaluators: benchmark snapshots, architecture coverage,
            governance design patterns, and research references in one operator-friendly page.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/request-access"
              className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:scale-[1.01]"
            >
              Request workspace access
            </Link>
            <Link
              href="/docs"
              className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100"
            >
              Read technical docs
            </Link>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold md:text-3xl">Benchmark snapshot</h2>
              <p className="mt-2 text-slate-300">Public metrics summarized from the published proof pack and performance release artifacts.</p>
            </div>
            <span className="rounded-full border border-emerald-300/35 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">
              Evidence Pack
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benchmarkMetrics.map((metric) => (
              <article key={metric.label} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <p className="text-sm text-slate-400">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-emerald-100">{metric.value}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-sm text-slate-400">
            Note: these values are presented as disclosed evidence-pack outcomes and should not be interpreted as an independent third-party certification.
          </p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
          <h2 className="text-2xl font-semibold md:text-3xl">Control-plane architecture at a glance</h2>
          <p className="mt-3 max-w-3xl text-slate-300">
            The Pro Mode surface mirrors marketplace announcement structure for technical buyers: core capabilities,
            security posture, and processing model.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {capabilities.map((item) => (
              <article key={item.title} className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <h3 className="text-lg font-semibold text-amber-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-2xl font-semibold">Research references</h2>
            <p className="mt-3 text-slate-300">Public DOI links used for review conversations and technical due-diligence.</p>
            <ul className="mt-5 space-y-3 text-sm">
              {doiResearch.map((doi) => (
                <li key={doi}>
                  <a
                    href={`https://doi.org/${doi}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-amber-100 underline decoration-amber-300/40 underline-offset-4"
                  >
                    {doi}
                  </a>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-8">
            <h2 className="text-2xl font-semibold">Accuracy and claims boundary</h2>
            <p className="mt-3 text-slate-300">To avoid over-claiming, Pro Mode separates evidence-pack disclosures from certification language.</p>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
              <li>• Evidence pack: reproducible test summaries, throughput traces, and published benchmark artifacts.</li>
              <li>• Third-party certification: only shown when an independent certifier and report are explicitly cited.</li>
              <li>• Enterprise buyers can request deeper controls documentation through the access workflow.</li>
            </ul>
            <Link
              href="/support"
              className="mt-6 inline-block rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100"
            >
              Contact the DSG team
            </Link>
          </article>
        </section>
      </div>
    </main>
  );
}
