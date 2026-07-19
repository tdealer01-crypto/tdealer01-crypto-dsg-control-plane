'use client';

import { useEffect, useState } from 'react';

type Lead = {
  id: string;
  email: string;
  company?: string;
  framework?: string;
  icp_score: number;
  intent_score: number;
  source_platform: string;
};

export function HighPriorityLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHighPriorityLeads();
  }, []);

  async function fetchHighPriorityLeads() {
    try {
      const response = await fetch('/api/leads/metrics');
      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      setLeads(data.high_priority_leads || []);
    } catch (err) {
      console.error('Error fetching high-priority leads:', err);
    } finally {
      setLoading(false);
    }
  }

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'github':
        return 'text-blue-400';
      case 'twitter':
        return 'text-cyan-400';
      case 'reddit':
        return 'text-purple-400';
      default:
        return 'text-slate-400';
    }
  };

  const getPlatformBg = (platform: string) => {
    switch (platform) {
      case 'github':
        return 'bg-blue-900/20 border-blue-700/30';
      case 'twitter':
        return 'bg-cyan-900/20 border-cyan-700/30';
      case 'reddit':
        return 'bg-purple-900/20 border-purple-700/30';
      default:
        return 'bg-slate-900/20 border-slate-700/30';
    }
  };

  if (loading) {
    return <div className="h-32 flex items-center justify-center text-slate-500">Loading...</div>;
  }

  if (leads.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-500">
        No high-priority leads yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-700">
            <th className="px-4 py-3 text-left text-xs text-slate-400">Email</th>
            <th className="px-4 py-3 text-left text-xs text-slate-400">Company</th>
            <th className="px-4 py-3 text-center text-xs text-slate-400">ICP Score</th>
            <th className="px-4 py-3 text-center text-xs text-slate-400">Intent</th>
            <th className="px-4 py-3 text-left text-xs text-slate-400">Platform</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-slate-800/50">
              <td className="px-4 py-3 font-mono text-xs text-cyan-400">{lead.email}</td>
              <td className="px-4 py-3 text-slate-300">{lead.company || '—'}</td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-block px-2 py-1 rounded font-semibold text-xs ${
                    lead.icp_score >= 75
                      ? 'bg-emerald-900/30 text-emerald-400'
                      : 'bg-yellow-900/30 text-yellow-400'
                  }`}
                >
                  {lead.icp_score}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm font-medium text-slate-200">{lead.intent_score}</span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-1 rounded border text-xs font-medium ${getPlatformBg(
                    lead.source_platform || 'other'
                  )} ${getPlatformColor(lead.source_platform || 'other')}`}
                >
                  {(lead.source_platform || 'other').charAt(0).toUpperCase() +
                    (lead.source_platform || 'other').slice(1)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
