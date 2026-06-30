'use client';

import { useEffect, useState } from 'react';

interface SLACountdownProps {
  expiresAt: string;
  status: string;
  createdAt?: string;
}

function getRemainingMs(expiresAt: string): number {
  return new Date(expiresAt).getTime() - Date.now();
}

function formatDuration(ms: number): string {
  if (ms <= 0) return 'EXPIRED';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m left`;
  if (m > 0) return `${m}m ${s}s left`;
  return `${s}s left`;
}

function getUrgencyTier(remainingMs: number, totalMs?: number): 'routine' | 'review' | 'escalation' | 'expired' {
  if (remainingMs <= 0) return 'expired';
  const thirtyMin = 30 * 60 * 1000;
  const fourHours = 4 * 60 * 60 * 1000;
  if (remainingMs < thirtyMin) return 'escalation';
  if (totalMs) {
    const pct = remainingMs / totalMs;
    if (pct < 0.2) return 'escalation';
    if (pct < 0.6) return 'review';
    return 'routine';
  }
  if (remainingMs < thirtyMin) return 'escalation';
  if (remainingMs < fourHours) return 'review';
  return 'routine';
}

const TIER_STYLES = {
  routine:    'text-emerald-600 bg-emerald-50 border-emerald-200',
  review:     'text-yellow-700 bg-yellow-50 border-yellow-300',
  escalation: 'text-red-700 bg-red-50 border-red-300 font-bold animate-pulse',
  expired:    'text-gray-500 bg-gray-50 border-gray-200 line-through',
};

export function SLACountdown({ expiresAt, status, createdAt }: SLACountdownProps) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(expiresAt));

  useEffect(() => {
    if (status !== 'pending') return;
    const interval = setInterval(() => {
      setRemainingMs(getRemainingMs(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  if (status !== 'pending') {
    return (
      <span className="text-xs text-gray-400">
        ⏰ {new Date(expiresAt).toLocaleString()}
      </span>
    );
  }

  const totalMs = createdAt
    ? new Date(expiresAt).getTime() - new Date(createdAt).getTime()
    : undefined;

  const tier = getUrgencyTier(remainingMs, totalMs);
  const label = formatDuration(remainingMs);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${TIER_STYLES[tier]}`}
      title={`Expires: ${new Date(expiresAt).toLocaleString()}`}
    >
      {tier === 'escalation' ? '🔴' : tier === 'review' ? '🟡' : tier === 'expired' ? '⚫' : '🟢'}
      {label}
    </span>
  );
}
