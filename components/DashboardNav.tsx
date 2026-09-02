'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

const PRIMARY: NavItem[] = [
  { href: '/dashboard/governance-live', label: 'Live' },
  { href: '/dashboard/agents', label: 'Agents' },
  { href: '/dashboard/policies', label: 'Plans' },
  { href: '/dashboard/proofs', label: 'Evidence' },
  { href: '/dashboard/audit', label: 'Audit' },
];

const SECONDARY: NavItem[] = [
  { href: '/dashboard/integration', label: 'Connections' },
  { href: '/dashboard/settings/access', label: 'Settings' },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href, item.exact);
  return (
    <Link
      href={item.href}
      className={[
        'whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold transition-colors',
        active
          ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
          : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.03] hover:text-white',
      ].join(' ')}
    >
      {item.label}
    </Link>
  );
}

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 flex-1 items-center justify-between gap-4 overflow-x-auto pb-0.5">
      <div className="flex items-center gap-1">
        {PRIMARY.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
      <div className="flex items-center gap-1 border-l border-white/10 pl-3">
        {SECONDARY.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
