'use client';

import { useState } from 'react';

type AgentResult = {
  ok: boolean;
  goal?: string;
  taskType?: string;
  agentResult?: Record<string, unknown>;
  error?: string;
};

export default function TrinityAgentPage() {
  const [goal, setGoal] = useState('');
  const [taskType, setTaskType] = useState<'checkout' | 'revenue_event' | 'webhook_sim'>('revenue_event');
  const [payload, setPayload] = useState('{"amount":0}');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AgentResult | null>(null);

  async function runAgent() {
    setLoading(true);
    setResult(null);
    try {
      const parsedPayload = JSON.parse(payload || '{}');
      const res = await fetch('/api/agent-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, taskType, payload: parsedPayload }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setResult({ ok: false, error: (e as Error).message || '执行失败' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Agent Revenue — Trinity</h1>
      <p className="text-slate-400 text-sm">
        AI เอเจนต์ควบคุมสร้างรายได้อัตโนมัติผ่าน DSG/Trinity วิ劉oralization
      </p>

      <div className="grid gap-3">
        <label className="text-sm text-slate-300">🎯 เป้าหมายของเอเจนต์</label>
        <input
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="เช่น ลด churn, สร้าง upsell, หรือรับงานใหม่"
        />

        <label className="text-sm text-slate-300">🧩 ประเภทงาน</label>
        <select
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm"
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as AgentResult['taskType'])}
        >
          <option value="revenue_event">revenue_event: บันทึกtyr revenue ลงระบบ</option>
          <option value="checkout">checkout: สร้างลิงก์ชำระเงิน</option>
        </select>

        <label className="text-sm text-slate-300">📦 Payload (JSON)</label>
        <textarea
          className="w-full rounded border border-slate-700 bg-slate-900 p-2 text-sm font-mono"
          rows={4}
          value={payload}
          onChange={(e) => setPayload(e.target.value)}
        />

        <button
          onClick={runAgent}
          disabled={loading}
          className="rounded bg-indigo-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? ' executing...' : '▶️ รันเอเจนต์'}
        </button>
      </div>

      {result && (
        <pre className="rounded border border-slate-700 bg-slate-900 p-3 text-xs text-slate-200 whitespace-pre-wrap">
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
