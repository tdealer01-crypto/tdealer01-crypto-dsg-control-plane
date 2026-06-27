import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AgiAgentChat } from '@/app/components/dashboard/AgiAgentChat';

export const metadata = {
  title: 'AGI Agent | DSG Control Plane',
  description: 'Advanced AI agent for code generation, analysis, and problem-solving',
};

export default async function AgiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard/agi');
  }

  return (
    <div className="w-full h-screen">
      <AgiAgentChat />
    </div>
  );
}
