'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAppLanguage } from '@/store/useAppLanguage';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/Skeleton';

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
  const filteredApprovals = filter === 'all'
    ? approvals
    : approvals.filter((a) => a.status === filter);

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
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title={t.title}
          description={t.subtitle}
          actions={
            <Button
              onClick={fetchApprovals}
              disabled={loading}
              variant="primary"
            >
              {loading ? t.loading : t.refresh}
            </Button>
          }
        />

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <StatCard
            label={t.pendingLabel}
            value={pendingCount}
            variant={pendingCount > 0 ? 'warning' : 'success'}
          />
          <StatCard
            label={t.totalLabel}
            value={approvals.length}
            variant="info"
          />
        </div>

        <div className="mb-8 flex gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
            const labels = { all: t.filterAll, pending: t.filterPending, approved: t.filterApproved, rejected: t.filterRejected };
            return (
              <Button
                key={status}
                onClick={() => setFilter(status)}
                variant={filter === status ? 'primary' : 'secondary'}
              >
                {labels[status]}
              </Button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : filteredApprovals.length === 0 ? (
          <EmptyState
            title={filter === 'pending' ? t.emptyPendingTitle : t.emptyOtherTitle(filter)}
            description={filter === 'pending' ? t.emptyPendingBody : t.emptyOtherBody}
            action={
              <div className="flex gap-2">
                <Button onClick={() => setFilter('all')} variant="secondary">
                  {t.viewAll}
                </Button>
                <Button onClick={fetchApprovals} variant="primary">
                  {t.refresh}
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredApprovals.map((approval) => (
              <Card
                key={approval.id}
                variant={
                  approval.status === 'approved'
                    ? 'success'
                    : approval.status === 'rejected'
                      ? 'error'
                      : 'default'
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      {getStatusIcon(approval.status)}
                      <h3 className="text-lg font-bold text-white">
                        {approval.action}
                      </h3>
                      <Badge
                        variant={
                          approval.priority === 'high'
                            ? 'error'
                            : approval.priority === 'medium'
                              ? 'warning'
                              : 'success'
                        }
                      >
                        {approval.priority.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="mb-4 text-sm text-gray-400">
                      {t.agentLabel}:{' '}
                      <span className="font-mono font-semibold">
                        {approval.agentId}
                      </span>
                      {' • '}
                      {t.createdLabel}:{' '}
                      <span>{new Date(approval.createdAt).toLocaleString()}</span>
                    </p>

                    {approval.input &&
                      Object.keys(approval.input).length > 0 && (
                        <details className="mb-4">
                          <summary className="cursor-pointer text-sm font-semibold text-blue-300 hover:text-blue-200">
                            {t.viewDetails}
                          </summary>
                          <pre className="mt-2 overflow-x-auto rounded border border-white/10 bg-black/40 p-3 text-xs leading-6 text-slate-300">
                            {JSON.stringify(approval.input, null, 2)}
                          </pre>
                        </details>
                      )}

                    {approval.status === 'pending' && (
                      <p className="text-xs font-semibold text-red-300">
                        {t.expires}:{' '}
                        {new Date(approval.expiresAt).toLocaleString()}
                      </p>
                    )}
                  </div>

                  {approval.status === 'pending' && (
                    <div className="ml-4 flex gap-2">
                      <Button
                        onClick={() => handleApprove(approval.id)}
                        disabled={processing === approval.id}
                        variant="success"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {t.approve}
                      </Button>
                      <Button
                        onClick={() => handleReject(approval.id)}
                        disabled={processing === approval.id}
                        variant="danger"
                      >
                        <XCircle className="h-4 w-4" />
                        {t.reject}
                      </Button>
                    </div>
                  )}

                  {approval.status === 'approved' && (
                    <span className="font-bold text-emerald-300">
                      {t.approved}
                    </span>
                  )}

                  {approval.status === 'rejected' && (
                    <span className="font-bold text-red-300">
                      {t.rejected}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
