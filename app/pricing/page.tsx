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
    ctaHref: '/signup',
    badge: null,
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
    badge: null,
    features: ['10,000 executions / mo', 'Everything in Trial', 'Approval workflow', 'Email notifications', 'Priority support'],
  },
  {
    key: 'agency',
    name: 'Agency',
    monthly: 299,
    yearly: 249,
    executions: 'Unlimited projects',
    featured: true,
    cta: 'Get Agency Plan',
    ctaHref: 'https://buy.stripe.com/fZu00k5La7Pt2fVaak3gk01',
    badge: 'Best for agencies',
    features: [
      'Unlimited proof checks / mo',
      'Everything in Pro',
      'White-label Delivery Proof Report',
      'Share link per client project',
      'Multi-project dashboard',
      'Audit export PDF + JSON',
      'Priority support',
    ],
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthly: 999,
    yearly: 849,
    executions: 'Custom',
    featured: false,
    cta: 'Start Enterprise pilot',
    badge: null,
    features: ['Custom quota', 'Everything in Agency', 'All skill packs', 'Custom skill builder', 'SSO + RBAC', 'SLA 4h + CSM'],
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

function signupHref(planKey: string, interval: Interval) {
  const params = new URLSearchParams({ plan: planKey, interval });
  return `/signup?${params.toString()}`;
}

export default function PricingPage() {
  const [interval, setInterval] = useState<Interval>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  function setError(planKey: string, msg: string) {
    setErrors((prev) => ({ ...prev, [planKey]: msg }));
  }

  function clearError(planKey: string) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[planKey];
      return next;
    });
  }

  async function handleCheckout(planKey: string) {
    clearError(planKey);
    setLoading(planKey);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planKey, interval }),
      });
      if (res.status === 401) { router.push(signupHref(planKey, interval)); return; }
      if (res.status === 403) { router.push('/login?next=/dashboard/billing'); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(planKey, data?.error || 'Checkout failed — please try again');
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.url) window.location.href = data.url;
      else setError(planKey, 'Checkout failed — please try again');
    } catch {
      setError(planKey, 'Something went wrong');
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
          <p className="text-xs text-emerald-300">
            🆕 <strong>Agency plan</strong>: white-label Delivery Proof Report + share link per client — ideal สำหรับ agency ที่ใช้ AI ทำงานให้ลูกค้า →{' '}
            <Link href="/delivery-proof" className="underline hover:text-emerald-200">ดู Delivery Proof</Link>
          </p>
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
                {plan.badge && (
                  <span className="absolute right-4 top-4 rounded-full border border-emerald-400/30 bg-emerald-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">{plan.badge}</span>
                )}
                <h3 className="text-xl font-black">{plan.name}</h3>
                <div className="mt-3 flex items-end gap-1">
                  {price === 0
                    ? <span className="text-3xl font-black">Free</span>
                    : <><span className="text-3xl font-black">${price}</span><span className="pb-1 text-sm text-slate-400">/mo</span></>
                  }
                </div>
                {interval === 'yearly' && price > 0 && <p className="text-xs text-emerald-400">billed ${price * 12}/yr</p>}
                <p className="mt-1 text-xs text-slate-500">{plan.executions}</p>
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
                ) : plan.ctaHref ? (
                  <a
                    href={plan.ctaHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={['mt-5 block w-full rounded-xl py-2.5 text-center text-sm font-bold transition', plan.featured ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'border border-white/15 text-slate-100 hover:border-emerald-400/40'].join(' ')}
                  >
                    {plan.cta}
                  </a>
                ) : (
                  <div className="mt-5">
                    <button
                      onClick={() => handleCheckout(plan.key)}
                      disabled={loading === plan.key}
                      className={['w-full rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-60', plan.featured ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'border border-white/15 text-slate-100 hover:border-emerald-400/40'].join(' ')}
                    >
                      {loading === plan.key ? 'Loading…' : plan.cta}
                    </button>
                    {errors[plan.key] && (
                      <p className="mt-1.5 text-xs text-red-400">{errors[plan.key]}</p>
                    )}
                  </div>
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
          <div className="rounded-2xl border border-slate-700 bg-slate-900 p-5 flex flex-col justify-between">
            <div>
              <p className="font-bold text-slate-100">Need all packs?</p>
              <p className="mt-1 text-xs text-slate-400">Enterprise plan includes all skill packs + custom builder + SLA + CSM.</p>
            </div>
            <div className="mt-4">
              <button onClick={() => handleCheckout('enterprise')} disabled={loading === 'enterprise'} className="w-full rounded-xl border border-slate-600 py-2 text-xs font-bold text-slate-300 hover:border-emerald-400 disabled:opacity-60">
                {loading === 'enterprise' ? 'Loading…' : 'Start Enterprise pilot →'}
              </button>
              {errors['enterprise'] && (
                <p className="mt-1.5 text-xs text-red-400">{errors['enterprise']}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <hr className="border-white/10" />

      {/* rest of pricing page intentionally unchanged */}
      <section id="templates" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black">App Templates</h2>
          <p className="mt-2 text-sm text-slate-400">One-click governed application templates.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => (
            <div key={t.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${CAT_COLOR[t.category] ?? 'bg-slate-800 text-slate-300'}`}>{t.category}</span>
                {t.popular && <span className="text-xs text-emerald-300">Popular</span>}
              </div>
              <p className="mt-4 text-lg font-bold">{t.name}</p>
              <p className="mt-1 text-sm text-slate-400">{t.price}</p>
              <Link href="/signup" className="mt-4 inline-flex rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-slate-200 hover:border-emerald-400/40">
                Use template →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── MCP Server — differentiator ── */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">DSG MCP Server</p>
            <h2 className="mt-3 text-2xl font-black">Let Claude gate every action before it ships.</h2>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              Connect DSG ONE as an MCP server inside Claude, Cursor, or any MCP-compatible AI tool. Every tool call routes through the policy gate before execution — approval workflow, audit trail, and evidence chain included. No other compliance vendor offers this.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {[
                'Works with Claude, Cursor, and any MCP client',
                'Gate blocks high-risk actions before they run',
                'Every decision logged with cryptographic evidence hash',
                'Vanta / Sonar don\'t have MCP-native governance',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-400">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/api/mcp" className="rounded-xl border border-emerald-400/30 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-400/10">
                View MCP endpoint →
              </Link>
              <Link href="/signup" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-emerald-300">
                Try on Agency plan →
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 font-mono text-sm text-slate-200">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">MCP server config (claude_desktop_config.json)</p>
            <pre className="overflow-x-auto whitespace-pre-wrap text-xs">{`{
  "mcpServers": {
    "dsg-gate": {
      "command": "npx",
      "args": ["-y", "@dsg/mcp-server"],
      "env": {
        "DSG_API_KEY": "your-api-key",
        "DSG_POLICY": "strict"
      }
    }
  }
}`}</pre>
          </div>
        </div>
      </section>

      <hr className="border-white/10" />

      {/* ── Zenodo DOI trust signal ── */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col gap-6 md:flex-row md:items-center">
          <div className="shrink-0 text-center md:text-left">
            <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Academic credibility</p>
            <p className="mt-2 text-2xl font-black text-white">Zenodo DOI</p>
            <p className="mt-1 font-mono text-xs text-emerald-400">10.5281/zenodo.18225586</p>
          </div>
          <div className="h-px w-full bg-white/10 md:h-24 md:w-px" />
          <div className="flex-1">
            <p className="text-sm leading-7 text-slate-300">
              DSG ONE governance methodology is published on Zenodo — the open-access repository used by CERN and OpenAIRE. Our cryptographic evidence chain and policy engine design are citable as peer-referenced research. This is the kind of academic credibility that Vanta and Sonar can&apos;t claim.
            </p>
            <a
              href="https://doi.org/10.5281/zenodo.18225586"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-xs text-emerald-400 hover:underline"
            >
              View on Zenodo →
            </a>
          </div>
        </div>
      </section>

      <section id="evidence" className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <h2 className="text-2xl font-black">Evidence-ready governance</h2>
          <p className="mt-3 text-sm text-slate-400">Start with a workspace, then connect billing after your first authenticated environment is created.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950">
              Start workspace trial →
            </Link>
            <Link href="/readiness-report" className="inline-flex rounded-xl border border-white/15 px-5 py-3 font-bold text-slate-200 hover:border-emerald-400/40">
              Free proof check →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
