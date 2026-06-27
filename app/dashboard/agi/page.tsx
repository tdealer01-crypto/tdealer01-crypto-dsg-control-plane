'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgiAgentChat } from '@/app/components/dashboard/AgiAgentChat';

export default function AgiPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
          router.push('/login?next=/dashboard/agi');
          return;
        }
        setIsAuthenticated(true);
      } catch {
        router.push('/login?next=/dashboard/agi');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full h-screen bg-slate-950">
      <AgiAgentChat />
    </div>
  );
}
