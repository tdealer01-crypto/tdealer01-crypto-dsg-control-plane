'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type ConnectionStatus = 'idle' | 'connecting' | 'success' | 'error';

export default function StripeConnectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const errorParam = searchParams.get('error');

  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (code && state) {
      // OAuth callback - exchange code for token
      handleOAuthCallback(code, state);
    } else if (errorParam) {
      setStatus('error');
      setErrorMessage(`OAuth error: ${errorParam}`);
    }
  }, [code, state, errorParam]);

  const handleOAuthCallback = async (code: string, state: string) => {
    setStatus('connecting');
    try {
      const response = await fetch('/api/stripe-app/oauth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      });

      if (response.ok) {
        setStatus('success');
        // Redirect after success
        setTimeout(() => {
          router.push('/dashboard/stripe-app?success=true');
        }, 2000);
      } else {
        const error = await response.json();
        setStatus('error');
        setErrorMessage(error.message || 'OAuth callback failed');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to connect Stripe account');
    }
  };

  const handleConnectClick = async () => {
    setStatus('connecting');
    try {
      const response = await fetch('/api/stripe-app/oauth/authorize', {
        method: 'GET',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStatus('error');
        setErrorMessage('Failed to get authorization URL');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to initiate OAuth');
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4 px-6 py-8">
      <h1 className="text-2xl font-bold text-white">Connect Stripe Account</h1>
      <p className="text-slate-400">
        Click below to authorize DSG to manage your Stripe governance
      </p>

      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
        {status === 'success' && (
          <div className="space-y-4">
            <div className="rounded bg-green-900/50 p-4">
              <p className="text-sm font-semibold text-green-300">Connection Successful!</p>
              <p className="mt-1 text-sm text-green-200">Redirecting to dashboard...</p>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="rounded bg-red-900/50 p-4">
              <p className="text-sm font-semibold text-red-300">Connection Failed</p>
              <p className="mt-1 text-sm text-red-200">{errorMessage}</p>
            </div>
            <button
              onClick={handleConnectClick}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-slate-700"
              disabled={false}
            >
              Try Again
            </button>
          </div>
        )}

        {status === 'idle' && (
          <button
            onClick={handleConnectClick}
            className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Connect with Stripe
          </button>
        )}

        {status === 'connecting' && (
          <button
            className="w-full rounded bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300"
            disabled
          >
            Connecting...
          </button>
        )}
      </div>

      <div className="text-sm text-slate-500">
        <p className="font-medium text-slate-300">This will authorize:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Read charge details</li>
          <li>Read/write payment intents</li>
          <li>Read payouts</li>
          <li>Read refunds</li>
        </ul>
      </div>
    </div>
  );
}
