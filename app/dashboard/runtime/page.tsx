'use client';

import { useEffect, useMemo, useState } from 'react';
import { MissionCards } from '../../../components/runtime/mission-cards';
import { StreamConsole } from '../../../components/runtime/stream-console';
import type {
  RuntimeSummaryCard,
  StreamConsoleMessage,
} from '../../../lib/runtime/dashboard-contract';

type LedgerResponse = {
  ok: boolean;
  items: Array<{
    id: string;
    request_id: string;
    sequence: number;
    epoch: number;
    action: string;
    input_hash: string;
    decision: string;
    reason: string;
    effect_id?: string | null;
    entry_hash: string;
    created_at: string;
  }>;
  checkpoints?: Array<{
    sequence: number;
    epoch: number;
    state_hash: string;
    entry_hash: string;
    created_at: string;
  }>;
};

function normalizeSummary(input: any): RuntimeSummaryCard {
  const approvalsRecent = input?.approvals?.recent || input?.approvals_recent || [];
  const effectsRecent = input?.effects?.recent || input?.effects_recent || [];
  const ledgerRecent = input?.ledger?.recent || input?.ledger_recent || [];

  return {
    ...input,
    approvals: {
      open: input?.approvals?.open ?? input?.approvals_open ?? 0,
      used:
        input?.approvals?.used ??
        approvalsRecent.filter((x: any) => x?.status === 'used').length,
      recent: approvalsRecent,
    },
    effects: {
      committed:
        input?.effects?.committed ??
        effectsRecent.filter((x: any) => x?.status === 'committed').length,
      recent: effectsRecent,
    },
    ledger: {
      count: input?.ledger?.count ?? ledgerRecent.length,
      recent: ledgerRecent,
    },
    agents: input?.agents || [],
  };
}

function buildConsoleMessages(
  summary: RuntimeSummaryCard | null,
  ledger: LedgerResponse | null
): StreamConsoleMessage[] {
  const items: StreamConsoleMessage[] = [];

  if (summary?.approvals?.recent) {
    for (const item of summary.approvals.recent) {
      items.push({
        id: `approval-${item.id}`,
        kind: 'approval',
        request_id: item.request_id,
        title: `Approval ${item.status.toUpperCase()}`,
        body: `${item.action || 'unknown'} • expires ${item.expires_at ? new Date(item.expires_at).toLocaleString() : '-'}`,
        created_at: item.used_at || item.approved_at || new Date().toISOString(),
        meta: item,
      });
    }
  }

  if (summary?.effects?.recent) {
    for (const item of summary.effects.recent) {
      items.push({
        id: `effect-${item.effect_id}`,
        kind: 'effect',
        request_id: item.request_id,
        title: `Effect ${item.status.toUpperCase()}`,
        body: `${item.action || 'unknown'} • ${item.effect_id}`,
        created_at: item.updated_at,
        meta: item,
      });
    }
  }

  if (summary?.ledger?.recent) {
    for (const item of summary.ledger.recent) {
      items.push({
        id: `decision-${item.entry_hash}`,
        kind: 'decision',
        sequence: item.sequence,
        title: `${item.decision} • seq ${item.sequence}`,
        body: `${item.action} • ${item.reason}`,
        created_at: item.created_at,
        meta: item,
      });
    }
  }

  if (ledger?.items) {
    for (const item of ledger.items.slice(0, 10)) {
      items.push({
        id: `ledger-${item.entry_hash}`,
        kind: 'intent',
        request_id: item.request_id,
        sequence: item.sequence,
        title: `Ledger seq ${item.sequence}`,
        body: `${item.action} • ${item.decision}`,
        created_at: item.created_at,
        meta: item,
      });
    }
  }

  return items
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 40);
}

