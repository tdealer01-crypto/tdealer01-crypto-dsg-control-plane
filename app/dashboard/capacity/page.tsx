'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/Skeleton';

type Capacity = {
  plan_key: string;
  billing_interval: string;
  subscription_status: string;
  billing_period: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  executions: number;
  included_executions: number;
  remaining_executions: number;
  utilization: number;
  overage_executions: number;
  projected_amount_usd: number;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function CapacityPage() {
  const [data, setData] = useState<Capacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    fetch('/api/capacity', { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!alive) return;
        if (!ok) throw new Error(json.error || 'Failed to load capacity');
        setData(json);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load capacity');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setError('');
    window.location.reload();
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Capacity"
          description="Plan quota, remaining executions, utilization, and projected overage"
        />

        {error && (
          <Card variant="error" className="mt-6">
            <p className="text-sm font-medium">Error loading capacity</p>
            <p className="mt-1 text-xs opacity-90">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-3 text-xs font-semibold text-red-300 hover:text-red-200 underline"
            >
              Try again
            </button>
          </Card>
        )}

        {loading && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        )}

        {!loading && !data && !error && (
          <EmptyState
            title="No capacity data"
            description="Unable to retrieve capacity information"
          />
        )}

        {data && (
          <>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <StatCard label="Plan" value={data.plan_key} />
              <StatCard label="Executions" value={String(data.executions)} />
              <StatCard label="Remaining" value={String(data.remaining_executions)} variant="info" />
              <StatCard label="Projected" value={`$${data.projected_amount_usd}`} variant="warning" />
            </div>

            <Card className="mt-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</p>
                  <p className="mt-2 text-sm text-slate-100">{data.subscription_status}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Billing Interval</p>
                  <p className="mt-2 text-sm text-slate-100">{data.billing_interval}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Billing Period</p>
                  <p className="mt-2 text-sm text-slate-100">{data.billing_period}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Utilization</p>
                  <p className="mt-2 text-sm text-slate-100">{data.utilization}%</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Period Start</p>
                  <p className="mt-2 text-sm text-slate-100">{formatDate(data.current_period_start)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Current Period End</p>
                  <p className="mt-2 text-sm text-slate-100">{formatDate(data.current_period_end)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Overage Executions</p>
                  <p className="mt-2 text-sm text-slate-100">{data.overage_executions}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
