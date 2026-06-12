'use client';

import React, { useState, useEffect } from 'react';

interface AuditRecord {
  id: string;
  stripe_object_id: string;
  operation_type: string;
  dsg_decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  created_at: string;
  dsg_reason?: string;
  dsg_proof?: string;
}

async function readJsonOrMessage(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { message?: string };
  } catch {
    return { message: `Server returned non-JSON response (${response.status})` };
  }
}

export default function AuditPage() {
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDecision, setFilterDecision] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/stripe-app/audit/operations', { cache: 'no-store' });
      const data = await readJsonOrMessage(response);
      if (!response.ok) {
        setAudits([]);
        setError(data.message || 'Failed to load audit records');
        return;
      }
      setAudits(Array.isArray(data) ? data : []);
    } catch (err) {
      setAudits([]);
      setError(err instanceof Error ? err.message : 'Failed to load audit records');
    } finally {
      setLoading(false);
    }
  };

  const exportHref = filterDecision === 'all'
    ? '/api/stripe-app/audit/export'
    : `/api/stripe-app/audit/export?decision=${encodeURIComponent(filterDecision)}`;

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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Trail</h1>
          <p className="mt-1 text-sm text-slate-400">Real Stripe governance history and exportable evidence records.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="text-sm text-slate-400">Filter:</label>
          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="ALLOW">Allow</option>
            <option value="BLOCK">Block</option>
            <option value="REVIEW">Review</option>
          </select>
          <button
            onClick={fetchAudits}
            className="rounded bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
          >
            Refresh
          </button>
          <a
            href={exportHref}
            className="rounded bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Export Audit CSV
          </a>
        </div>
      </div>

      {error && (
        <div className="rounded bg-red-900/50 p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading audit records...</p>
      ) : filteredAudits.length === 0 ? (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-400">No real audit records found yet.</p>
          <p className="mt-2 text-sm text-slate-500">Open a Stripe payment detail, run DSG Governance Gate, then refresh this page.</p>
          <a
            href={exportHref}
            className="mt-4 inline-block rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Export Empty CSV Template
          </a>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-700 bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Object ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Decision</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Reason</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Proof</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredAudits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">{audit.stripe_object_id}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{audit.operation_type}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded px-2 py-1 text-xs font-semibold ${getDecisionColor(audit.dsg_decision)}`}>
                        {audit.dsg_decision}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{audit.dsg_reason || '-'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{audit.dsg_proof || '-'}</td>
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
        <p>Total records: <span className="font-semibold text-white">{filteredAudits.length}</span></p>
      </div>
    </div>
  );
}
