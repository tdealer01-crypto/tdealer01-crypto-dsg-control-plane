'use client';

import { useEffect, useState } from 'react';

export default function FramerEncodingProofCheckoutPage() {
  const [status, setStatus] = useState('Preparing secure checkout…');

  useEffect(() => {
    let cancelled = false;

    async function startCheckout() {
      try {
        const response = await fetch('/api/billing/checkout', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: 'pro',
            interval: 'monthly',
            source: 'framer-encoding-proof',
          }),
        });

        if (cancelled) return;

        if (response.status === 401) {
          const next = encodeURIComponent('/framer/encoding-proof/checkout');
          window.location.assign(`/login?next=${next}`);
          return;
        }

        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.url) {
          setStatus(body?.error || 'Checkout is temporarily unavailable.');
          return;
        }

        window.location.assign(String(body.url));
      } catch {
        if (!cancelled) setStatus('Checkout is temporarily unavailable.');
      }
    }

    void startCheckout();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 h-12 w-12 rounded-2xl border border-cyan-300/30 bg-cyan-300/10 flex items-center justify-center text-xl">
          ✓
        </div>
        <h1 className="text-2xl font-semibold">DSG Encoding Proof Gate</h1>
        <p className="mt-3 text-sm text-slate-300">{status}</p>
        <p className="mt-5 text-xs text-slate-500">
          Secure billing is handled by the existing DSG ONE Stripe subscription flow.
        </p>
      </section>
    </main>
  );
}
