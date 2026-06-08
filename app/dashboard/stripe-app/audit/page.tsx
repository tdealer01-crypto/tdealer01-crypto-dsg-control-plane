'use client';

import React, { useState, useEffect } from 'react';

interface AuditRecord {
  id: string;
  stripe_object_id: string;
  operation_type: string;
  dsg_decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  created_at: string;
  dsg_reason?: string;
}

export default function AuditPage() {
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState<string>('all');

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/stripe-app/audit/operations');
      if (response.ok) {
        const data = await response.json();
        setAudits(Array.isArray(data) ? data : []);
      } else {
        // Mock data for demo
        setAudits([
          {
            id: 'aud_demo_1',
            stripe_object_id: 'ch_1234567890',
            operation_type: 'charge',
            dsg_decision: 'ALLOW',
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            dsg_reason: 'Amount within policy limits',
          },
          {
            id: 'aud_demo_2',
            stripe_object_id: 'pi_0987654321',
            operation_type: 'payment_intent',
            dsg_decision: 'REVIEW',
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            dsg_reason: 'Amount exceeds threshold - manual review required',
          },
          {
            id: 'aud_demo_3',
            stripe_object_id: 'po_5555555555',
            operation_type: 'payout',
            dsg_decision: 'BLOCK',
            created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            dsg_reason: 'Payout blocked - risk policy violation',
          },
        ]);
      }
    } catch (error) {
      // Fallback to mock data on error
      setAudits([
        {
          id: 'aud_demo_1',
          stripe_object_id: 'ch_1234567890',
          operation_type: 'charge',
          dsg_decision: 'ALLOW',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          dsg_reason: 'Amount within policy limits',
        },
        {
          id: 'aud_demo_2',
          stripe_object_id: 'pi_0987654321',
          operation_type: 'payment_intent',
          dsg_decision: 'REVIEW',
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          dsg_reason: 'Amount exceeds threshold - manual review required',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'ALLOW':
        return 'bg-green-900/30 text-green-300';
      case 'BLOCK':
        return 'bg-red-900/30 text-red-300';
      case 'REVIEW':
        return 'bg-yellow-900/30 text-yellow-300';
      default:
        return 'bg-slate-900/30 text-slate-300';
    }
  };

  const filteredAudits =
    filterDecision === 'all'
      ? audits
      : audits.filter((a) => a.dsg_decision === filterDecision);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-400">Filter by decision:</label>
          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="ALLOW">Allow</option>
            <option value="BLOCK">Block</option>
            <option value="REVIEW">Review</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400">Loading audit records...</p>
      ) : filteredAudits.length === 0 ? (
        <p className="text-slate-500">No operations recorded yet</p>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-700 bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Object ID
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Decision
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {audit.stripe_object_id}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      {audit.operation_type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getDecisionColor(
                          audit.dsg_decision
                        )}`}
                      >
                        {audit.dsg_decision}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {audit.dsg_reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {new Date(audit.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="text-sm text-slate-400">
        <p>
          Total records: <span className="text-white font-semibold">{filteredAudits.length}</span>
        </p>
      </div>
    </div>
  );
}
