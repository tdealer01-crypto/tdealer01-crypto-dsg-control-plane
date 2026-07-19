'use client';

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

type PlatformData = {
  name: string;
  value: number;
  color: string;
};

export function PlatformDiscoveryChart() {
  const [data, setData] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformData();
  }, []);

  async function fetchPlatformData() {
    try {
      // Mock data - in production this would come from the API
      const mockData = [
        { name: 'GitHub', value: 145, color: '#60a5fa' },
        { name: 'Twitter', value: 82, color: '#06b6d4' },
        { name: 'Reddit', value: 58, color: '#8b5cf6' },
      ];

      setData(mockData);
    } catch (err) {
      console.error('Error fetching platform data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-500">Loading...</div>;
  }

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-6">
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
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
            formatter={(value: any) => [value, 'Leads']}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Platform Breakdown Table */}
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
            {data.map((platform, idx) => (
              <tr key={idx} className="hover:bg-slate-700/30">
                <td className="px-4 py-3 flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platform.color }}
                  />
                  <span className="font-medium">{platform.name}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{platform.value}</td>
                <td className="px-4 py-3 text-right text-slate-300">
                  {((platform.value / total) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
