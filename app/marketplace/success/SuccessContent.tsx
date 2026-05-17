'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Props {
  sessionId?: string;
  templateId?: string;
}

export default function SuccessContent({ sessionId, templateId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<'verifying' | 'generating' | 'done' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your payment…');

  useEffect(() => {
    if (!sessionId || !templateId) {
      setStatus('error');
      return;
    }

    setMessage('Payment confirmed! Generating your app…');
    setStatus('generating');

    fetch('/api/marketplace/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, templateId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.jobId) {
          setStatus('done');
          setTimeout(() => router.push(`/dashboard?jobId=${data.jobId}`), 1500);
        } else {
          setStatus('error');
        }
      })
      .catch(() => setStatus('error'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'error') {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
        <div className="text-4xl">&#x26D4;</div>
        <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-slate-400">Payment could not be verified. Please contact support.</p>
        <Link
          href="/marketplace"
          className="mt-6 inline-block rounded-xl bg-slate-700 px-6 py-3 font-semibold hover:bg-slate-600"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  if (status === 'done') {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-slate-900 p-10 text-center">
        <div className="text-4xl">&#x2705;</div>
        <h1 className="mt-4 text-2xl font-bold">App is generating!</h1>
        <p className="mt-3 text-slate-400">Redirecting to your dashboard…</p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />
      <p className="mt-6 text-lg font-semibold text-slate-300">{message}</p>
    </div>
  );
}
