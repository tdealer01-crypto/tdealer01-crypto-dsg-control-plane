'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Approvals</h1>
          <p className="text-gray-600">Review and approve agent actions before execution</p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex gap-8">
            <div>
              <p className="text-gray-600 text-sm">Pending Approvals</p>
              <p className="text-4xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Total Requests</p>
              <p className="text-4xl font-bold text-gray-900">{approvals.length}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-8">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-600'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Approvals List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
            Loading approvals...
          </div>
        ) : filteredApprovals.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
            No {filter === 'all' ? 'approvals' : `${filter} approvals`} found
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
                      Agent: <span className="font-mono font-semibold">{approval.agentId}</span>
                      {' • '}
                      Created: <span>{new Date(approval.createdAt).toLocaleString()}</span>
                    </p>

                    {/* Action Input (if any) */}
                    {approval.input && Object.keys(approval.input).length > 0 && (
                      <details className="mb-4">
                        <summary className="cursor-pointer text-sm font-semibold text-blue-600 hover:text-blue-700">
                          View Details
                        </summary>
                        <pre className="mt-2 bg-gray-50 p-3 rounded text-xs overflow-x-auto">
                          {JSON.stringify(approval.input, null, 2)}
                        </pre>
                      </details>
                    )}

                    {/* Expiry Warning */}
                    {approval.status === 'pending' && (
                      <p className="text-xs text-red-600 font-semibold">
                        ⏰ Expires: {new Date(approval.expiresAt).toLocaleString()}
                      </p>
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
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(approval.id)}
                        disabled={processing === approval.id}
                        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  )}

                  {approval.status === 'approved' && (
                    <span className="text-green-600 font-bold">✓ Approved</span>
                  )}

                  {approval.status === 'rejected' && (
                    <span className="text-red-600 font-bold">✗ Rejected</span>
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
