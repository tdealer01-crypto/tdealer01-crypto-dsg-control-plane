'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type Status = 'connecting' | 'success' | 'error';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      setStatus('error');
      setErrorMessage(errorDescription || error);
      return;
    }

    if (!code) {
      setStatus('error');
      setErrorMessage('No authorization code received from Stripe.');
      return;
    }

    fetch('/api/stripe-app/oauth/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus('success');
          setTimeout(() => router.push('/dashboard/stripe-app?connected=true'), 1500);
        } else {
          const data = await res.json() as { message?: string };
          setStatus('error');
          setErrorMessage(data.message || 'Installation failed.');
        }
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('Network error — please try again.');
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        {status === 'connecting' && (
          <>
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-violet-500" />
            <h1 className="text-xl font-semibold text-white">Connecting to Stripe…</h1>
            <p className="mt-2 text-sm text-slate-400">Authorizing DSG Governance Gate</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-900/40 text-2xl">
              ✓
            </div>
            <h1 className="text-xl font-semibold text-white">Connected!</h1>
            <p className="mt-2 text-sm text-slate-400">Taking you to setup…</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-900/40 text-2xl">
              ✕
            </div>
            <h1 className="text-xl font-semibold text-white">Connection Failed</h1>
            <p className="mt-2 text-sm text-red-300">{errorMessage}</p>
            <a
              href="https://marketplace.stripe.com"
              className="mt-6 inline-block rounded-lg bg-slate-700 px-5 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              Return to Stripe Marketplace
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export default function StripeOAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-violet-500" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
