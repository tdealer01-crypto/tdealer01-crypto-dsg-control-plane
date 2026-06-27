import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { HermesAgentChat } from '@/app/components/dashboard/HermesAgentChat';

export const metadata = {
  title: 'Hermes Agent | DSG Control Plane',
  description: 'Real-time agent chat with governance policy evaluation',
};

export default async function HermesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard/hermes');
  }

  return (
    <div className="w-full h-screen">
      <HermesAgentChat />
    </div>
  );
}
