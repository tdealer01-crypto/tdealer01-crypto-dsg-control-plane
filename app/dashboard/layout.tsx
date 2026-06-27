import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import Link from 'next/link';
import AgentChatWidget from '../../components/AgentChatWidget';
import AutoSetupTrigger from '../../components/AutoSetupTrigger';
import DashboardNav from '../../components/DashboardNav';
import NudgeBanner from '../../components/billing/NudgeBanner';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
          <Link href="/dashboard" className="flex shrink-0 flex-col">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">DSG ONE</p>
            <p className="text-base font-semibold leading-tight">Command Center</p>
          </Link>
          <DashboardNav />
          <div className="hidden shrink-0 text-right lg:block">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="max-w-[160px] truncate text-xs font-medium text-slate-300">{user.email}</p>
          </div>
        </div>
      </div>
      <AutoSetupTrigger />
      <NudgeBanner />
      {children}
      <AgentChatWidget />
    </div>
  );
}
