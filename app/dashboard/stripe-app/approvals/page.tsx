'use client';

import React, { useEffect, useState } from 'react';

interface PendingApproval {
  id: string;
  stripe_object_id: string;
  operation_type: string;
  amount_cents: number;
  currency: string;
  policy_reason: string;
  created_at: string;
}

async function readJsonOrThrow(response: Response) {
  const text = await response.text();
  let data: unknown = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`API returned non-JSON response (${response.status})`);
    }
  }

  if (!response.ok) {
    const message = data && typeof data === 'object' && 'message' in data
      ? String((data as { message?: unknown }).message)
      : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return data;
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
      const response = await fetch('/api/stripe-app/approvals/pending', { cache: 'no-store' });
      const data = await readJsonOrThrow(response);
      setApprovals(Array.isArray(data) ? data as PendingApproval[] : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals');
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  const updateApproval = async (approvalId: string, action: 'approve' | 'reject') => {
    setProcessing(approvalId);
    setError(null);
    try {
      const response = await fetch(`/api/stripe-app/approvals/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: approvalId }),
      });

      await readJsonOrThrow(response);
      setApprovals((items) => items.filter((item) => item.id !== approvalId));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    } finally {
      setProcessing(null);
    }
  };

  const formatAmount = (cents: number, currency: string) => {
    if (!cents) return 'Not available';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
        <button
          onClick={fetchApprovals}
          className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded bg-red-900/50 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading pending approvals...</p>
      ) : approvals.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No pending approvals recorded yet</p>
          <p className="mt-2 text-sm text-slate-500">
            Open a payout or charge in Stripe Dashboard and run DSG Governance Gate to create review records.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div key={approval.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-slate-400">Object ID</p>
                  <p className="mt-1 font-mono text-sm text-white">{approval.stripe_object_id}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Operation Type</p>
                  <p className="mt-1 font-semibold text-white">{approval.operation_type}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Amount</p>
                  <p className="mt-1 font-semibold text-white">{formatAmount(approval.amount_cents, approval.currency)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Requested</p>
                  <p className="mt-1 text-sm text-white">
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
                <p className="mt-1 text-sm text-slate-300">{approval.policy_reason}</p>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => updateApproval(approval.id, 'approve')}
                  disabled={processing === approval.id}
                  className="flex-1 rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {processing === approval.id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => updateApproval(approval.id, 'reject')}
                  disabled={processing === approval.id}
                  className="flex-1 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {processing === approval.id ? 'Updating...' : 'Reject'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
