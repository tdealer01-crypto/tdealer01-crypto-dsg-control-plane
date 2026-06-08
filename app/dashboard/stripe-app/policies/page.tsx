'use client';

import React, { useState, useEffect } from 'react';

interface Policy {
  id: string;
  operation_type: string;
  rule_type?: string;
  conditions: Record<string, unknown>;
  action: 'allow' | 'block' | 'review';
  created_at?: string;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationType, setOperationType] = useState('charge');
  const [action, setAction] = useState<'allow' | 'block' | 'review'>('review');
  const [maxAmount, setMaxAmount] = useState('50000');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe-app/policies');
      if (response.ok) {
        const data = await response.json();
        setPolicies(Array.isArray(data) ? data : []);
      } else {
        // Mock data for demo
        setPolicies([
          {
            id: 'pol_demo_1',
            operation_type: 'charge',
            rule_type: 'amount_threshold',
            conditions: { max_amount_cents: 50000 },
            action: 'review',
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch policies');
      // Set mock data on error
      setPolicies([
        {
          id: 'pol_demo_1',
          operation_type: 'charge',
          rule_type: 'amount_threshold',
          conditions: { max_amount_cents: 50000 },
          action: 'review',
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePolicy = async () => {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe-app/policies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation_type: operationType,
          rule_type: 'amount_threshold',
          conditions: { max_amount_cents: parseInt(maxAmount) || 0 },
          action,
        }),
      });

      if (response.ok) {
        fetchPolicies();
        // Reset form
        setOperationType('charge');
        setAction('review');
        setMaxAmount('50000');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create policy');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create policy');
    } finally {
      setCreating(false);
    }
  };

  const getActionColor = (act: string) => {
    switch (act) {
      case 'allow':
        return 'text-green-400';
      case 'block':
        return 'text-red-400';
      case 'review':
        return 'text-yellow-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-bold text-white">Governance Policies</h1>

      {/* Create Policy Form */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Create New Policy</h2>

        {error && (
          <div className="rounded bg-red-900/50 p-3">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Operation Type
          </label>
          <select
            value={operationType}
            onChange={(e) => setOperationType(e.target.value)}
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          >
            <option value="charge">Charge</option>
            <option value="payment_intent">Payment Intent</option>
            <option value="payout">Payout</option>
            <option value="refund">Refund</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Max Amount (cents)
          </label>
          <input
            type="number"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="50000"
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Action
          </label>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as 'allow' | 'block' | 'review')}
            className="w-full rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
          >
            <option value="allow">Allow</option>
            <option value="review">Review</option>
            <option value="block">Block</option>
          </select>
        </div>

        <button
          onClick={handleCreatePolicy}
          disabled={creating}
          className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-400"
        >
          {creating ? 'Creating...' : 'Create Policy'}
        </button>
      </div>

      {/* Policies List */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Active Policies</h2>

        {loading ? (
          <p className="text-slate-400">Loading...</p>
        ) : policies.length === 0 ? (
          <p className="text-slate-500">No policies configured yet</p>
        ) : (
          <div className="space-y-3">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="rounded border border-slate-700 bg-slate-800/50 p-4 flex justify-between items-start"
              >
                <div className="flex-1">
                  <p className="font-semibold text-white">{policy.operation_type}</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Rule: {policy.rule_type || 'N/A'}
                  </p>
                  {policy.conditions?.max_amount_cents && (
                    <p className="text-sm text-slate-400">
                      Max: ${((policy.conditions.max_amount_cents as number) / 100).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className={`font-semibold text-sm ${getActionColor(policy.action)}`}>
                  {policy.action.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
