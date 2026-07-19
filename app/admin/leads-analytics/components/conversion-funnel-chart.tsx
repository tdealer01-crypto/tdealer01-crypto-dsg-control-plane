'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

type Funnel = {
  stage_discovered: { count: number; percentage: number };
  stage_contacted: { count: number; percentage: number };
  stage_trial: { count: number; percentage: number };
  stage_converted: { count: number; percentage: number };
  conversion_rate_trial_to_paid: number;
};

export function ConversionFunnelChart({ funnel }: { funnel: Funnel }) {
  const data = [
    {
      name: 'Discovered',
      count: funnel.stage_discovered.count,
      percentage: 100,
      fill: '#06b6d4',
    },
    {
      name: 'Contacted',
      count: funnel.stage_contacted.count,
      percentage: funnel.stage_contacted.percentage,
      fill: '#0ea5e9',
    },
    {
      name: 'Trial',
      count: funnel.stage_trial.count,
      percentage: funnel.stage_trial.percentage,
      fill: '#3b82f6',
    },
    {
      name: 'Converted',
      count: funnel.stage_converted.count,
      percentage: funnel.stage_converted.percentage,
      fill: '#10b981',
    },
  ];

  return (
    <div className="space-y-4">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fill: '#cbd5e1', fontSize: 12 }} />
          <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} tick={{ fill: '#cbd5e1' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
            cursor={{ fill: 'rgba(255,255,255,0.1)' }}
            formatter={(value: any, name: string) => {
              if (name === 'count') return [value, 'Leads'];
              if (name === 'percentage') return [`${value}%`, 'of Discovered'];
              return value;
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Funnel Stats */}
      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-700">
        <div>
          <div className="text-xs text-slate-400">Outreach Rate</div>
          <div className="text-lg font-semibold text-cyan-400">
            {funnel.stage_contacted.percentage.toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Trial-to-Paid</div>
          <div className="text-lg font-semibold text-emerald-400">
            {funnel.conversion_rate_trial_to_paid.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
