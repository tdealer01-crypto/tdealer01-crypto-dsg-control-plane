'use client';

import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AlertProvider } from '@/lib/hooks';

export const dynamic = 'force-dynamic';

export default async function HermesLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard/hermes');
  }

  return <AlertProvider>{children}</AlertProvider>;
}
