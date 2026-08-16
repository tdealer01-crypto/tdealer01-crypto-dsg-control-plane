'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The five destinations of DSG ONE. Not four, not twenty.
 * See docs/product/DSG_ONE_VERIFIED_EXECUTION.md §3.
 */
const NAV = [
  { href: '/one', label: 'Run', exact: true },
  { href: '/one/activity', label: 'Activity' },
  { href: '/one/proofs', label: 'Proofs' },
  { href: '/one/policies', label: 'Policies' },
  { href: '/one/integrations', label: 'Integrations' },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function OneNav() {
  const pathname = usePathname() ?? '/one';

  return (
    <nav aria-label="DSG ONE" className="flex items-center gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href, 'exact' in item ? item.exact : undefined);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              active
                ? 'bg-white/10 font-medium text-white'
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200',
            ].join(' ')}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
