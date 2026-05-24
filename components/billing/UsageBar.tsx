'use client';

type NudgeLevel = 'none' | 'soft' | 'hard' | 'blocked';

type UsageBarProps = {
  used: number;
  limit: number;
  plan: string;
  nudge: NudgeLevel;
  className?: string;
};

function barColor(nudge: NudgeLevel): string {
  if (nudge === 'blocked') return 'bg-red-500 animate-pulse';
  if (nudge === 'hard')    return 'bg-red-500';
  if (nudge === 'soft')    return 'bg-amber-400';
  return 'bg-emerald-500';
}

function textColor(nudge: NudgeLevel): string {
  if (nudge === 'blocked' || nudge === 'hard') return 'text-red-400';
  if (nudge === 'soft') return 'text-amber-400';
  return 'text-emerald-400';
}

export default function UsageBar({ used, limit, plan, nudge, className = '' }: UsageBarProps) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900 p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-500">Quota</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-200 capitalize">{plan} plan</p>
        </div>
        <span className={`text-2xl font-bold tabular-nums ${textColor(nudge)}`}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor(nudge)}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {used.toLocaleString()} / {limit.toLocaleString()} executions this month
      </p>
    </div>
  );
}
