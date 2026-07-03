import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hermes Agent | DSG Control Plane',
  description: 'Real-time agent chat with governance policy evaluation',
};

export default async function HermesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard/hermes');
  }

  return <>{children}</>;
}
