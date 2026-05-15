'use client';

import Link from 'next/link';
import {
  Sparkles,
  LayoutTemplate,
  BarChart2,
  History,
  Bell,
  ArrowRight,
  CheckCircle2,
  Cpu,
  GitBranch,
  ExternalLink,
} from 'lucide-react';

const templates = [
  { label: 'SaaS Starter', slug: 'saas-starter' },
  { label: 'AI Chatbot', slug: 'ai-chatbot' },
  { label: 'Analytics Dashboard', slug: 'analytics' },
  { label: 'More →', slug: 'more' },
];

const recentBuilds = [
  { id: '1', name: 'Customer Portal v2', status: 'deployed' },
  { id: '2', name: 'Internal HR Tracker', status: 'building' },
  { id: '3', name: 'Inventory Sync Bot', status: 'draft' },
];

const steps = [
  {
    number: '01',
    title: 'Describe your app',
    desc: 'Tell DSG what you need in plain language. No spec docs required.',
    iconType: 'sparkles',
  },
  {
    number: '02',
    title: 'AI builds it',
    desc: 'Governed AI agents generate, validate, and wire up every component.',
    iconType: 'cpu',
  },
  {
    number: '03',
    title: 'Deploy with evidence',
    desc: 'Full evidence trail, audit log, and one-click deploy to production.',
    iconType: 'check',
  },
];

const navLinks = [
  { label: 'Build', href: '/dsg/app-builder' },
  { label: 'Templates', href: '/dsg/templates' },
  { label: 'Analytics', href: '/dsg/analytics' },
  { label: 'History', href: '/dsg/history' },
];

const statusBadgeClass: Record<string, string> = {
  deployed: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/25',
  building: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25',
  draft: 'bg-slate-700/60 text-slate-400 border border-slate-600/40',
};

function StepIcon({ type }: { type: string }) {
  if (type === 'sparkles') return <Sparkles className="h-5 w-5 text-indigo-300" />;
  if (type === 'cpu') return <Cpu className="h-5 w-5 text-indigo-300" />;
  return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* sticky nav */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/90 px-6 backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white"
        >
          <Sparkles className="h-4 w-4 text-indigo-400" />
          DSG ONE V1
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-xl px-3 py-1.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/dsg/notifications"
          className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          <Bell className="h-5 w-5" />
        </Link>
      </header>

      {/* hero */}
      <section className="flex min-h-[60vh] flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 px-6 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-indigo-200">
          <Sparkles className="h-3.5 w-3.5" /> Governed App Builder
        </div>
        <h1 className="text-5xl font-black tracking-tight md:text-7xl">
          Build governed apps
          <br className="hidden md:block" /> with AI.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-slate-400">
          Describe what you need — DSG builds, governs, and deploys it with a full evidence trail.
        </p>
        <p className="mt-3 font-mono text-sm tracking-widest text-indigo-300/70">
          Describe → Build → Evidence → Deploy
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dsg/app-builder"
            className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500"
          >
            Start building <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dsg/templates"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 px-6 py-3 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <LayoutTemplate className="h-4 w-4" /> Browse templates
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-6 py-16">
        {/* how it works */}
        <section>
          <h2 className="mb-8 text-center text-2xl font-black">How it works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.number} className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-slate-700">{s.number}</span>
                  <span className="rounded-xl border border-slate-800 bg-slate-950 p-2">
                    <StepIcon type={s.iconType} />
                  </span>
                </div>
                <h3 className="mb-2 text-base font-bold">{s.title}</h3>
                <p className="text-sm leading-6 text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* template chips */}
        <section>
          <h2 className="mb-6 text-xl font-black">Start from a template</h2>
          <div className="flex flex-wrap gap-3">
            {templates.map((t) => (
              <Link
                key={t.slug}
                href={`/dsg/app-builder?template=${t.slug}`}
                className="rounded-2xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-sm font-bold text-slate-300 transition-colors hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-200"
              >
                {t.label}
              </Link>
            ))}
          </div>
        </section>

        {/* recent builds */}
        <section>
          <h2 className="mb-6 text-xl font-black">Recent builds</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {recentBuilds.map((app) => (
              <div
                key={app.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="mb-4">
                  <p className="font-bold text-slate-100">{app.name}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      statusBadgeClass[app.status]
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
                <Link
                  href="/dsg/app-builder"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-300 transition-colors hover:text-indigo-200"
                >
                  Open <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
