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
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#07080b]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1480px] items-center gap-5 px-4 py-3 sm:px-6">
          <Link href="/dashboard/governance-live" className="flex shrink-0 items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/10 text-xs font-black tracking-[0.12em] text-amber-100">
              DSG
            </span>
            <span className="hidden sm:block">
              <span className="block text-xs uppercase tracking-[0.2em] text-slate-500">Control Plane</span>
              <span className="block text-sm font-semibold text-white">Governance</span>
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
      {children}
      {user && <AgentChatWidget />}
    </div>
  );
}
