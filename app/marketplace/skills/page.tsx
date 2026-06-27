'use client';

import { useState } from 'react';
import Link from 'next/link';

type Bundle = {
  id: string;
  name: string;
  tagline: string;
  price: number;
  priceLabel: string;
  skills: string[];
  icon: string;
  color: string;
  featured?: boolean;
};

const BUNDLES: Bundle[] = [
  {
    id: 'finance',
    name: 'Finance Governance Pack',
    tagline: 'AI-controlled approvals, audit trails, and payment gating for finance teams',
    price: 199,
    priceLabel: '$199/mo add-on',
    icon: '🏦',
    color: 'emerald',
    featured: true,
    skills: [
      'approval-workflow — multi-step human-in-loop approval',
      'payment-gate — block payments above policy threshold',
      'budget-policy — enforce org spending rules',
      'audit-ledger — tamper-proof finance decision log',
      'vendor-check — verify vendor identity before payment',
      'expense-categorizer — auto-tag expenses to GL codes',
      'overspend-alert — real-time budget breach detection',
      'evidence-pack — exportable audit bundle for CFO review',
    ],
  },
  {
    id: 'dev',
    name: 'Dev Automation Pack',
    tagline: 'Governed CI/CD, code review, and deployment gating for engineering teams',
    price: 99,
    priceLabel: '$99/mo add-on',
    icon: '⚙️',
    color: 'blue',
    skills: [
      'deploy-gate — block unsafe deployments at CI/CD',
      'code-review — AI-assisted PR review with policy',
      'security-scan — detect secrets and CVEs before merge',
      'dependency-check — enforce approved package versions',
      'release-proof — signed evidence for every release',
      'rollback-trigger — auto-revert on health check failure',
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance & Legal Pack',
    tagline: 'Policy enforcement, document review, and regulatory evidence for compliance teams',
    price: 249,
    priceLabel: '$249/mo add-on',
    icon: '⚖️',
    color: 'violet',
    skills: [
      'policy-enforcer — runtime policy check on every action',
      'gdpr-guard — detect and block PII in AI outputs',
      'contract-review — flag risky clauses in agreements',
      'sla-monitor — track and alert SLA breaches',
      'risk-scorer — real-time risk score for AI decisions',
      'compliance-report — auto-generate audit reports',
      'data-classification — tag data by sensitivity level',
    ],
  },
  {
    id: 'ops',
    name: 'Operations Pack',
    tagline: 'Incident response, runbooks, and infrastructure governance for SRE teams',
    price: 149,
    priceLabel: '$149/mo add-on',
    icon: '🚀',
    color: 'amber',
    skills: [
      'incident-responder — auto-create tickets and alerts',
      'runbook-executor — governed playbook automation',
      'capacity-planner — forecast and alert on resource usage',
      'cost-optimizer — find and flag cloud waste',
      'health-checker — multi-endpoint health monitoring',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Bundle',
    tagline: 'All 4 packs + custom skill builder + dedicated support',
    price: 599,
    priceLabel: '$599/mo — all packs included',
    icon: '🏢',
    color: 'rose',
    featured: false,
    skills: [
      'Everything in Finance, Dev, Compliance, and Ops packs',
      'custom-skill-builder — build org-specific skills with AI',
      'sso-integration — SAML/OIDC skill access control',
      'dedicated onboarding — white-glove setup session',
      'SLA: 4h response time',
    ],
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; badge: string; btn: string }> = {
  emerald: { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', badge: 'bg-emerald-500/20 text-emerald-300', btn: 'bg-emerald-500 text-black hover:bg-emerald-400' },
  blue:    { border: 'border-blue-500/40',    bg: 'bg-blue-500/10',    badge: 'bg-blue-500/20 text-blue-300',    btn: 'bg-blue-500 text-white hover:bg-blue-400' },
  violet:  { border: 'border-violet-500/40',  bg: 'bg-violet-500/10',  badge: 'bg-violet-500/20 text-violet-300',btn: 'bg-violet-500 text-white hover:bg-violet-400' },
  amber:   { border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   badge: 'bg-amber-500/20 text-amber-300',  btn: 'bg-amber-500 text-black hover:bg-amber-400' },
  rose:    { border: 'border-rose-500/40',    bg: 'bg-rose-500/10',    badge: 'bg-rose-500/20 text-rose-300',    btn: 'bg-rose-500 text-white hover:bg-rose-400' },
};

function BundleCard({ bundle }: { bundle: Bundle }) {
  const [expanded, setExpanded] = useState(false);
  const c = COLOR_MAP[bundle.color];

  return (
    <div className={`rounded-2xl border ${c.border} ${bundle.featured ? c.bg : 'bg-slate-900'} p-6 flex flex-col gap-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-3xl">{bundle.icon}</p>
          <h3 className="mt-2 text-lg font-bold">{bundle.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{bundle.tagline}</p>
        </div>
        {bundle.featured && (
          <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${c.badge}`}>
            Popular
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xl font-black">{bundle.priceLabel}</p>
      </div>

      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-left text-xs text-slate-400 hover:text-slate-200"
      >
        {expanded ? '▲ Hide skills' : `▼ ${bundle.skills.length} skills included`}
      </button>

      {expanded && (
        <ul className="space-y-1 rounded-xl bg-slate-950 p-3">
          {bundle.skills.map((s) => (
            <li key={s} className="text-xs text-slate-300">
              <span className="mr-2 text-emerald-400">✓</span>{s}
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/api/billing/checkout?plan=${bundle.id}_skills&interval=monthly`}
        className={`mt-auto rounded-xl py-3 text-center text-sm font-bold transition ${c.btn}`}
      >
        Activate {bundle.name.split(' ')[0]} Pack →
      </Link>
    </div>
  );
}

export default function SkillsMarketplacePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <p className="text-center text-xs uppercase tracking-widest text-emerald-400">Skills Marketplace</p>
        <h1 className="mt-2 text-center text-3xl font-black md:text-5xl">
          Add superpowers to your agents
        </h1>
        <p className="mt-4 text-center text-slate-400 max-w-2xl mx-auto">
          Curated skill bundles for every team. Each pack adds governed, policy-aware AI capabilities
          that work within your existing approval and audit workflows.
        </p>

        <div className="mt-4 flex justify-center gap-3 flex-wrap">
          <Link href="/demo" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-emerald-400">
            See demo →
          </Link>
          <Link href="/pricing" className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-emerald-400">
            Base plans →
          </Link>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {BUNDLES.map((b) => <BundleCard key={b.id} bundle={b} />)}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
          <p className="text-2xl font-black">Need a custom skill?</p>
          <p className="mt-2 text-slate-400">We build org-specific governed skills in 1–2 weeks. Enterprise plan includes unlimited custom skills.</p>
          <Link
            href="/request-access"
            className="mt-6 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-bold text-black hover:bg-emerald-400"
          >
            Talk to us →
          </Link>
        </div>
      </div>
    </main>
  );
}
