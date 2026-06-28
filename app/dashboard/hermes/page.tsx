'use client';

import { useState } from 'react';
import { HermesAgentChat } from '@/app/components/dashboard/HermesAgentChat';

// Authentication is enforced server-side by app/dashboard/hermes/layout.tsx
// (Supabase SSR cookie session + redirect). The page must NOT re-gate auth with
// the browser Supabase client: that client stores its session in localStorage,
// not the SSR cookies, so getUser() returns null even for a logged-in user and
// the page would redirect-loop to /login (blank/stuck screen).
export default function HermesPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100">
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
