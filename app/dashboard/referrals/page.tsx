'use client';

import { useEffect, useState } from 'react';

type Referral = {
  code: string;
  clicks: number;
  signups: number;
  conversions: number;
  created_at: string;
};

const BASE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

export default function ReferralsPage() {
  const [referral, setReferral] = useState<Referral | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/referrals')
      .then((r) => r.json())
      .then((d) => { if (d.referral) setReferral(d.referral); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  function copy() {
    if (!referral) return;
    navigator.clipboard.writeText(`${BASE_URL}/?ref=${referral.code}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const referralUrl = referral ? `${BASE_URL}/?ref=${referral.code}` : '';

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-black text-slate-100">Referral Program</h1>
      <p className="mt-2 text-sm text-slate-400">
        Share your link — everyone who signs up through it gets a 14-day trial, and you earn $50 credit when they upgrade
      </p>

      {loading && (
        <div className="mt-8 animate-pulse rounded-2xl bg-slate-800 h-32" />
      )}

      {!loading && referral && (
        <>
          {/* Referral link box */}
          <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <p className="text-xs uppercase tracking-widest text-emerald-400">Your referral link</p>
            <div className="mt-3 flex items-center gap-3">
              <code className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-slate-950 px-4 py-3 text-sm text-emerald-200">
                {referralUrl}
              </code>
              <button
                onClick={copy}
                className="shrink-0 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-black hover:bg-emerald-400"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Code: <span className="font-mono text-slate-300">{referral.code}</span></p>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-3 gap-4">
            {[
              { label: 'Link clicks', value: referral.clicks },
              { label: 'Signups', value: referral.signups },
              { label: 'Upgrades', value: referral.conversions },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center">
                <p className="text-3xl font-black text-slate-100">{stat.value}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="font-bold text-slate-100">How it works</h2>
            <ol className="mt-4 space-y-3 text-sm text-slate-400">
              <li><span className="font-bold text-emerald-400">1.</span> Share your link with friends or your team</li>
              <li><span className="font-bold text-emerald-400">2.</span> They sign up through the link → 14-day trial</li>
              <li><span className="font-bold text-emerald-400">3.</span> When they upgrade → you earn <strong className="text-slate-200">$50 account credit</strong></li>
              <li><span className="font-bold text-emerald-400">4.</span> No limit on the number of referrals</li>
            </ol>
          </div>

          {/* Share buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=Try%20DSG%20ONE%20%E2%80%94%20AI%20governance%20%2B%20approval%20workflow%20for%20teams&url=${encodeURIComponent(referralUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Share on X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
            >
              Share on LinkedIn
            </a>
          </div>
        </>
      )}
    </div>
  );
}
