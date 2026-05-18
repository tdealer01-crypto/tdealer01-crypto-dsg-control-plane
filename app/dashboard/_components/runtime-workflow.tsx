'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

type Tone = 'gold' | 'blue' | 'green' | 'red' | 'slate';

type Step = {
  label: string;
  title: string;
  body: string;
};

type ActionLink = {
  href: string;
  label: string;
  tone?: Tone;
};

const toneClass: Record<Tone, string> = {
  gold: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  blue: 'border-sky-300/30 bg-sky-300/10 text-sky-100',
  green: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-100',
  red: 'border-rose-300/30 bg-rose-300/10 text-rose-100',
  slate: 'border-white/10 bg-white/[0.03] text-slate-200',
};

const actionToneClass: Record<Tone, string> = {
  gold: 'bg-amber-300 text-slate-950 hover:bg-amber-200',
  blue: 'bg-sky-300 text-slate-950 hover:bg-sky-200',
  green: 'bg-emerald-300 text-slate-950 hover:bg-emerald-200',
  red: 'bg-rose-300 text-slate-950 hover:bg-rose-200',
  slate: 'border border-white/15 bg-white/[0.03] text-slate-100 hover:border-amber-300/30',
};

const nav = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/verification', label: 'Verification' },
  { href: '/dashboard/live-control', label: 'Live Control' },
  { href: '/dashboard/executions', label: 'Executions' },
  { href: '/dashboard/audit', label: 'Audit' },
  { href: '/dashboard/policies', label: 'Policies' },
];

export function RuntimeWorkflowPage({
  active,
  eyebrow,
  title,
  description,
  status,
  statusTone = 'gold',
  actions = [],
  steps,
  children,
}: {
  active: string;
  eyebrow: string;
  title: string;
  description: string;
  status?: string;
  statusTone?: Tone;
  actions?: ActionLink[];
  steps: Step[];
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#090a0d] text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="border border-white/10 bg-[linear-gradient(135deg,rgba(126,16,24,0.22),rgba(13,15,18,0.96)_44%,rgba(41,84,130,0.16)_78%,rgba(245,197,92,0.12)_120%)] p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{eyebrow}</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-5xl">{title}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{description}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {status ? <StatusPill tone={statusTone}>{status}</StatusPill> : null}
              {actions.map((action) => (
                <Link key={`${action.href}-${action.label}`} href={action.href} className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${actionToneClass[action.tone || 'slate']}`}>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <nav className="mt-6 flex gap-2 overflow-x-auto border-t border-white/10 pt-4">
            {nav.map((item) => {
              const selected = item.href === active;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] transition',
                    selected ? 'border-amber-300/40 bg-amber-300/10 text-amber-100' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-white',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <section className="mt-6 grid gap-3 md:grid-cols-4">
          {steps.map((step) => (
            <div key={step.label} className="border border-white/10 bg-[#0d0f12] p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-sm font-bold text-amber-100">{step.label}</div>
              <h2 className="mt-4 text-sm font-semibold text-white">{step.title}</h2>
              <p className="mt-2 text-xs leading-6 text-slate-400">{step.body}</p>
            </div>
          ))}
        </section>

        {children}
      </div>
    </main>
  );
}

export function StatusPill({ tone = 'slate', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${toneClass[tone]}`}>{children}</span>;
}

export function WorkflowPanel({
  eyebrow,
  title,
  body,
  children,
  tone = 'slate',
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  children?: ReactNode;
  tone?: Tone;
}) {
  return (
    <section className={`border p-5 ${toneClass[tone]}`}>
      {eyebrow ? <p className="text-[11px] uppercase tracking-[0.24em] opacity-80">{eyebrow}</p> : null}
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      {body ? <p className="mt-3 text-sm leading-7 text-slate-300">{body}</p> : null}
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

export function MetricTile({
  label,
  value,
  helper,
  tone = 'slate',
}: {
  label: string;
  value: string;
  helper?: string;
  tone?: Tone;
}) {
  return (
    <div className={`border p-4 ${toneClass[tone]}`}>
      <p className="text-[10px] uppercase tracking-[0.22em] opacity-80">{label}</p>
      <p className="mt-2 font-mono text-2xl text-white">{value}</p>
      {helper ? <p className="mt-2 text-xs leading-5 text-slate-400">{helper}</p> : null}
    </div>
  );
}

export function EvidenceRow({ label, value, tone = 'slate' }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div className={`flex items-start justify-between gap-4 border p-3 text-sm ${toneClass[tone]}`}>
      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="text-right font-mono text-slate-100">{value}</span>
    </div>
  );
}

export function EmptyState({ title, body, href, action }: { title: string; body: string; href?: string; action?: string }) {
  return (
    <div className="border border-amber-300/25 bg-amber-300/10 p-5 text-amber-50">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-amber-50/80">{body}</p>
      {href && action ? (
        <Link href={href} className="mt-4 inline-flex rounded-xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">
          {action}
        </Link>
      ) : null}
    </div>
  );
}
