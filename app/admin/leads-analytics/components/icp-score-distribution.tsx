'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type ScoreBucket = {
  range: string;
  count: number;
  percentage: number;
};

const EMPTY_BUCKETS: ScoreBucket[] = [
  { range: '0-20', count: 0, percentage: 0 },
  { range: '21-40', count: 0, percentage: 0 },
  { range: '41-60', count: 0, percentage: 0 },
  { range: '61-80', count: 0, percentage: 0 },
  { range: '81-100', count: 0, percentage: 0 },
];

export function ICPScoreDistribution() {
  const [data, setData] = useState<ScoreBucket[]>(EMPTY_BUCKETS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchICPDistribution();
  }, []);

  async function fetchICPDistribution() {
    try {
      const response = await fetch('/api/leads/metrics', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.icp_distribution)) {
        throw new Error('ICP_DISTRIBUTION_MISSING');
      }
      setData(payload.icp_distribution);
    } catch (err) {
      console.error('Error fetching ICP distribution:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live ICP distribution');
    } finally {
      setLoading(false);
    }
  }

  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-500">Loading live data...</div>;
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-red-300">
        Live ICP data unavailable: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="range" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
          <YAxis tick={{ fill: '#cbd5e1' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
            formatter={(value: any) => [value, 'Leads']}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-700 text-xs">
        <div>
          <div className="text-slate-400">Low Priority</div>
          <div className="text-sm font-semibold text-slate-200">
            {data.slice(0, 2).reduce((sum, item) => sum + item.count, 0)} leads
          </div>
        </div>
        <div>
          <div className="text-slate-400">High Priority</div>
          <div className="text-sm font-semibold text-emerald-400">
            {data.slice(3).reduce((sum, item) => sum + item.count, 0)} leads
          </div>
        </div>
      </div>
    </div>
  );
}
