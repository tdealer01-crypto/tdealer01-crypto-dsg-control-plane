'use client';

import React, { useState, useEffect } from 'react';

interface PendingApproval {
  id: string;
  stripe_object_id: string;
  operation_type: string;
  amount_cents: number;
  currency: string;
  policy_reason: string;
  created_at: string;
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe-app/approvals/pending');
      if (response.ok) {
        const data = await response.json();
        setApprovals(Array.isArray(data) ? data : []);
      } else {
        // Mock data for demo
        setApprovals([
          {
            id: 'app_demo_1',
            stripe_object_id: 'po_1234567890',
            operation_type: 'payout',
            amount_cents: 500000,
            currency: 'usd',
            policy_reason: 'Amount exceeds auto-approve threshold of $3,000',
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            id: 'app_demo_2',
            stripe_object_id: 'ch_9876543210',
            operation_type: 'charge',
            amount_cents: 250000,
            currency: 'usd',
            policy_reason: 'International transaction - requires manual verification',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals');
      // Fallback to mock data
      setApprovals([
        {
          id: 'app_demo_1',
          stripe_object_id: 'po_1234567890',
          operation_type: 'payout',
          amount_cents: 500000,
          currency: 'usd',
          policy_reason: 'Amount exceeds auto-approve threshold of $3,000',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    setProcessing(approvalId);
    setError(null);
    try {
      const response = await fetch('/api/stripe-app/approvals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId }),
      });

      if (response.ok) {
        // Remove from list
        setApprovals(approvals.filter((a) => a.id !== approvalId));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to approve');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (approvalId: string) => {
    setProcessing(approvalId);
    setError(null);
    try {
      const response = await fetch('/api/stripe-app/approvals/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId }),
      });

      if (response.ok) {
        // Remove from list
        setApprovals(approvals.filter((a) => a.id !== approvalId));
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to reject');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>

      {error && (
        <div className="rounded bg-red-900/50 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading pending approvals...</p>
      ) : approvals.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="rounded-lg border border-slate-700 bg-slate-900/50 p-6"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Object ID</p>
                  <p className="font-mono text-sm text-white mt-1">
                    {approval.stripe_object_id}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Operation Type</p>
                  <p className="text-white font-semibold mt-1">
                    {approval.operation_type.charAt(0).toUpperCase() +
                      approval.operation_type.slice(1)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Amount</p>
                  <p className="text-white font-semibold mt-1">
                    {formatAmount(approval.amount_cents, approval.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Requested</p>
                  <p className="text-white text-sm mt-1">
                    {new Date(approval.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded bg-slate-800/50 p-3">
                <p className="text-sm text-slate-400">Policy Reason</p>
                <p className="text-slate-300 text-sm mt-1">{approval.policy_reason}</p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleApprove(approval.id)}
                  disabled={processing === approval.id}
                  className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {processing === approval.id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(approval.id)}
                  disabled={processing === approval.id}
                  className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {processing === approval.id ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
