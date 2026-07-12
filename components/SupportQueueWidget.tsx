'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SupportStats {
  total: number;
  pending: number;
  in_progress: number;
  sla_at_risk: number;
}

export default function SupportQueueWidget() {
  const [stats, setStats] = useState<SupportStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    sla_at_risk: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/support/stats', {
          cache: 'no-store',
          credentials: 'include',
        });

        if (!response.ok) {
          // Gracefully handle missing endpoint or DB table
          setStats({ total: 0, pending: 0, in_progress: 0, sla_at_risk: 0 });
          setLoading(false);
          return;
        }

        const data = await response.json();
        setStats(data.stats ?? data);
      } catch {
        // Endpoint not available yet - show empty state
        setStats({ total: 0, pending: 0, in_progress: 0, sla_at_risk: 0 });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const allEmpty = stats.total === 0 && !error;

  return (
    <div className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.03] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-blue-300/50">
            Customer Support
          </p>
          <p className="mt-1 text-lg font-semibold text-blue-50">
            Support Queue
          </p>
        </div>
        <Link
          href="/dashboard/support/tickets"
          className="rounded-lg border border-blue-400/20 px-3 py-1 text-xs font-medium text-blue-300 transition-colors hover:border-blue-400/40 hover:bg-blue-400/5"
        >
          View All
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-10 w-full animate-pulse rounded-lg bg-white/[0.06]"
            />
          ))}
        </div>
      ) : allEmpty ? (
        <div className="mt-6 rounded-xl border border-blue-400/10 px-4 py-8 text-center">
          <p className="text-3xl">📧</p>
          <p className="mt-2 text-sm font-semibold text-slate-300">
            No support tickets yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Create your first ticket to get started
          </p>
          <Link
            href="/dashboard/support/tickets/create"
            className="mt-4 inline-block rounded-lg border border-blue-400/20 bg-blue-400/[0.06] px-4 py-2 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-400/10"
          >
            Create Ticket
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {/* Pending */}
          <div className="flex items-center justify-between rounded-xl border border-yellow-500/20 bg-yellow-500/[0.06] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-yellow-400" />
              <span className="text-sm text-slate-400">Pending</span>
            </div>
            <span className="text-lg font-bold text-yellow-300">
              {stats.pending}
            </span>
          </div>

          {/* In Progress */}
          <div className="flex items-center justify-between rounded-xl border border-blue-400/20 bg-blue-400/[0.06] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-sm text-slate-400">In Progress</span>
            </div>
            <span className="text-lg font-bold text-blue-300">
              {stats.in_progress}
            </span>
          </div>

          {/* SLA at Risk */}
          {stats.sla_at_risk > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-red-400/20 bg-red-400/[0.06] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-red-400" />
                <span className="text-sm text-slate-400">SLA At Risk</span>
              </div>
              <span className="text-lg font-bold text-red-300">
                {stats.sla_at_risk}
              </span>
            </div>
          )}

          {/* Total */}
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
            <span className="text-sm text-slate-500">Total Tickets</span>
            <span className="text-xl font-bold text-blue-200">
              {stats.total}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Link
          href="/dashboard/support/tickets"
          className="flex-1 rounded-xl border border-blue-400/20 bg-blue-400/[0.06] px-3 py-2 text-center text-xs font-semibold text-blue-200 transition-colors hover:bg-blue-400/15"
        >
          View Tickets →
        </Link>
        <Link
          href="/dashboard/support/tickets/create"
          className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:text-slate-200"
        >
          + New
        </Link>
      </div>
    </div>
  );
}
