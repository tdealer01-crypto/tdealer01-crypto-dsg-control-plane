'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

type CheckoutPlan = 'pro' | 'enterprise';

function isCheckoutPlan(value: string): value is CheckoutPlan {
  return value === 'pro' || value === 'enterprise';
}

const PLAN_COPY: Record<CheckoutPlan, { name: string; price: string; included: string }> = {
  pro: {
    name: 'DSG Gate Pro',
    price: '$99/month',
    included: '5,000 compliance and governance evaluations included',
  },
  enterprise: {
    name: 'DSG Gate Enterprise',
    price: '$499/month',
    included: 'Unlimited governed evaluations while the subscription is active',
  },
};

export default function DirectCheckoutPage() {
  const params = useParams<{ plan: string }>();
  const rawPlan = String(params?.plan || '').toLowerCase();
  const plan = useMemo(
    () => (isCheckoutPlan(rawPlan) ? rawPlan : null),
    [rawPlan],
  );
  const [status, setStatus] = useState<'starting' | 'error' | 'invalid'>('starting');
  const [message, setMessage] = useState('Preparing secure checkout…');

  useEffect(() => {
    if (!plan) {
      setStatus('invalid');
      setMessage('This plan is not available for automatic checkout.');
      return;
    }

    let cancelled = false;

    async function beginCheckout() {
      try {
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan, interval: 'monthly' }),
          cache: 'no-store',
        });

        if (cancelled) return;

        if (response.status === 401) {
          window.location.href = `/login?next=${encodeURIComponent(`/checkout/${plan}`)}`;
          return;
        }

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.url) {
          setStatus('error');
          setMessage(data?.error || 'Checkout is temporarily unavailable.');
          return;
        }

        window.location.href = data.url;
      } catch {
        if (!cancelled) {
          setStatus('error');
          setMessage('Checkout is temporarily unavailable.');
        }
      }
    }

    void beginCheckout();
    return () => {
      cancelled = true;
    };
  }, [plan]);

  const copy = plan ? PLAN_COPY[plan] : null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-slate-100">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Secure subscription
        </p>
        <h1 className="mt-3 text-3xl font-bold">
          {copy?.name || 'DSG Gate Checkout'}
        </h1>
        {copy && (
          <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-2xl font-bold text-white">{copy.price}</p>
            <p className="mt-1 text-sm text-slate-300">{copy.included}</p>
          </div>
        )}

        <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          {status === 'starting' && (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
          )}
          <p className={status === 'error' || status === 'invalid' ? 'text-amber-300' : 'text-slate-300'}>
            {message}
          </p>
        </div>

        {(status === 'error' || status === 'invalid') && (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/pricing#dsg-gate"
              className="rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold text-emerald-950 hover:bg-emerald-400"
            >
              Back to pricing
            </Link>
            <Link
              href="/dashboard/billing"
              className="rounded-xl border border-slate-700 px-4 py-2.5 font-semibold text-slate-200 hover:border-slate-500"
            >
              Open billing
            </Link>
          </div>
        )}

        <p className="mt-8 text-xs text-slate-500">
          Subscription access is granted only after a verified Stripe webhook updates the workspace entitlement.
        </p>
      </div>
    </main>
  );
}
