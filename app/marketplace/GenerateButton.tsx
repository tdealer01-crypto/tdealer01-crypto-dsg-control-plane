'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  goal: string;
  successCriteria: string[];
  label: string;
}

export default function GenerateButton({ goal, successCriteria, label }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
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
    } catch {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? 'Starting…' : label}
    </button>
  );
}
