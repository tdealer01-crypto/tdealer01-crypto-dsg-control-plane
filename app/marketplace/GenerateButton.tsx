'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  templateId: string;
  goal: string;
  successCriteria: string[];
  price: number;
  label: string;
}

export default function GenerateButton({ templateId, goal, successCriteria, price, label }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      if (price === 0) {
        // Free template — generate directly
        const res = await fetch('/api/dsg-bridge/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal, successCriteria }),
        });
        if (res.status === 401) {
          router.push('/login?next=/marketplace');
          return;
        }
        const data = await res.json();
        const jobId = data.jobId ?? data.id;
        router.push(jobId ? `/dashboard?jobId=${jobId}` : '/dashboard');
      } else {
        // Paid template — go through Stripe Checkout
        const res = await fetch('/api/marketplace/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateId }),
        });
        if (res.status === 401) {
          router.push('/login?next=/marketplace');
          return;
        }
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setLoading(false);
        }
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Starting…' : label}
    </button>
  );
}
