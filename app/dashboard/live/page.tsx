'use client';

import { useEffect, useMemo, useState } from 'react';
import { LiveRoom } from '../../../components/runtime/live-room';
import type { RuntimeSummaryCard, StreamConsoleMessage } from '../../../lib/runtime/dashboard-contract';

type MemoryRecentResponse = {
  ok: boolean;
  items: Array<{
    id: string;
    request_id?: string | null;
    memory_key: string;
    memory_value: Record<string, unknown>;
    lineage_hash: string;
    created_at: string;
  }>;
};

type RuntimeSummaryResponse = {
  ok: boolean;
  truth_state: RuntimeSummaryCard['truth_state'];
  approvals_open: number;
  approvals_recent: NonNullable<RuntimeSummaryCard['approvals']>['recent'];
  effects_recent: NonNullable<RuntimeSummaryCard['effects']>['recent'];
  ledger_recent: NonNullable<RuntimeSummaryCard['ledger']>['recent'];
};

function normalizeSummary(input: RuntimeSummaryResponse | null): RuntimeSummaryCard | null {
  if (!input) return null;

  return {
    truth_state: input.truth_state,
    approvals: {
      open: input.approvals_open || 0,
      recent: input.approvals_recent || [],
    },
    effects: {
      committed: (input.effects_recent || []).filter((item) => item.status === 'committed').length,
      recent: input.effects_recent || [],
    },
    ledger: {
      recent: input.ledger_recent || [],
    },
  };
}

function buildLiveStream(summary: RuntimeSummaryCard | null): StreamConsoleMessage[] {
  const items: StreamConsoleMessage[] = [];

  for (const entry of summary?.ledger?.recent || []) {
    items.push({
      id: `ledger-${entry.entry_hash}`,
      kind: 'decision',
      sequence: entry.sequence,
      title: `${entry.decision} • seq ${entry.sequence}`,
      body: `${entry.action} • ${entry.reason}`,
      created_at: entry.created_at,
      meta: entry,
    });
  }

  for (const entry of summary?.effects?.recent || []) {
    items.push({
      id: `effect-${entry.effect_id}`,
      kind: 'effect',
      request_id: entry.request_id,
      title: `Effect ${entry.status.toUpperCase()}`,
      body: `${entry.action} • ${entry.effect_id}`,
      created_at: entry.updated_at,
      meta: entry,
    });
  }

  for (const entry of summary?.approvals?.recent || []) {
    items.push({
      id: `approval-${entry.id}`,
      kind: 'approval',
      request_id: entry.request_id,
      title: `Approval ${entry.status.toUpperCase()}`,
      body: `${entry.action || 'action'} • expires ${new Date(entry.expires_at).toLocaleString()}`,
      created_at: entry.used_at || entry.approved_at || entry.expires_at,
      meta: entry as Record<string, unknown>,
    });
  }

  return items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 50);
}

export default function LiveDashboardPage() {
  const [summary, setSummary] = useState<RuntimeSummaryCard | null>(null);
  const [memoryRecent, setMemoryRecent] = useState<MemoryRecentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    try {
      setError(null);

      const [summaryRes, memoryRes] = await Promise.all([
        fetch('/api/runtime-summary', { cache: 'no-store' }),
        fetch('/api/memory/recent', { cache: 'no-store' }),
      ]);

      const summaryJson = await summaryRes.json();
      const memoryJson = await memoryRes.json();

      if (!summaryRes.ok) {
        throw new Error(summaryJson?.error || 'Failed to load runtime summary');
      }

      if (!memoryRes.ok) {
        throw new Error(memoryJson?.error || 'Failed to load memory feed');
      }

      setSummary(normalizeSummary(summaryJson));
      setMemoryRecent(memoryJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const id = window.setInterval(loadAll, 3000);
    return () => window.clearInterval(id);
  }, []);

  const summaryWithMemory = useMemo(() => {
    if (!summary) return null;
    return {
      ...summary,
      memory_recent: memoryRecent?.items || [],
    };
  }, [summary, memoryRecent]);

  const streamItems = useMemo(() => buildLiveStream(summary), [summary]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-fuchsia-400">DSG ONE Live Mode</p>
            <h1 className="mt-2 text-3xl font-semibold">Voice / CLI / Browser Room</h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-400">
              ห้องเดียวสำหรับดู channel ทั้งหมดที่วิ่งผ่าน Spine: chat, CLI, remote browser,
              voice live, MCP, tools, and operator interventions.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-300">
            <div>Status: {loading ? 'Loading…' : 'Live'}</div>
            <div>Refresh: every 3s</div>
            {summary?.truth_state ? (
              <div>Epoch {summary.truth_state.epoch} • Seq {summary.truth_state.sequence}</div>
            ) : (
              <div>No truth state</div>
            )}
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        <LiveRoom summary={summaryWithMemory} streamItems={streamItems} />
      </div>
    </div>
  );
}
