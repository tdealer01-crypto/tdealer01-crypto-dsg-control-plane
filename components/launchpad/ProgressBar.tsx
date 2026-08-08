'use client';

export function ProgressBar({ totalItems, checkedItems }: { totalItems: number; checkedItems: number }) {
  const pct = totalItems === 0 ? 0 : Math.round((checkedItems / totalItems) * 100);

  return (
    <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-300">Overall Completion</span>
        <span className="text-2xl font-bold text-white">{pct}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {checkedItems} of {totalItems} tasks complete
      </p>
    </div>
  );
}
