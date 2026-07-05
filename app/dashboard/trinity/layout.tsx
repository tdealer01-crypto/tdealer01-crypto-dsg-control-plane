import Link from 'next/link';

export default function TrinityDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/dashboard" className="flex shrink-0 flex-col">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">DSG ONE</p>
            <p className="text-base font-semibold leading-tight">Command Center</p>
          </Link>
          <div className="text-xs text-slate-500">Trinity Workspace</div>
          <div className="hidden shrink-0 text-right lg:block">
            <p className="text-xs text-slate-500">Demo Dashboard</p>
            <p className="max-w-[160px] truncate text-xs font-medium text-amber-300">No login required</p>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
