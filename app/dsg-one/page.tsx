'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: string;
  billingPeriod: 'monthly' | 'none';
  features: string[];
  cta: string;
  checkoutLink: string;
  highlight?: boolean;
}

function TierCard({ tier }: { tier: PricingTier }) {
  const isPopular = tier.highlight === true;
  return (
    <div
      className={`rounded-2xl border transition-all ${
        isPopular
          ? 'border-emerald-400/50 bg-emerald-400/10 ring-1 ring-emerald-400/30 scale-105'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      {isPopular && (
        <div className="bg-emerald-400/20 border-b border-emerald-400/30 px-4 py-2">
          <p className="text-xs font-bold text-emerald-300 text-center uppercase tracking-[0.1em]">
            ⭐ Recommended
          </p>
        </div>
      )}
      <div className="p-8">
        <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
        <p className="text-sm text-slate-400 mt-2">{tier.description}</p>
        <div className="mt-8 mb-8">
          <div className="text-5xl font-bold text-white">
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
          className={`w-full inline-block text-center px-6 py-3 rounded-xl font-bold transition mb-8 ${
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
              <span className="text-emerald-400 mt-0.5 flex-shrink-0">✓</span>
              <span className="text-sm text-slate-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function DSGOneLanding() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dsg/v1/dsg-one-pricing')
      .then((r) => r.json())
      .then((data) => {
        setTiers(data.tiers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block mb-4">
            <span className="text-emerald-400 text-sm font-bold uppercase tracking-[0.1em] bg-emerald-400/10 px-4 py-1 rounded-full border border-emerald-400/30">
              🚀 DSG ONE Launch
            </span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6">
            Don't Trust AI. <span className="text-emerald-400">Verify Every Decision.</span>
          </h1>
          <p className="text-xl text-slate-300 mb-4">
            The control plane for AI operations across your entire organization.
          </p>
          <p className="text-lg text-slate-400 mb-12">
            Monitor. Verify. Audit. Optimize. One platform for AI accountability.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a
              href="#pricing"
              className="px-8 py-3 bg-emerald-400 text-emerald-950 rounded-xl font-bold hover:bg-emerald-300 transition"
            >
              View Pricing
            </a>
            <a
              href="https://dsg.pics"
              className="px-8 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 border border-white/20 transition"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/5">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            The 4 Pillars of DSG ONE
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                emoji: '👀',
                title: 'Monitor',
                description: 'See every AI operation in your live dashboard',
              },
              {
                emoji: '✅',
                title: 'Verify',
                description: 'Prevent mistakes before AI acts with policy enforcement',
              },
              {
                emoji: '📜',
                title: 'Audit',
                description: 'Prove every decision with tamper-proof audit trails',
              },
              {
                emoji: '📈',
                title: 'Optimize',
                description: 'Control costs and reduce risk with spending insights',
              },
            ].map((pillar) => (
              <div key={pillar.title} className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-400/50 transition">
                <p className="text-4xl mb-3">{pillar.emoji}</p>
                <h3 className="text-xl font-bold text-white mb-2">{pillar.title}</h3>
                <p className="text-slate-400">{pillar.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Simple, Transparent Pricing
          </h2>
          {loading ? (
            <div className="text-center text-slate-400">Loading pricing...</div>
          ) : tiers.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8 auto-rows-max">
              {tiers.map((tier) => (
                <TierCard key={tier.id} tier={tier} />
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-400">Unable to load pricing</div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-emerald-400/10 border-t border-emerald-400/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Take Control of Your AI Operations?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Every AI decision has an owner. DSG ONE proves it.
          </p>
          <a
            href="/signup?plan=pro&trial=true"
            className="inline-block px-8 py-4 bg-emerald-400 text-emerald-950 rounded-xl font-bold hover:bg-emerald-300 transition text-lg"
          >
            Start 14-Day Free Trial
          </a>
        </div>
      </section>
    </main>
  );
}