export default function RuntimeDashboardPage() {
  const [summary, setSummary] = useState<RuntimeSummaryCard | null>(null);
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    try {
      setError(null);
      const [summaryRes, ledgerRes] = await Promise.all([
        fetch('/api/runtime-summary', { cache: 'no-store' }),
        fetch('/api/ledger?limit=20', { cache: 'no-store' }),
      ]);

      const summaryJson = await summaryRes.json();
      const ledgerJson = await ledgerRes.json();

      if (!summaryRes.ok) {
        throw new Error(summaryJson?.error || 'Failed to load runtime summary');
      }
      if (!ledgerRes.ok) {
        throw new Error(ledgerJson?.error || 'Failed to load ledger');
      }

      setSummary(normalizeSummary(summaryJson));
      setLedger(ledgerJson);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    const id = window.setInterval(loadAll, 5000);
    return () => window.clearInterval(id);
  }, []);

  const consoleMessages = useMemo(
    () => buildConsoleMessages(summary, ledger),
    [summary, ledger]
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-cyan-400">
              DSG ONE Runtime Room
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Live Spine Console</h1>
            <p className="mt-2 max-w-3xl text-sm text-neutral-400">
              Truth state, approvals, effects, ledger, and live runtime signals in one room.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-300">
            <div>Status: {loading ? 'Loading…' : 'Live'}</div>
            <div>Refresh: every 5s</div>
            {summary?.truth_state ? (
              <div>Epoch {summary.truth_state.epoch} • Seq {summary.truth_state.sequence}</div>
            ) : (
              <div>No truth state</div>
            )}
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <MissionCards summary={summary} />

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-medium">Live Stream Console</h2>
                <span className="rounded-full bg-cyan-500/15 px-3 py-1 text-xs text-cyan-300">
                  spine feed
                </span>
              </div>
              <StreamConsole items={consoleMessages} />
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
              <h2 className="mb-4 text-lg font-medium">Ledger Recent</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-neutral-400">
                    <tr>
                      <th className="pb-3 pr-4">Seq</th>
                      <th className="pb-3 pr-4">Action</th>
                      <th className="pb-3 pr-4">Decision</th>
                      <th className="pb-3 pr-4">Reason</th>
                      <th className="pb-3 pr-4">Entry Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(ledger?.items || []).map((row) => (
                      <tr key={row.entry_hash} className="border-t border-white/5">
                        <td className="py-3 pr-4">{row.sequence}</td>
                        <td className="py-3 pr-4">{row.action}</td>
                        <td className="py-3 pr-4">{row.decision}</td>
                        <td className="py-3 pr-4">{row.reason}</td>
                        <td className="py-3 pr-4 font-mono text-xs text-neutral-400">
                          {row.entry_hash.slice(0, 16)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
              <h2 className="mb-4 text-lg font-medium">Truth State</h2>
              <pre className="overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-neutral-300">
                {JSON.stringify(summary?.truth_state || null, null, 2)}
              </pre>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
              <h2 className="mb-4 text-lg font-medium">Approvals Recent</h2>
              <div className="space-y-3">
                {(summary?.approvals?.recent || []).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/5 bg-black/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.action || 'unknown'}</div>
                      <div className="text-xs uppercase text-neutral-400">{item.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      req {item.request_id || '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
              <h2 className="mb-4 text-lg font-medium">Effects Recent</h2>
              <div className="space-y-3">
                {(summary?.effects?.recent || []).map((item) => (
                  <div
                    key={item.effect_id}
                    className="rounded-2xl border border-white/5 bg-black/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{item.action || 'unknown'}</div>
                      <div className="text-xs uppercase text-neutral-400">{item.status}</div>
                    </div>
                    <div className="mt-1 break-all font-mono text-xs text-neutral-400">
                      {item.effect_id}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
              <h2 className="mb-4 text-lg font-medium">Agents</h2>
              <div className="space-y-3">
                {(summary?.agents || []).map((agent) => (
                  <div
                    key={agent.id}
                    className="rounded-2xl border border-white/5 bg-black/20 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-xs uppercase text-neutral-400">{agent.status}</div>
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      {agent.last_used_at
                        ? new Date(agent.last_used_at).toLocaleString()
                        : 'Never used'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
