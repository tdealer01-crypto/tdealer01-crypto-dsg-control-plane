'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Sparkles,
  LayoutTemplate,
  GitBranch,
  LayoutGrid,
  History,
  BarChart2,
  Shield,
  Cpu,
  Bell,
  Settings,
  ArrowLeft,
  Menu,
  X,
  Key,
} from 'lucide-react';

const navSections = [
  {
    label: 'Build',
    items: [
      { label: 'App Builder', href: '/dsg/app-builder', iconName: 'sparkles' },
      { label: 'Templates', href: '/dsg/templates', iconName: 'layoutTemplate' },
      { label: 'Flow Studio', href: '/dsg/flow-studio', iconName: 'gitBranch' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'My Apps', href: '/dsg/action-layer', iconName: 'layoutGrid' },
      { label: 'History', href: '/dsg/history', iconName: 'history' },
      { label: 'API Keys', href: '/dsg/api-keys', iconName: 'key' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', href: '/dsg/analytics', iconName: 'barChart2' },
      { label: 'Governance', href: '/dsg/governance', iconName: 'shield' },
      { label: 'Autonomous Level', href: '/dsg/autonomous-level', iconName: 'cpu' },
    ],
  },
];

const bottomItems = [
  { label: 'Notifications', href: '/dsg/notifications', iconName: 'bell' },
  { label: 'Settings', href: '/dsg/settings', iconName: 'settings' },
];

function NavIcon({ name }: { name: string }) {
  const cls = 'h-4 w-4';
  switch (name) {
    case 'sparkles':       return <Sparkles className={cls} />;
    case 'layoutTemplate': return <LayoutTemplate className={cls} />;
    case 'gitBranch':      return <GitBranch className={cls} />;
    case 'layoutGrid':     return <LayoutGrid className={cls} />;
    case 'history':        return <History className={cls} />;
    case 'barChart2':      return <BarChart2 className={cls} />;
    case 'shield':         return <Shield className={cls} />;
    case 'cpu':            return <Cpu className={cls} />;
    case 'bell':           return <Bell className={cls} />;
    case 'settings':       return <Settings className={cls} />;
    case 'key':            return <Key className={cls} />;
    default:               return null;
  }
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
      {/* logo row */}
      <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white"
        >
          <Sparkles className="h-3.5 w-3.5 text-indigo-400" /> DSG ONE
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-500 transition-colors hover:text-slate-300"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-4 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className={`mx-2 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border border-indigo-500/25 bg-indigo-500/15 text-indigo-200'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <NavIcon name={item.iconName} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* bottom */}
      <div className="border-t border-slate-800 py-2">
        {bottomItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`mx-2 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'border border-indigo-500/25 bg-indigo-500/15 text-indigo-200'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <NavIcon name={item.iconName} />
              {item.label}
            </Link>
          );
        })}
        <div className="mx-4 my-2 border-t border-slate-800" />
        <Link
          href="/"
          onClick={onClose}
          className="mx-2 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/80 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>
      </div>
    </aside>
  );
}

export default function DsgLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* desktop sidebar */}
      <div className="hidden h-full md:flex">
        <Sidebar />
      </div>

      {/* mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <Sidebar onClose={() => setMobileOpen(false)} />
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}

      {/* main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex h-14 items-center border-b border-slate-800 px-4 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 text-xs font-black uppercase tracking-widest text-white">
            DSG ONE
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
