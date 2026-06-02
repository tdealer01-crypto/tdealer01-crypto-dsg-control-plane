'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  PlayCircle,
  Bot,
  Shield,
  FileCheck,
  CheckSquare,
  ClipboardList,
  BookOpen,
  ThumbsUp,
  Plug,
  Radio,
  RotateCcw,
  Users,
  Key,
  Webhook,
  Bell,
  CreditCard,
  BarChart2,
  Settings,
  Menu,
  X,
  MessageSquare,
} from 'lucide-react';

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Monitor',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/dashboard/hermes', label: 'Hermes Agent', icon: MessageSquare },
      { href: '/dashboard/live-control', label: 'Live Control', icon: Activity },
      { href: '/dashboard/executions', label: 'Executions', icon: PlayCircle },
      { href: '/dashboard/agents', label: 'Agents', icon: Bot },
    ],
  },
  {
    title: 'Governance',
    items: [
      { href: '/dashboard/policies', label: 'Policies', icon: Shield },
      { href: '/dashboard/proofs', label: 'Proofs', icon: FileCheck },
      { href: '/dashboard/verification', label: 'Verification', icon: CheckSquare },
      { href: '/dashboard/audit', label: 'Audit', icon: ClipboardList },
      { href: '/dashboard/ledger', label: 'Ledger', icon: BookOpen },
      { href: '/dashboard/approvals', label: 'Approvals', icon: ThumbsUp },
    ],
  },
  {
    title: 'Connect',
    items: [
      { href: '/dashboard/integration', label: 'Integrations', icon: Plug },
      { href: '/dashboard/gateway-monitor', label: 'Gateway Monitor', icon: Radio },
      { href: '/dashboard/replay', label: 'Replay', icon: RotateCcw },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/dashboard/team', label: 'Team', icon: Users },
      { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
      { href: '/dashboard/webhooks', label: 'Webhooks', icon: Webhook },
      { href: '/dashboard/notifications', label: 'Notifications', icon: Bell, badge: true },
      { href: '/dashboard/billing', label: 'Billing', icon: CreditCard },
      { href: '/dashboard/capacity', label: 'Capacity', icon: BarChart2 },
      { href: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function getInitials(email: string): string {
  const parts = email.split('@')[0].split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

interface DashboardShellProps {
  userEmail: string;
  children: React.ReactNode;
}

export default function DashboardShell({ userEmail, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/login');
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 text-xs font-black text-slate-950">
          DSG
        </div>
        <div className="leading-tight">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">DSG ONE</p>
          <p className="text-sm font-semibold text-slate-100">Control Plane</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-4 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {section.title}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={[
                    'mx-2 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border border-amber-300/20 bg-amber-300/10 text-amber-100'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                  ].join(' ')}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="unread" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User / sign-out */}
      <div className="shrink-0 border-t border-slate-800 p-3">
        <div className="mb-2 flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
            {getInitials(userEmail)}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{userEmail}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-slate-950 lg:flex lg:flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-60 shrink-0 border-r border-slate-800 bg-slate-950 transition-transform duration-200 lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle navigation"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex flex-1 items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400 text-[10px] font-black text-slate-950">
              DSG
            </div>
            <p className="text-sm font-semibold text-slate-100">DSG ONE</p>
          </div>
          <button
            aria-label="Notifications"
            className="relative rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
