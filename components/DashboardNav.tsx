'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Cable,
  FileCheck2,
  RadioTower,
  ScrollText,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  exact?: boolean;
}

const PRIMARY: NavItem[] = [
  { href: '/dashboard/governance-live', label: 'Live', icon: RadioTower },
  { href: '/dashboard/integrations', label: 'Connect', icon: Cable },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/policies', label: 'Plans', icon: ShieldCheck },
  { href: '/dashboard/proofs', label: 'Evidence', icon: FileCheck2 },
  { href: '/dashboard/audit', label: 'Audit', icon: ScrollText },
];

const SECONDARY: NavItem[] = [
  { href: '/dashboard/settings/access', label: 'Settings', icon: Settings2 },
];

const MOBILE: NavItem[] = [
  PRIMARY[0],
  PRIMARY[1],
  PRIMARY[3],
  PRIMARY[4],
  PRIMARY[5],
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

function DesktopLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href, item.exact);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={[
        'inline-flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-semibold transition-colors',
        active
          ? 'border-white/12 bg-white/[0.08] text-white'
          : 'border-transparent text-slate-500 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-200',
      ].join(' ')}
    >
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden min-w-0 flex-1 items-center justify-between gap-4 overflow-x-auto md:flex">
        <div className="flex items-center gap-1">
          {PRIMARY.map((item) => (
            <DesktopLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
        <div className="flex items-center gap-1 border-l border-white/10 pl-3">
          {SECONDARY.map((item) => (
            <DesktopLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>

      <nav
        aria-label="Primary dashboard navigation"
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-[#090a0e]/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden"
      >
        {MOBILE.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-colors',
                active ? 'bg-white/[0.08] text-white' : 'text-slate-500 active:bg-white/[0.05]',
              ].join(' ')}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
