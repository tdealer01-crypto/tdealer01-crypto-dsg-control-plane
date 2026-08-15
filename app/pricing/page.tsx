'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: string;
  billingPeriod: 'one-time' | 'monthly' | 'none';
  features: string[];
  cta: string;
  checkoutLink: string;
  highlight?: boolean;
}

function TierCard({ tier, popularId }: { tier: PricingTier; popularId: string }) {
  const isPopular = tier.id === popularId || tier.highlight === true;
  return (
    <div
      className={`rounded-2xl border transition-all ${
        isPopular
          ? 'border-emerald-400/50 bg-emerald-400/10 ring-1 ring-emerald-400/30'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      {isPopular && (
        <div className="bg-emerald-400/20 border-b border-emerald-400/30 px-4 py-2">
          <p className="text-xs font-bold text-emerald-300 text-center uppercase tracking-[0.1em]">
            ⭐ Most Popular
          </p>
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold text-white">{tier.name}</h3>
        <p className="text-sm text-slate-400 mt-1">{tier.description}</p>
        <div className="mt-6 mb-6">
          <div className="text-4xl font-bold text-white">
            {tier.price}
            {tier.billingPeriod !== 'none' && (
              <span className="text-lg text-slate-400 ml-2">
                {tier.billingPeriod === 'monthly' ? '/mo' : 'one-time'}
              </span>
            )}
          </div>
        </div>
        <a
          href={tier.checkoutLink}
          className={`w-full inline-block text-center px-4 py-3 rounded-xl font-bold transition mb-6 ${
            isPopular
              ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
              : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
          }`}
        >
          {tier.cta}
        </a>
        <ul className="space-y-3">
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <span className="text-sm text-slate-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const [deliveryTiers, setDeliveryTiers] = useState<PricingTier[]>([]);
  const [gateTiers, setGateTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/delivery-proof/pricing').then((r) => r.json()),
      fetch('/api/dsg/v1/pricing').then((r) => r.json()),
    ])
      .then(([delivery, gate]) => {
        if (delivery.ok && delivery.tiers) setDeliveryTiers(delivery.tiers);
        if (gate.ok && gate.tiers) setGateTiers(gate.tiers);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin inline-block h-8 w-8 rounded-full border-4 border-slate-700 border-t-emerald-400"></div>
          <p className="mt-4 text-slate-400">Loading pricing...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-3">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI Governance, Designed to Scale
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Two products — Delivery Proof Scanning and the DSG Gate API — so teams can inspect evidence before expanding production usage.
          </p>
          <Link
            href="/start"
            className="mt-6 inline-flex rounded-xl border border-emerald-300/30 bg-emerald-300/10 px-5 py-3 text-sm font-bold text-emerald-100 hover:border-emerald-300/60"
          >
            See connection and install paths →
          </Link>
        </div>

        <section id="dsg-gate" className="mb-20">
          <div className="mb-8">
            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 mb-3">
              DSG Gate API
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              Deterministic AI Governance API
            </h2>
            <p className="text-slate-400 max-w-xl">
              Same input and policy context produce a replayable decision path with evidence hashes for later verification.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {gateTiers.map((tier) => (
              <TierCard key={tier.id} tier={tier} popularId="pro" />
            ))}
          </div>
        </section>

        <section id="delivery-proof" className="mb-20">
          <div className="mb-8">
            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-3">
              Delivery Proof
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
              AI Delivery Proof Scanning
            </h2>
            <p className="text-slate-400 max-w-xl">
              Generate a shareable readiness report for the checks the scanner actually runs, including homepage, auth, health, and available evidence-chain checks.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {deliveryTiers.map((tier) => (
              <TierCard key={tier.id} tier={tier} popularId="unlimited" />
            ))}
          </div>
        </section>

        <div className="max-w-2xl mx-auto border border-white/10 rounded-2xl bg-white/[0.02] p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-emerald-300">
                <span>What evidence does the DSG Gate API return?</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 pl-4">
                Gate responses can include a <code className="text-emerald-300">proofHash</code>,{' '}
                <code className="text-emerald-300">constraintSetHash</code>, and{' '}
                <code className="text-emerald-300">inputHash</code> so the recorded decision can be checked against its input and constraint context.
              </p>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-emerald-300">
                <span>Can I use the Free tier for production?</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 pl-4">
                Use the Free tier to validate fit and the evidence flow within its published quota. Production suitability still depends on your own availability, security, compliance, and support requirements.
              </p>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-emerald-300">
                <span>Can I upgrade or downgrade anytime?</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 pl-4">
                Monthly plan changes and cancellation follow the checkout and billing terms presented for the active plan. One-time purchases follow the terms shown at checkout.
              </p>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-emerald-300">
                <span>Do you offer enterprise integration?</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 pl-4">
                Yes. Use the start page to see which connection paths are ready now and which managed GitHub or Vercel integration paths require access setup before they are advertised as one-click installs.
              </p>
            </details>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-slate-400 mb-4">Ready to connect DSG ONE?</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/start"
              className="px-6 py-3 rounded-xl bg-violet-500 text-white font-bold hover:bg-violet-400 transition"
            >
              Start and connect →
            </Link>
            <Link
              href="/delivery-proof"
              className="px-6 py-3 rounded-xl bg-emerald-400 text-emerald-950 font-bold hover:bg-emerald-300 transition"
            >
              Start Free Proof Scan →
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-3 rounded-xl border border-white/20 text-white font-bold hover:border-white/40 transition"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
