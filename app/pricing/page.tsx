'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Interval = 'monthly' | 'yearly';

const PLANS = [
  {
    key: 'trial',
    name: 'Trial',
    monthly: 0,
    yearly: 0,
    executions: '1,000 / mo',
    featured: false,
    cta: 'Start free',
    ctaHref: '/request-access',
    features: ['1,000 executions / mo', 'Policy gate', 'Audit trail', 'Finance governance', '14-day full access'],
  },
  {
    key: 'pro',
    name: 'Pro',
    monthly: 99,
    yearly: 79,
    executions: '10,000 / mo',
    featured: false,
    cta: 'Start Pro trial',
    features: ['10,000 executions / mo', 'Everything in Trial', 'Approval workflow', 'Email notifications', 'Priority support'],
  },
  {
    key: 'business',
    name: 'Business',
    monthly: 299,
    yearly: 249,
    executions: '100,000 / mo',
    featured: true,
    cta: 'Start Business trial',
    features: ['100,000 executions / mo', 'Everything in Pro', 'Finance Pack included', 'Audit export PDF + JSON', 'SSO ready'],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: 999,
    yearly: 849,
    executions: 'Custom',
    featured: false,
    cta: 'Start Enterprise pilot',
    features: ['Custom quota', 'Everything in Business', 'All skill packs', 'Custom skill builder', 'SLA 4h + CSM'],
  },
];

const SKILL_PACKS = [
  { id: 'finance_skills',    name: 'Finance Governance', price: 199, icon: '🏦', color: 'emerald', desc: 'Approval workflow, payment gating, audit ledger, budget policy' },
  { id: 'dev_skills',        name: 'Dev Automation',     price: 99,  icon: '⚙️', color: 'blue',    desc: 'Deploy gate, code review, security scan, release proof' },
  { id: 'compliance_skills', name: 'Compliance & Legal', price: 249, icon: '⚖️', color: 'violet',  desc: 'Policy enforcer, GDPR guard, contract review, risk scorer' },
  { id: 'ops_skills',        name: 'Operations',         price: 149, icon: '🚀', color: 'amber',   desc: 'Incident response, runbook executor, capacity planner' },
  { id: 'enterprise_skills', name: 'Enterprise Bundle',  price: 599, icon: '🏢', color: 'rose',    desc: 'All 4 packs + custom skill builder + dedicated support' },
];

const TEMPLATES = [
  { name: 'E-Commerce Store', category: 'Commerce',    price: 'FREE', popular: true },
  { name: 'CRM System',       category: 'Business',    price: '$29',  popular: false },
  { name: 'Booking App',      category: 'SaaS',        price: '$39',  popular: false },
  { name: 'HR Portal',        category: 'Internal',    price: '$49',  popular: false },
  { name: 'Invoice Manager',  category: 'Finance',     price: '$49',  popular: false },
  { name: 'Project Tracker',  category: 'Productivity',price: 'FREE', popular: true },
];

const CAT_COLOR: Record<string, string> = {
  Commerce: 'bg-emerald-500/20 text-emerald-300',
  Business: 'bg-blue-500/20 text-blue-300',
  SaaS: 'bg-purple-500/20 text-purple-300',
  Internal: 'bg-orange-500/20 text-orange-300',
  Finance: 'bg-yellow-500/20 text-yellow-200',
  Productivity: 'bg-pink-500/20 text-pink-300',
};

