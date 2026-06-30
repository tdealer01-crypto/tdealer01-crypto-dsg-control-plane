'use client';

import Link from 'next/link';
import { useState } from 'react';

interface UpgradeCTAProps {
  isFreeUser?: boolean;
  currentTier?: 'free' | 'pro_scan' | 'unlimited';
  runId: string;
}

export function UpgradeCTA({ isFreeUser = true, currentTier = 'free', runId }: UpgradeCTAProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || currentTier === 'unlimited') {
    return null;
  }

  const upgradeOptions = [
    {
      tier: 'pro_scan',
      name: 'Pro Scan',
      price: '$49',
      period: 'one-time',
      description: 'Get 1 additional scan',
      features: ['1 more scan', 'Priority support', 'Webhook integration'],
      href: '/billing?item=delivery_proof_scan_49',
      primary: false,
    },
    {
      tier: 'unlimited',
      name: 'Unlimited',
      price: '$199',
      period: '/month',
      description: 'Unlimited scans + team access',
      features: ['Unlimited scans', 'Team access (5 users)', 'White-label reports', 'API key management'],
      href: '/billing?plan=business',
      primary: true,
    },
  ];

  return (
    <div className="mt-8 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-400/10 to-emerald-400/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-[11px] uppercase tracking-[0.3em] text-amber-300 font-semibold">
            💡 Unlock More Scans
          </p>
          <h3 className="mt-2 text-lg font-bold text-white">
            {isFreeUser
              ? "You've used your free scan for this month"
              : 'Ready to scale your proofs?'}
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {isFreeUser
              ? 'Upgrade to get more scans and share reports with your entire team.'
              : 'Get unlimited scans, white-label reports, and team collaboration.'}
          </p>

          {/* Feature highlights */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-emerald-400">✓</span>
              <span>No credit card in free tier</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-emerald-400">✓</span>
              <span>Pause or cancel anytime</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-emerald-400">✓</span>
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="text-emerald-400">✓</span>
              <span>Full API access included</span>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white transition"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      {/* Upgrade options */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {upgradeOptions.map((option) => (
          <Link
            key={option.tier}
            href={option.href}
            className={`group rounded-xl p-4 transition flex flex-col ${
              option.primary
                ? 'bg-emerald-400 text-emerald-950 hover:bg-emerald-300'
                : 'border border-emerald-400/40 bg-emerald-400/10 text-emerald-100 hover:border-emerald-400/60 hover:bg-emerald-400/15'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold">{option.name}</span>
              <span className="text-sm font-semibold">{option.price}</span>
            </div>
            <p className="text-xs opacity-90 mt-1">{option.period}</p>
            <p className="text-xs mt-2 opacity-90">{option.description}</p>
            <div className="mt-3 space-y-1">
              {option.features.map((feat) => (
                <div key={feat} className="text-xs flex items-center gap-1.5 opacity-80">
                  <span className="text-base leading-none">→</span>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
            <span className={`mt-3 font-semibold text-sm transition ${
              option.primary
                ? 'text-emerald-950 group-hover:text-emerald-900'
                : 'text-emerald-300 group-hover:text-emerald-200'
            }`}>
              {option.price.includes('one-time') ? 'Buy Now' : 'Start Free Trial'} →
            </span>
          </Link>
        ))}
      </div>

      {/* Social proof */}
      <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/5">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Share this proof</span> with auditors, clients, or your team.
          Every share drives more awareness of your AI governance commitment — and viewers can try the free scan themselves.
        </p>
      </div>
    </div>
  );
}
