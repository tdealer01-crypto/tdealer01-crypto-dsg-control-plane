'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

type LinkResult = {
  ok: true;
  agent_id: string;
  installation_id: number;
};

type LinkError = {
  error: string;
};

type LinkResponse = LinkResult | LinkError;

export default function GitHubAppSetupPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const rawId = searchParams.get('installation_id');
  const installationId = rawId ? Number(rawId) : null;

  const [connecting, setConnecting] = useState(false);
  const [success, setSuccess] = useState<LinkResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Validate the installation_id on mount — show an error immediately if missing
  useEffect(() => {
    if (rawId && (!Number.isFinite(installationId) || (installationId ?? 0) <= 0)) {
      setErrorMsg('Invalid installation_id in URL.');
    }
  }, [rawId, installationId]);

  if (!rawId || !installationId || !Number.isFinite(installationId) || installationId <= 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="max-w-md rounded-2xl border border-red-500/40 bg-red-500/10 p-10 text-center">
          <p className="text-4xl">&#x26D4;</p>
          <h1 className="mt-4 text-xl font-bold">Invalid setup link</h1>
          <p className="mt-2 text-sm text-slate-400">
            This URL is missing a valid <code className="text-red-300">installation_id</code>.
            Please install the GitHub App again to get a fresh link.
          </p>
        </div>
      </main>
    );
  }

  async function handleConnect() {
    if (!installationId) return;
    setConnecting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/github-app/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ installation_id: installationId }),
      });

      if (res.status === 401) {
        // Not logged in — redirect to login with return URL
        const returnUrl = encodeURIComponent(`/github-app/setup?installation_id=${installationId}`);
        router.push(`/login?redirect=${returnUrl}`);
        return;
      }

      const json = (await res.json()) as LinkResponse;

      if (!res.ok || 'error' in json) {
        setErrorMsg(('error' in json ? json.error : null) ?? 'Failed to connect. Please try again.');
        return;
      }

      setSuccess(json as LinkResult);
    } catch {
      setErrorMsg('Network error — please try again.');
    } finally {
      setConnecting(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-10 text-center">
          <div className="text-5xl">&#x2705;</div>
          <h1 className="mt-4 text-2xl font-bold text-emerald-300">DSG Gate connected!</h1>
          <p className="mt-3 text-slate-300">
            DSG Gate is now billing to your account. Every PR check counts against your plan.
          </p>
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 px-5 py-4 text-left text-sm text-slate-400 space-y-1">
            <p>
              <span className="text-slate-500">Installation ID:</span>{' '}
              <span className="font-mono text-slate-200">{success.installation_id}</span>
            </p>
            <p>
              <span className="text-slate-500">Agent ID:</span>{' '}
              <span className="font-mono text-slate-200">{success.agent_id}</span>
            </p>
          </div>
          <a
            href="/dashboard"
            className="mt-6 inline-block rounded-xl bg-amber-500 px-6 py-3 font-bold text-black hover:bg-amber-400 transition-colors"
          >
            Go to dashboard &rarr;
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-10">
        <div className="text-center">
          <div className="text-5xl">&#x1F511;</div>
          <h1 className="mt-4 text-2xl font-bold">Connect GitHub App to DSG ONE</h1>
          <p className="mt-3 text-slate-400">
            Installation{' '}
            <span className="font-mono text-amber-400">#{installationId}</span> detected. Link your
            DSG account to start gating PRs.
          </p>
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </div>
        )}

        <div className="mt-8 space-y-3 rounded-xl border border-slate-700 bg-slate-950 px-5 py-4 text-sm text-slate-400">
          <p>Once linked:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>A dedicated <code className="text-amber-300">github-gate</code> agent is created for this installation.</li>
            <li>Every PR check runs against your plan quota — not the app owner&rsquo;s.</li>
            <li>You can view usage on your dashboard at any time.</li>
          </ul>
        </div>

        <button
          disabled={connecting}
          onClick={() => void handleConnect()}
          className="mt-8 w-full rounded-xl bg-amber-500 px-6 py-3 font-bold text-black hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {connecting ? 'Connecting…' : 'Connect my account →'}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500">
          You must be signed in to your DSG ONE account to complete this step.
        </p>
      </div>
    </main>
  );
}
