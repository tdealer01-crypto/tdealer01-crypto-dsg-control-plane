'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle } from 'lucide-react';
import { SLACountdown } from '@/components/ui/SLACountdown';

interface ApprovalItem {
  id: string;
  agentId: string;
  action: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  expiresAt: string;
}

interface TaskItem {
  id: string;
  job_id: string | null;
  status: string;
  task_count: number;
  created_at: string;
}

interface WorkQueueData {
  totalPending: number;
  avgSlaRemainingMs: number | null;
  approvals: ApprovalItem[];
  tasks: TaskItem[];
}

const PRIORITY_COLORS: Record<string, string> = {
  high:   'bg-red-100 text-red-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low:    'bg-green-100 text-green-800',
};

function formatMs(ms: number | null): string {
  if (!ms) return '—';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function WorkQueuePage() {
  const [data, setData] = useState<WorkQueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/work-queue');
      if (res.ok) setData(await res.json());
    } catch (err) {
      console.error('Failed to load work queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleDecision = async (id: string, decision: 'approved' | 'rejected') => {
    setProcessing(id);
    try {
      await fetch(`/api/approval-queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });
      await load();
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Work Queue</h1>
            <p className="text-gray-600">งานทั้งหมดที่รอดำเนินการ — approvals + task plans</p>
          </div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="self-start sm:self-auto rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition disabled:opacity-40"
          >
            {loading ? 'กำลังโหลด…' : 'รีเฟรช ↻'}
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-gray-500 text-sm">รอดำเนินการทั้งหมด</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">
              {loading ? '—' : (data?.totalPending ?? 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-gray-500 text-sm">Approvals ที่รออนุมัติ</p>
            <p className="text-3xl font-bold text-yellow-600 mt-1">
              {loading ? '—' : (data?.approvals?.length ?? 0)}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-5">
            <p className="text-gray-500 text-sm">เฉลี่ย SLA คงเหลือ</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {loading ? '—' : formatMs(data?.avgSlaRemainingMs ?? null)}
            </p>
          </div>
        </div>

        {/* Pending Approvals */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Pending Approvals{' '}
              {!loading && data && (
                <span className="text-base font-normal text-gray-500">
                  ({data.approvals.length})
                </span>
              )}
            </h2>
            <Link href="/dashboard/approvals" className="text-sm text-blue-600 hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(n => (
                <div key={n} className="bg-white rounded-lg shadow-sm p-5 animate-pulse h-24" />
              ))}
            </div>
          ) : !data?.approvals?.length ? (
            <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-500">
              ✅ ไม่มี approvals ที่รอดำเนินการ
            </div>
          ) : (
            <div className="space-y-3">
              {data.approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-yellow-400 flex items-center justify-between flex-wrap gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${PRIORITY_COLORS[approval.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                        {approval.priority.toUpperCase()}
                      </span>
                      <span className="font-semibold text-gray-900 truncate">{approval.action}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                      <span>Agent: <code className="font-mono text-xs">{approval.agentId}</code></span>
                      <SLACountdown
                        expiresAt={approval.expiresAt}
                        status={approval.status}
                        createdAt={approval.createdAt}
                      />
                    </div>
                  </div>

                  {approval.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => void handleDecision(approval.id, 'approved')}
                        disabled={processing === approval.id}
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        อนุมัติ
                      </button>
                      <button
                        onClick={() => void handleDecision(approval.id, 'rejected')}
                        disabled={processing === approval.id}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition"
                      >
                        <XCircle className="w-4 h-4" />
                        ปฏิเสธ
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pending Tasks */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Pending Tasks{' '}
              {!loading && data && (
                <span className="text-base font-normal text-gray-500">
                  ({data.tasks.length})
                </span>
              )}
            </h2>
            <Link href="/dashboard/tasks" className="text-sm text-blue-600 hover:underline">
              ดูทั้งหมด →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(n => (
                <div key={n} className="bg-white rounded-lg shadow-sm p-5 animate-pulse h-16" />
              ))}
            </div>
          ) : !data?.tasks?.length ? (
            <div className="bg-white rounded-lg shadow-sm p-10 text-center text-gray-500">
              ✅ ไม่มี task plans ที่รอดำเนินการ
            </div>
          ) : (
            <div className="space-y-3">
              {data.tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-400 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 text-sm">
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2.5 py-0.5 rounded-full border border-yellow-200">
                        {task.status}
                      </span>
                      <code className="font-mono text-gray-500 text-xs truncate">{task.id}</code>
                      <span className="text-gray-400 text-xs">📦 {task.task_count} tasks</span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/tasks"
                    className="text-blue-600 text-sm hover:underline shrink-0"
                  >
                    ดูรายละเอียด →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
