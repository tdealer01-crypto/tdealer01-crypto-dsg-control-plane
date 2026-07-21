import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Hermes Agent | DSG Control Plane',
  description: 'Real-time agent chat with governance policy evaluation',
};

export default async function HermesLayout({ children }: { children: React.ReactNode }) {
  // When Supabase public env vars are absent (local inspection), createClient()
  // throws before any session check is possible. Middleware fails closed for
  // non-localhost hosts, so rendering here only affects local dev. With env
  // present, the redirect-on-no-session behavior is unchanged.
  let hasSession = false;
  let authConfigured = true;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    hasSession = Boolean(user);
  } catch {
    authConfigured = false;
  }

  if (authConfigured && !hasSession) {
    redirect('/login?next=/dashboard/hermes');
  }

  return <>{children}</>;
}
