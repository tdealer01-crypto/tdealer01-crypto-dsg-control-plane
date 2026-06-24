'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function SessionIndicator() {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user as any);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user as any);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <span className="text-xs text-slate-500">Loading...</span>;
  }

  if (!user) {
    return (
      <a href="/login" className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200">
        Sign In
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">{user.email}</span>
      <a
        href="/auth/signout"
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
      >
        Sign Out
      </a>
    </div>
  );
}
