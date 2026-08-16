'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

type PlatformData = {
  name: string;
  value: number;
};

const COLORS = ['#60a5fa', '#06b6d4', '#8b5cf6', '#22c55e', '#f59e0b', '#f97316'];

export function PlatformDiscoveryChart() {
  const [data, setData] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchPlatformData();
  }, []);

  async function fetchPlatformData() {
    try {
      const response = await fetch('/api/leads/metrics', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload.platform_distribution)) {
        throw new Error('PLATFORM_DISTRIBUTION_MISSING');
      }
      setData(payload.platform_distribution);
    } catch (err) {
      console.error('Error fetching platform data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live platform distribution');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-500">Loading live data...</div>;
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-red-300">
        Live platform data unavailable: {error}
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {total > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
              formatter={(value: any) => [value, 'Leads']}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-64 flex items-center justify-center text-slate-500">No lead data recorded.</div>
      )}

      <div className="border-t border-slate-700 pt-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-4 py-2 text-left text-xs text-slate-400">Platform</th>
              <th className="px-4 py-2 text-right text-xs text-slate-400">Leads</th>
              <th className="px-4 py-2 text-right text-xs text-slate-400">% of Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data.map((platform, index) => (
              <tr key={`${platform.name}-${index}`} className="hover:bg-slate-700/30">
                <td className="px-4 py-3 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="font-medium">{platform.name}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{platform.value}</td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {total > 0 ? ((platform.value / total) * 100).toFixed(1) : '0.0'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
