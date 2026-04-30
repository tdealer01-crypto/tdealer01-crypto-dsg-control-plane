import { redirect } from 'next/navigation';
import AppShellClient from '../../components/AppShellClient';
import { createClient } from '../../lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AppShellPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/app-shell');
  }

  return <AppShellClient />;
}
