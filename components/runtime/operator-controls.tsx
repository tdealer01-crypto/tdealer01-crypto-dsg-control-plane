'use client';

import { useState } from 'react';

type OperatorControlsProps = {
  agentId: string;
};

type ActionKind =
  | 'chat'
  | 'cli'
  | 'remote_browser'
  | 'voice_live'
  | 'mcp'
  | 'operator';

export function OperatorControls({ agentId }: OperatorControlsProps) {
  const [channel, setChannel] = useState<ActionKind>('operator');
  const [action, setAction] = useState('memory.write');
  const [requestId, setRequestId] = useState(`req_${Date.now()}`);
  const [payload, setPayload] = useState('{"note":"manual operator event"}');
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  async function issueIntent() {
    try {
      setLoading(true);
      setResult('');

      const parsedPayload = JSON.parse(payload);

      const res = await fetch('/api/channel/intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer YOUR_AGENT_KEY`,
        },
        body: JSON.stringify({
          agent_id: agentId,
          request_id: requestId,
          action,
          channel,
          next_v: parsedPayload.next_v || {
            balance: parsedPayload.balance ?? 1000000,
            invariant_tag: parsedPayload.invariant_tag || 'transfer',
          },
          next_t: parsedPayload.next_t || Date.now(),
          next_g: parsedPayload.next_g || 'zone:origin',
          next_i: parsedPayload.next_i || 'net:operator',
          context: {
            operator_console: true,
            source: 'runtime-live-room',
          },
        }),
      });

      const json = await res.json();
      setResult(JSON.stringify(json, null, 2));
    } catch (error) {
      setResult(
        JSON.stringify(
          {
            ok: false,
            error: error instanceof Error ? error.message : 'Unexpected error',
          },
          null,
          2
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.22em] text-orange-400">
          Operator Console
        </p>
        <h3 className="mt-2 text-lg font-medium">Manual Intent Issuer</h3>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2 text-sm">
          <span className="text-neutral-400">Channel</span>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value as ActionKind)}
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          >
            <option value="operator">operator</option>
            <option value="chat">chat</option>
            <option value="cli">cli</option>
            <option value="remote_browser">remote_browser</option>
            <option value="voice_live">voice_live</option>
            <option value="mcp">mcp</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-neutral-400">Action</span>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-neutral-400">Request ID</span>
          <input
            value={requestId}
            onChange={(e) => setRequestId(e.target.value)}
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-white"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-neutral-400">Payload JSON</span>
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            rows={8}
            className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-white"
          />
        </label>

        <button
          onClick={issueIntent}
          disabled={loading}
          className="rounded-2xl bg-orange-500 px-4 py-3 font-medium text-black transition hover:bg-orange-400 disabled:opacity-50"
        >
          {loading ? 'Issuing…' : 'Issue Intent'}
        </button>

        <pre className="overflow-x-auto rounded-2xl bg-black/30 p-4 text-xs text-neutral-300">
          {result || 'No result yet.'}
        </pre>
      </div>
    </div>
  );
}
