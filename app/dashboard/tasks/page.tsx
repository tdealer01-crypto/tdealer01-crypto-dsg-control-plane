'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TaskStatus } from '@/lib/types/task';

interface TaskPlan {
  id: string;
  job_id: string | null;
  workspace_id: string | null;
  status: string;
  plan_hash: string | null;
  task_count: number;
  dependency_count: number;
  created_at: string;
  created_by: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  [TaskStatus.PENDING]:           'bg-yellow-100 text-yellow-800 border-yellow-200',
  [TaskStatus.RUNNING]:           'bg-blue-100 text-blue-800 border-blue-200',
  [TaskStatus.WAITING_APPROVAL]:  'bg-amber-100 text-amber-800 border-amber-200',
  [TaskStatus.COMPLETED]:         'bg-green-100 text-green-800 border-green-200',
  [TaskStatus.FAILED_RETRYABLE]:  'bg-orange-100 text-orange-800 border-orange-200',
  [TaskStatus.FAILED_FINAL]:      'bg-red-100 text-red-800 border-red-200',
  [TaskStatus.DLQ]:               'bg-red-200 text-red-900 border-red-300',
  [TaskStatus.CANCELLED]:         'bg-gray-100 text-gray-600 border-gray-200',
  [TaskStatus.EXPIRED]:           'bg-gray-100 text-gray-500 border-gray-200',
  [TaskStatus.LOCKED]:            'bg-purple-100 text-purple-800 border-purple-200',
  [TaskStatus.RETRYING]:          'bg-orange-50 text-orange-700 border-orange-200',
};

const FILTER_TABS = ['all', 'PENDING', 'RUNNING', 'WAITING_APPROVAL', 'COMPLETED', 'FAILED_FINAL'] as const;
type FilterTab = typeof FILTER_TABS[number];

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');

  const fetchTasks = async (status: FilterTab) => {
    try {
      setLoading(true);
      const param = status === 'all' ? '' : `&status=${status}`;
      const res = await fetch(`/api/tasks?limit=50${param}`);
      const data = await res.json();
      setTasks(data.tasks ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTasks(filter);
  }, [filter]);

  const counts = {
    pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
    running: tasks.filter(t => t.status === TaskStatus.RUNNING || t.status === TaskStatus.RETRYING).length,
    waitingApproval: tasks.filter(t => t.status === TaskStatus.WAITING_APPROVAL).length,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Task Plans</h1>
            <p className="text-gray-600">แผนงานการดำเนินการของ DSG agents</p>
          </div>
          <button
            onClick={() => void fetchTasks(filter)}
            disabled={loading}
            className="self-start sm:self-auto rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition disabled:opacity-40"
          >
            {loading ? 'กำลังโหลด…' : 'รีเฟรช ↻'}
          </button>
        </div>

        {/* KPI strip */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex gap-8 flex-wrap">
            <div>
              <p className="text-gray-600 text-sm">รอดำเนินการ</p>
              <p className="text-3xl font-bold text-yellow-600">{counts.pending}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">กำลังรัน</p>
              <p className="text-3xl font-bold text-blue-600">{counts.running}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">รอการอนุมัติ</p>
              <p className="text-3xl font-bold text-amber-600">{counts.waitingApproval}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">ทั้งหมด</p>
              <p className="text-3xl font-bold text-gray-900">{total}</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                filter === tab
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-600'
              }`}
            >
              {tab === 'all' ? 'ทั้งหมด' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Task list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-lg shadow-sm p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-20 rounded-full bg-gray-200" />
                  <div className="h-5 w-48 rounded bg-gray-200" />
                  <div className="ml-auto h-4 w-24 rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-lg font-semibold text-gray-700">ไม่มี task plans</p>
            <p className="mt-1 text-sm text-gray-500">
              Task plans จะปรากฏที่นี่เมื่อ agents สร้าง execution plan
            </p>
            <button
              onClick={() => setFilter('all')}
              className="mt-4 px-4 py-2 rounded-lg border border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition"
            >
              ดูทั้งหมด
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-sm p-5 border-l-4 border-blue-400 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${STATUS_STYLES[task.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                      >
                        {task.status}
                      </span>
                      <code className="text-xs font-mono text-gray-500 truncate max-w-[200px]">
                        {task.id}
                      </code>
                    </div>

                    <div className="text-sm text-gray-600 space-x-3 mt-1">
                      {task.job_id && (
                        <span>
                          Job:{' '}
                          <Link
                            href={`/dashboard/tasks/${task.job_id}`}
                            className="font-mono text-blue-600 hover:underline"
                          >
                            {task.job_id.slice(0, 16)}…
                          </Link>
                        </span>
                      )}
                      <span>📦 {task.task_count} tasks</span>
                      {task.dependency_count > 0 && (
                        <span>🔗 {task.dependency_count} deps</span>
                      )}
                      {task.plan_hash && (
                        <span className="font-mono text-gray-400 text-xs" title={task.plan_hash}>
                          hash: {task.plan_hash.slice(0, 8)}…
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-400 shrink-0">
                    <div>{timeAgo(task.created_at)}</div>
                    {task.created_by && (
                      <div className="text-gray-300 mt-0.5">{task.created_by}</div>
                    )}
                    {task.status === TaskStatus.WAITING_APPROVAL && (
                      <Link
                        href="/dashboard/approvals"
                        className="mt-1 inline-block text-amber-600 font-semibold hover:underline"
                      >
                        อนุมัติ →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
