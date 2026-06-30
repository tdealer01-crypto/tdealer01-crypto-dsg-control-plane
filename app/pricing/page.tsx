'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: string;
  billingPeriod: 'one-time' | 'monthly';
  features: string[];
  cta: string;
  checkoutLink: string;
}

export default function PricingPage() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/delivery-proof/pricing')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && data.tiers) setTiers(data.tiers);
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
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-3">Pricing</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            AI Governance, Designed to Scale
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            From free tier lead magnet to enterprise-grade delivery proof scanning and compliance auditing.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {tiers.map((tier) => {
            const isPopular = tier.id === 'unlimited';
            return (
              <div
                key={tier.id}
                className={`rounded-2xl border transition-all ${
                  isPopular
                    ? 'border-emerald-400/50 bg-emerald-400/10 ring-1 ring-emerald-400/30'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="bg-emerald-400/20 border-b border-emerald-400/30 px-4 py-2">
                    <p className="text-xs font-bold text-emerald-300 text-center uppercase tracking-[0.1em]">
                      ⭐ Most Popular
                    </p>
                  </div>
                )}

                {/* Tier content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{tier.description}</p>

                  {/* Price */}
                  <div className="mt-6 mb-6">
                    <div className="text-4xl font-bold text-white">
                      {tier.price}
                      <span className="text-lg text-slate-400 ml-2">
                        {tier.billingPeriod === 'monthly' ? '/mo' : 'one-time'}
                      </span>
                    </div>
                  </div>

                  {/* CTA */}
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

                  {/* Features */}
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
          })}
        </div>

        {/* FAQ / Info Section */}
        <div className="max-w-2xl mx-auto border border-white/10 rounded-2xl bg-white/[0.02] p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-emerald-300">
                <span>Can I use the Free tier for production?</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 pl-4">
                Yes! The Free tier includes all core proof scanning features. The 1 scan/month limit is a lead magnet to encourage upgrades for teams running frequent scans.
              </p>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-emerald-300">
                <span>Can I upgrade or downgrade anytime?</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 pl-4">
                Absolutely. Monthly plans can be changed or cancelled at any time. Pro Scan ($49 one-time) purchases are non-refundable but add to your monthly quota.
              </p>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-emerald-300">
                <span>What does &quot;unlimited scans&quot; include?</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 pl-4">
                Unlimited Proof scans, white-label report branding, team access for up to 5 users, multi-project dashboard, audit export in JSON/CSV formats, email + Slack notifications, and priority email support.
              </p>
            </details>

            <details className="group cursor-pointer">
              <summary className="flex items-center justify-between font-semibold text-white hover:text-emerald-300">
                <span>Do you offer enterprise pricing?</span>
                <span className="transition group-open:rotate-180">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 pl-4">
                Yes. Contact our sales team for custom quotes, unlimited executions, dedicated Slack channel, monthly compliance reviews, and custom connector integrations.
              </p>
            </details>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-12">
          <p className="text-slate-400 mb-4">Ready to prove your AI governance?</p>
          <div className="flex gap-4 justify-center flex-wrap">
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
