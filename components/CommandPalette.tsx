'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PaletteItem {
  id: string;
  label: string;
  description: string;
  href: string;
  keywords: string[];
  category: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // Overview
  { id: 'dashboard', label: 'Dashboard', description: 'Overview & home', href: '/dashboard', keywords: ['home', 'overview', 'main'], category: 'Overview' },
  { id: 'demo', label: 'Demo', description: 'Demo environment', href: '/demo', keywords: ['test', 'demo'], category: 'Overview' },

  // Govern
  { id: 'approvals', label: 'Approvals', description: 'Approval workflows', href: '/approvals', keywords: ['approve', 'workflow', 'review'], category: 'Govern' },
  { id: 'audit', label: 'Audit', description: 'Audit trail & logs', href: '/dashboard/audit', keywords: ['log', 'history', 'trail'], category: 'Govern' },
  { id: 'policies', label: 'Policies', description: 'Create & manage policies', href: '/dashboard/policies', keywords: ['rule', 'policy', 'gate'], category: 'Govern' },
  { id: 'verification', label: 'Verification', description: 'Verify evidence', href: '/dashboard/verification', keywords: ['verify', 'check', 'proof'], category: 'Govern' },
  { id: 'proofs', label: 'Proofs', description: 'Proof generation', href: '/dashboard/proofs', keywords: ['proof', 'evidence'], category: 'Govern' },
  { id: 'breach', label: 'Breach Signal', description: 'Breach detection', href: '/dashboard/breach-signal', keywords: ['breach', 'security', 'alert'], category: 'Govern' },

  // Finance
  { id: 'finance', label: 'Finance Governance', description: 'Financial approvals', href: '/finance-governance/app', keywords: ['payment', 'finance', 'transaction'], category: 'Finance' },
  { id: 'billing', label: 'Billing', description: 'Billing & invoices', href: '/dashboard/billing', keywords: ['bill', 'invoice', 'payment', 'charge'], category: 'Finance' },
  { id: 'payout', label: 'Payout Safety', description: 'Payout verification', href: '/dashboard/payout-safety', keywords: ['payout', 'withdraw', 'transfer'], category: 'Finance' },
  { id: 'capacity', label: 'Capacity', description: 'Usage & capacity', href: '/dashboard/capacity', keywords: ['usage', 'quota', 'limit'], category: 'Finance' },
  { id: 'ledger', label: 'Ledger', description: 'Financial ledger', href: '/dashboard/ledger', keywords: ['ledger', 'accounting', 'record'], category: 'Finance' },

  // Build
  { id: 'agents', label: 'Agents', description: 'Agent management', href: '/dashboard/agents', keywords: ['agent', 'bot', 'ai'], category: 'Build' },
  { id: 'executions', label: 'Executions', description: 'Execution logs', href: '/dashboard/executions', keywords: ['execute', 'run', 'action'], category: 'Build' },
  { id: 'live-control', label: 'Live Control', description: 'Real-time control', href: '/dashboard/live-control', keywords: ['control', 'realtime', 'live'], category: 'Build' },
  { id: 'integrations', label: 'Integrations', description: 'Connect services', href: '/dashboard/integration', keywords: ['integration', 'connect', 'api', 'webhook'], category: 'Build' },
  { id: 'skills', label: 'Skills', description: 'Custom skills', href: '/dashboard/skills', keywords: ['skill', 'plugin', 'extension'], category: 'Build' },
  { id: 'marketplace', label: 'Skills Marketplace', description: 'Browse & install skills', href: '/marketplace/skills', keywords: ['marketplace', 'store', 'browse'], category: 'Build' },
  { id: 'multi-agent', label: 'Multi-Agent', description: 'Multi-agent orchestration', href: '/dashboard/hermes/agents', keywords: ['multi-agent', 'orchestration', 'team'], category: 'Build' },
  { id: 'app-shell', label: 'App Shell', description: 'Application shell', href: '/app-shell', keywords: ['app', 'shell'], category: 'Build' },

  // Manage
  { id: 'access', label: 'Access', description: 'Manage access & permissions', href: '/dashboard/settings/access', keywords: ['access', 'permission', 'role', 'team'], category: 'Manage' },
  { id: 'security', label: 'Security', description: 'Security settings', href: '/dashboard/settings/security', keywords: ['security', 'password', 'mfa', '2fa'], category: 'Manage' },
  { id: 'operations', label: 'Operations', description: 'Operations dashboard', href: '/dashboard/operations', keywords: ['operations', 'ops'], category: 'Manage' },
  { id: 'trinity', label: '🔱 Trinity AI', description: 'Trinity AI assistant', href: '/dashboard/trinity', keywords: ['trinity', 'ai', 'assistant'], category: 'Manage' },
  { id: 'command-center', label: 'Command Center', description: 'Central command hub', href: '/dashboard/command-center', keywords: ['command', 'center', 'hub'], category: 'Manage' },
  { id: 'mission', label: 'Mission', description: 'Mission planning', href: '/dashboard/missions', keywords: ['mission', 'goal', 'objective'], category: 'Manage' },
  { id: 'referrals', label: 'Referrals', description: 'Referral program', href: '/dashboard/referrals', keywords: ['referral', 'invite', 'share'], category: 'Manage' },
];

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filtered = PALETTE_ITEMS.filter((item) => {
    const query = search.toLowerCase();
    return (
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.keywords.some((k) => k.includes(query))
    );
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
        setSearch('');
        setSelectedIndex(0);
      }

      if (!open) return;

      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        router.push(filtered[selectedIndex].href);
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, filtered, selectedIndex, router]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
      >
        <span className="text-xs">⌘K</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
            <div className="flex items-center border-b border-slate-800 px-4 py-3">
              <span className="text-slate-500">🔍</span>
              <input
                autoFocus
                type="text"
                placeholder="Search features... (type to filter)"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                className="ml-3 flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none"
              />
              <span className="text-xs text-slate-500">ESC</span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500">No features found</div>
              ) : (
                <div>
                  {filtered.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        router.push(item.href);
                        setOpen(false);
                      }}
                      className={[
                        'w-full px-4 py-3 text-left transition-colors border-b border-slate-800/50',
                        index === selectedIndex ? 'bg-emerald-400/10 text-emerald-200' : 'text-slate-300 hover:bg-white/5',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className="text-xs text-slate-500">{item.description}</div>
                        </div>
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded">{item.category}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 px-4 py-2 text-xs text-slate-500 flex gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>ESC Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
