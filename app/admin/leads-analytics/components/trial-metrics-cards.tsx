'use client';

type Metrics = {
  total_trials: number;
  conversions: number;
  conversion_rate: number;
  churn_rate: number;
  avg_trial_days: number;
  revenue_attributed: number;
};

const MetricCard = ({ label, value, unit, highlight }: any) => (
  <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
    <div className={`text-2xl font-bold ${highlight ? 'text-emerald-400' : 'text-white'}`}>
      {value}
      {unit && <span className="text-sm text-slate-400">{unit}</span>}
    </div>
    <div className="text-xs text-slate-400">{label}</div>
  </div>
);

export function TrialMetricsCards({ metrics }: { metrics: Metrics }) {
  return (
    <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <MetricCard label="Total Trials" value={metrics.total_trials} highlight={metrics.total_trials > 0} />
      <MetricCard label="Conversions" value={metrics.conversions} highlight={true} />
      <MetricCard
        label="Conv. Rate"
        value={metrics.conversion_rate}
        unit="%"
        highlight={metrics.conversion_rate > 20}
      />
      <MetricCard
        label="Churn Rate"
        value={metrics.churn_rate}
        unit="%"
        highlight={metrics.churn_rate < 50}
      />
      <MetricCard
        label="Avg. Trial Days"
        value={metrics.avg_trial_days}
        highlight={metrics.avg_trial_days > 14}
      />
      <MetricCard label="Revenue" value={`$${metrics.revenue_attributed}`} highlight={false} />
    </div>
  );
}