const PACK_COLOR: Record<string, string> = {
  emerald: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10',
  blue:    'border-blue-500/30 text-blue-300 bg-blue-500/10',
  violet:  'border-violet-500/30 text-violet-300 bg-violet-500/10',
  amber:   'border-amber-500/30 text-amber-300 bg-amber-500/10',
  rose:    'border-rose-500/30 text-rose-300 bg-rose-500/10',
};

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleCheckout(planKey: string) {
    setLoading(planKey);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planKey, interval }),
      });
      if (res.status === 401) { router.push('/login?next=/pricing'); return; }
      const data = await res.json().catch(() => ({}));
      if (data?.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#07080a] text-white">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.15),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.12),transparent_35%)]" />
        <div className="relative mx-auto max-w-5xl px-6 py-16 text-center">
          <p className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300">
            DSG ONE Pricing
          </p>
          <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">
            Everything in one place
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Subscription plans · Skill pack add-ons · One-click app templates
          </p>
          {/* Jump links */}
          <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
            {[
              { label: 'Subscription plans', href: '#plans' },
              { label: 'Skill packs', href: '#skills' },
              { label: 'App templates', href: '#templates' },
              { label: 'Evidence', href: '#evidence' },
            ].map((l) => (
              <a key={l.href} href={l.href} className="rounded-xl border border-slate-700 px-4 py-2 text-slate-300 hover:border-emerald-400 hover:text-emerald-300">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Subscription Plans ── */}
      <section id="plans" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex flex-col items-center gap-4">
          <h2 className="text-2xl font-black">Subscription Plans</h2>
          <p className="text-sm text-slate-400">Pay for executions, not seats. Every plan includes policy gate, audit ledger, and approval workflow.</p>
          {/* Interval toggle */}
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900 p-1">
            {(['monthly', 'yearly'] as Interval[]).map((iv) => (
              <button
                key={iv}
                onClick={() => setInterval(iv)}
                className={['rounded-lg px-5 py-2 text-sm font-semibold transition', interval === iv ? 'bg-emerald-500 text-black' : 'text-slate-400 hover:text-white'].join(' ')}
              >
                {iv === 'monthly' ? 'Monthly' : 'Yearly'}
                {iv === 'yearly' && <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">–20%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => {
            const price = interval === 'yearly' ? plan.yearly : plan.monthly;
            return (
              <article
                key={plan.key}
                className={['relative flex flex-col rounded-2xl border p-6', plan.featured ? 'border-emerald-500/40 bg-emerald-500/10 shadow-2xl shadow-emerald-950/30' : 'border-white/10 bg-white/[0.03]'].join(' ')}
              >
                {plan.featured && (
                  <span className="absolute right-4 top-4 rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">Popular</span>
                )}
                <h3 className="text-xl font-black">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  {price === 0
                    ? <span className="text-3xl font-black">Free</span>
                    : <><span className="text-3xl font-black">${price}</span><span className="pb-1 text-sm text-slate-400">/mo</span></>
                  }
                </div>
                {interval === 'yearly' && price > 0 && <p className="text-xs text-emerald-400">billed ${price * 12}/yr</p>}
                <p className="mt-1 text-xs text-slate-500">{plan.executions} executions</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400">✓</span>{f}
                    </li>
                  ))}
                </ul>
                {plan.key === 'trial' ? (
                  <Link href={plan.ctaHref!} className="mt-5 rounded-xl border border-emerald-400/40 py-2.5 text-center text-sm font-bold text-emerald-300 hover:bg-emerald-400/10">
                    {plan.cta}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCheckout(plan.key)}
                    disabled={loading === plan.key}
                    className={['mt-5 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-60', plan.featured ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'border border-white/15 text-slate-100 hover:border-emerald-400/40'].join(' ')}
                  >
                    {loading === plan.key ? 'Loading…' : plan.cta}
                  </button>
                )}
              </article>
            );
          })}
        </div>
        <p className="mt-4 text-center text-xs text-slate-600">No credit card required for Trial · Overage $0.001/execution · Cancel anytime</p>
      </section>

      <hr className="border-white/10" />

      {/* ── Skill Packs ── */}
      <section id="skills" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black">Skill Pack Add-ons</h2>
          <p className="mt-2 text-sm text-slate-400">
            Add governed AI capabilities on top of any plan.
            <Link href="/marketplace/skills" className="ml-2 text-emerald-400 hover:underline">See full skills list →</Link>
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SKILL_PACKS.map((pack) => {
            const c = PACK_COLOR[pack.color] ?? 'border-slate-700 text-slate-300 bg-slate-900';
            const yearlyPrice = Math.round(pack.price * 12 * 0.8);
            return (
              <div key={pack.id} className={`rounded-2xl border p-5 flex flex-col gap-3 ${c}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{pack.icon}</span>
                  <div>
                    <p className="font-bold">{pack.name}</p>
                    <p className="text-xs opacity-70">{pack.desc}</p>
                  </div>
                </div>
                <div className="flex items-end gap-1">
                  <span className="text-2xl font-black">${pack.price}</span>
                  <span className="pb-1 text-xs opacity-60">/mo</span>
                </div>
                {interval === 'yearly' && (
                  <p className="text-xs text-emerald-400">or ${yearlyPrice}/yr (save 20%)</p>
                )}
                <Link
                  href={`/api/billing/checkout?plan=${pack.id}&interval=${interval === 'yearly' ? 'yearly' : 'monthly'}`}
                  className="rounded-xl bg-white/10 py-2 text-center text-xs font-bold hover:bg-white/20"
                >
                  Activate Pack →
                </Link>
              </div>
            );
          })}
          {/* Enterprise callout */}
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 flex flex-col justify-between">
            <div>
              <p className="font-bold text-slate-100">Need all packs?</p>
              <p className="mt-1 text-xs text-slate-400">Enterprise plan includes all skill packs + custom builder + SLA + CSM.</p>
            </div>
            <button onClick={() => handleCheckout('enterprise')} className="mt-4 rounded-xl border border-slate-600 py-2 text-xs font-bold text-slate-300 hover:border-emerald-400">
              Start Enterprise pilot →
            </button>
          </div>
        </div>
      </section>

      <hr className="border-white/10" />

      {/* ── App Templates ── */}
      <section id="templates" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-black">App Templates</h2>
            <p className="mt-2 text-sm text-slate-400">One-time purchase — DSG ONE generates your app, pushes to GitHub, returns a Vercel deploy link.</p>
          </div>
          <Link href="/marketplace" className="shrink-0 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-emerald-400">
            Browse all →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => {
            const catStyle = CAT_COLOR[t.category] ?? 'bg-slate-700/40 text-slate-300';
            return (
              <div key={t.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${catStyle}`}>{t.category}</span>
                  <span className={`text-sm font-bold ${t.price === 'FREE' ? 'text-emerald-400' : 'text-slate-100'}`}>{t.price}</span>
                </div>
                <p className="font-semibold text-slate-100">{t.name}</p>
                {t.popular && <span className="text-xs text-amber-400">★ Popular</span>}
              </div>
            );
          })}
        </div>
        <div className="mt-6 text-center">
          <Link href="/marketplace" className="inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-black hover:bg-emerald-400">
            Generate an app now →
          </Link>
        </div>
      </section>

      <hr className="border-white/10" />

      {/* ── Evidence strip ── */}
      <section id="evidence" className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 grid gap-6 md:grid-cols-2 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-400">Production Evidence</p>
            <h2 className="mt-2 text-2xl font-black">6/6 benchmark checks passed — 95% rubric score</h2>
            <p className="mt-3 text-sm text-slate-300">
              DSG is production-tested: connector registration, gateway execution, monitor mode, audit commit, audit events, and audit export — all verified.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pass rate', value: '100%' },
              { label: 'Rubric score', value: '95%' },
              { label: 'Avg latency', value: '2047ms' },
              { label: 'Checks', value: '6 / 6' },
              { label: 'SMT2 invariants', value: '6 / 6' },
              { label: 'Verdict', value: 'PASS' },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-slate-900/60 p-3 text-center">
                <p className="text-lg font-black text-emerald-300">{m.value}</p>
                <p className="text-[10px] text-slate-500">{m.label}</p>
              </div>
            ))}
          </div>
          <div className="md:col-span-2 flex flex-wrap gap-3">
            <Link href="/marketplace/production-evidence" className="rounded-xl border border-emerald-400/40 px-5 py-2.5 text-sm font-bold text-emerald-300 hover:bg-emerald-400/10">
              View full evidence →
            </Link>
            <Link href="/gateway/monitor?orgId=org-smoke" className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-bold text-slate-300 hover:border-emerald-400">
              Open gateway monitor →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="border-t border-white/10 py-14 text-center">
        <p className="text-2xl font-black">Ready to get started?</p>
        <p className="mt-2 text-slate-400">Try the interactive demo or start your free trial — no credit card required.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <Link href="/login" className="rounded-2xl bg-emerald-500 px-8 py-4 font-bold text-black hover:bg-emerald-400">
            Start free trial →
          </Link>
          <Link href="/marketplace" className="rounded-2xl border border-slate-700 px-8 py-4 font-bold text-slate-300 hover:border-emerald-400">
            Browse templates →
          </Link>
          <Link href="/demo" className="rounded-2xl border border-slate-700 px-8 py-4 font-bold text-slate-300 hover:border-emerald-400">
            See demo →
          </Link>
        </div>
      </section>

    </main>
  );
}
