import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import AgentChatWidget from '../../components/AgentChatWidget';
import DashboardShell from './_components/DashboardShell';

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
    <>
      <DashboardShell userEmail={user!.email ?? ''}>
        {children}
      </DashboardShell>
      <AgentChatWidget />
    </>
  );
}
