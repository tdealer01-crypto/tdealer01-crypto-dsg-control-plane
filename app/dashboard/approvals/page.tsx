'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAppLanguage } from '@/store/useAppLanguage';
import { SLACountdown } from '@/components/ui/SLACountdown';

const APPROVALS_T = {
  th: {
    title: 'การอนุมัติ',
    subtitle: 'ตรวจสอบและอนุมัติ action ของ agent ก่อนรัน',
    refresh: 'รีเฟรช ↻',
    loading: 'กำลังโหลด…',
    pendingLabel: 'รออนุมัติ',
    totalLabel: 'คำขอทั้งหมด',
    filterAll: 'ทั้งหมด',
    filterPending: 'รออนุมัติ',
    filterApproved: 'อนุมัติแล้ว',
    filterRejected: 'ปฏิเสธแล้ว',
    emptyPendingTitle: 'ไม่มีรายการรออนุมัติ',
    emptyPendingBody: 'เมื่อ AI agent ส่ง STABILIZE decision จะปรากฏที่นี่เพื่อรอการอนุมัติ',
    emptyOtherTitle: (f: string) => `ไม่มีรายการ${f}`,
    emptyOtherBody: 'เปลี่ยนตัวกรองเป็น "ทั้งหมด" เพื่อดูทุกคำขอ',
    viewAll: 'ดูทั้งหมด',
    agentLabel: 'Agent',
    createdLabel: 'สร้างเมื่อ',
    viewDetails: 'ดูรายละเอียด',
    expires: 'หมดอายุ',
    approve: 'อนุมัติ',
    reject: 'ปฏิเสธ',
    approved: '✓ อนุมัติแล้ว',
    rejected: '✗ ปฏิเสธแล้ว',
  },
  en: {
    title: 'Approvals',
    subtitle: 'Review and approve agent actions before execution',
    refresh: 'Refresh ↻',
    loading: 'Loading…',
    pendingLabel: 'Pending Approvals',
    totalLabel: 'Total Requests',
    filterAll: 'All',
    filterPending: 'Pending',
    filterApproved: 'Approved',
    filterRejected: 'Rejected',
    emptyPendingTitle: 'No pending approvals',
    emptyPendingBody: 'When an AI agent submits a STABILIZE decision it will appear here for review.',
    emptyOtherTitle: (f: string) => `No ${f} approvals`,
    emptyOtherBody: 'Switch to "All" to see every approval request.',
    viewAll: 'View all',
    agentLabel: 'Agent',
    createdLabel: 'Created',
    viewDetails: 'View Details',
    expires: '⏰ Expires',
    approve: 'Approve',
    reject: 'Reject',
    approved: '✓ Approved',
    rejected: '✗ Rejected',
  },
};

interface ApprovalRequest {
  id: string;
  agentId: string;
  action: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  expiresAt: string;
  requestedBy: string;
  input?: Record<string, unknown>;
}

export default function ApprovalsPage() {
  const lang = useAppLanguage();
  const t = APPROVALS_T[lang];

  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/approval-queue/pending?limit=100');
      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch (error) {
      console.error('Failed to fetch approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch(`/api/approval-queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'approved' }),
      });

      if (response.ok) {
        setApprovals((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'approved' } : a)),
        );
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch(`/api/approval-queue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'rejected' }),
      });

      if (response.ok) {
        setApprovals((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: 'rejected' } : a)),
        );
      }
    } catch (error) {
      console.error('Failed to reject:', error);
    } finally {
      setProcessing(null);
    }
  };

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

  const filteredApprovals = useMemo(() => {
    const base = filter === 'all' ? approvals : approvals.filter((a) => a.status === filter);
    return [...base].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      const pa = PRIORITY_RANK[a.priority] ?? 1;
      const pb = PRIORITY_RANK[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      return new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime();
    });
  }, [approvals, filter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>
          <button
            onClick={fetchApprovals}
            disabled={loading}
            className="self-start sm:self-auto rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-blue-600 hover:text-blue-600 transition disabled:opacity-40"
          >
            {loading ? t.loading : t.refresh}
          </button>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex gap-8">
            <div>
              <p className="text-gray-600 text-sm">{t.pendingLabel}</p>
              <p className="text-4xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">{t.totalLabel}</p>
              <p className="text-4xl font-bold text-gray-900">{approvals.length}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
            const labels = { all: t.filterAll, pending: t.filterPending, approved: t.filterApproved, rejected: t.filterRejected };
            return (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-600'
                }`}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>

        {/* Approvals List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-gray-200 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <div className="h-5 w-5 rounded-full bg-gray-200" />
                      <div className="h-5 w-48 rounded bg-gray-200" />
                      <div className="h-5 w-16 rounded-full bg-gray-200" />
                    </div>
                    <div className="h-4 w-64 rounded bg-gray-100" />
                  </div>
                  <div className="flex gap-2 ml-4">
                    <div className="h-9 w-24 rounded-lg bg-gray-200" />
                    <div className="h-9 w-20 rounded-lg bg-gray-200" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-lg font-semibold text-gray-700">
              {filter === 'pending' ? t.emptyPendingTitle : t.emptyOtherTitle(filter)}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {filter === 'pending' ? t.emptyPendingBody : t.emptyOtherBody}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setFilter('all')}
                className="px-4 py-2 rounded-lg border border-blue-600 text-blue-600 text-sm font-semibold hover:bg-blue-50 transition"
              >
                {t.viewAll}
              </button>
              <button
                onClick={fetchApprovals}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition"
              >
                {t.refresh}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApprovals.map((approval) => (
              <div
                key={approval.id}
                className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Title */}
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(approval.status)}
                      <h3 className="text-lg font-bold text-gray-900">{approval.action}</h3>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${getPriorityColor(
                          approval.priority,
                        )}`}
                      >
                        {approval.priority.toUpperCase()}
                      </span>
                    </div>

                    {/* Agent & Time */}
                    <p className="text-sm text-gray-600 mb-4">
                      {t.agentLabel}: <span className="font-mono font-semibold">{approval.agentId}</span>
                      {' • '}
                      {t.createdLabel}: <span>{new Date(approval.createdAt).toLocaleString()}</span>
                    </p>

                    {/* Action Input (if any) */}
                    {approval.input && Object.keys(approval.input).length > 0 && (
                      <details className="mb-4">
                        <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700">
                          {t.viewDetails}
                        </summary>
                        <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(approval.input, null, 2)}
                        </pre>
                      </details>
                    )}

                    {/* SLA Countdown */}
                    {approval.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{t.expires}:</span>
                        <SLACountdown
                          expiresAt={approval.expiresAt}
                          status={approval.status}
                          createdAt={approval.createdAt}
                        />
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {approval.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleApprove(approval.id)}
                        disabled={processing === approval.id}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t.approve}
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        disabled={processing === approval.id}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                      >
                        <XCircle className="w-4 h-4" />
                        {t.reject}
                      </button>
                    </div>
                  )}

                  {approval.status === 'approved' && (
                    <span className="text-green-600 font-bold">{t.approved}</span>
                  )}

                  {approval.status === 'rejected' && (
                    <span className="text-red-600 font-bold">{t.rejected}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
