'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { HermesAgentChat } from '@/app/components/dashboard/HermesAgentChat';

export default function HermesPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login?next=/dashboard/hermes');
          return;
        }
        setIsAuthenticated(true);

        // Fetch health, agents, and executions data
        await Promise.all([
          fetch('/api/health').catch(() => {}),
          fetch('/api/agents').catch(() => {}),
          fetch('/api/executions').catch(() => {}),
        ]);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login?next=/dashboard/hermes');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400">กำลังโหลด...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="w-full h-screen bg-slate-950 text-slate-100">
      <div className="flex h-full flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-slate-800">
          <div className="flex gap-4 px-6 pt-4">
            {['overview', 'agents', 'executions', 'governance'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-amber-500 text-amber-500'
                    : 'border-b-2 border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'overview' && (
            <div className="p-6">
              <HermesAgentChat />
            </div>
          )}
          {activeTab === 'agents' && (
            <div className="p-6 text-slate-400">Agents tab content</div>
          )}
          {activeTab === 'executions' && (
            <div className="p-6 text-slate-400">Executions tab content</div>
          )}
          {activeTab === 'governance' && (
            <div className="p-6 text-slate-400">Governance tab content</div>
          )}
        </div>
      </div>
    </div>
  );
}
