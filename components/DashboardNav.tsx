'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const PRIMARY = [
  { href: '/dashboard', label: 'Overview', exact: true },
  { href: '/dashboard/agents', label: 'Agents' },
  { href: '/dashboard/executions', label: 'Executions' },
  { href: '/approvals', label: 'Approvals' },
  { href: '/finance-governance/app', label: 'Finance' },
  { href: '/dashboard/audit', label: 'Audit' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/demo', label: 'Demo' },
];

const MORE = [
  { href: '/dashboard/command-center', label: 'Command Center' },
  { href: '/dashboard/policies', label: 'Policies' },
  { href: '/dashboard/proofs', label: 'Proofs' },
  { href: '/dashboard/verification', label: 'Verification' },
  { href: '/dashboard/live-control', label: 'Live Control' },
  { href: '/dashboard/ledger', label: 'Ledger' },
  { href: '/dashboard/capacity', label: 'Capacity' },
  { href: '/dashboard/operations', label: 'Operations' },
  { href: '/dashboard/settings/access', label: 'Access' },
  { href: '/dashboard/settings/security', label: 'Security' },
  { href: '/dashboard/integration', label: 'Integrations' },
  { href: '/dashboard/missions', label: 'Mission' },
  { href: '/dashboard/skills', label: 'Skills' },
  { href: '/marketplace/skills', label: 'Skills Marketplace' },
  { href: '/dashboard/referrals', label: 'Referrals' },
  { href: '/app-shell', label: 'App Shell' },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const activeMore = MORE.some((item) => isActive(pathname, item.href));

  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {PRIMARY.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              'whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
              active
                ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-400/30 hover:text-slate-100',
            ].join(' ')}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="relative">
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={[
            'whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
            activeMore || moreOpen
              ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
              : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-400/30 hover:text-slate-100',
          ].join(' ')}
        >
          More ▾
        </button>
        {moreOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-2xl border border-slate-800 bg-slate-900 py-2 shadow-2xl">
            {MORE.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={[
                    'block px-4 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-emerald-400/10 text-emerald-200'
                      : 'text-slate-300 hover:bg-white/5 hover:text-slate-100',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
