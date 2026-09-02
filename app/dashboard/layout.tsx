import { createClient } from '../../lib/supabase/server';
import Link from 'next/link';
import AgentChatWidget from '../../components/AgentChatWidget';
import DashboardNav from '../../components/DashboardNav';
import CommandPalette from '../../components/CommandPalette';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-[#07080b] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#08090c]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/dashboard/governance-live" className="flex shrink-0 items-center gap-3" aria-label="DSG Control Plane home">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-300/[0.07] text-[11px] font-black tracking-[0.12em] text-blue-100">
              DSG
            </span>
            <span className="hidden lg:block">
              <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600">Control Plane</span>
              <span className="block text-sm font-semibold text-white">Agent Governance</span>
            </span>
          </Link>

          <DashboardNav />
          <CommandPalette />

          <div className="hidden shrink-0 text-right xl:block">
            <p className="text-[10px] uppercase tracking-[0.16em] text-slate-600">
              {user ? 'Signed in' : 'Guest'}
            </p>
            <p className="max-w-[150px] truncate text-xs text-slate-400">
              {user?.email ?? 'public session'}
            </p>
          </div>
        </div>
      </header>

      <div className="pb-20 md:pb-0">{children}</div>
      {user && <AgentChatWidget />}
    </div>
  );
}
