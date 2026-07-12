'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
}

interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', exact: true },
      { href: '/demo', label: 'Demo' },
    ],
  },
  {
    id: 'govern',
    label: 'Govern',
    items: [
      { href: '/approvals', label: 'Approvals' },
      { href: '/dashboard/audit', label: 'Audit' },
      { href: '/dashboard/policies', label: 'Policies' },
      { href: '/dashboard/verification', label: 'Verification' },
      { href: '/dashboard/proofs', label: 'Proofs' },
      { href: '/dashboard/breach-signal', label: 'Breach Signal' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { href: '/finance-governance/app', label: 'Finance Governance' },
      { href: '/dashboard/billing', label: 'Billing' },
      { href: '/dashboard/payout-safety', label: 'Payout Safety' },
      { href: '/dashboard/capacity', label: 'Capacity' },
      { href: '/dashboard/ledger', label: 'Ledger' },
    ],
  },
  {
    id: 'build',
    label: 'Build',
    items: [
      { href: '/dashboard/agents', label: 'Agents' },
      { href: '/dashboard/executions', label: 'Executions' },
      { href: '/dashboard/live-control', label: 'Live Control' },
      { href: '/dashboard/integration', label: 'Integrations' },
      { href: '/dashboard/skills', label: 'Skills' },
      { href: '/marketplace/skills', label: 'Skills Marketplace' },
      { href: '/dashboard/hermes/agents', label: 'Multi-Agent' },
      { href: '/app-shell', label: 'App Shell' },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    items: [
      { href: '/dashboard/settings/access', label: 'Access' },
      { href: '/dashboard/settings/security', label: 'Security' },
      { href: '/dashboard/operations', label: 'Operations' },
      { href: '/dashboard/trinity', label: '🔱 Trinity AI' },
      { href: '/dashboard/command-center', label: 'Command Center' },
      { href: '/dashboard/missions', label: 'Mission' },
      { href: '/dashboard/referrals', label: 'Referrals' },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const getActiveSectionId = () => {
    for (const section of SECTIONS) {
      if (section.items.some((item) => isActive(pathname, item.href, item.exact))) {
        return section.id;
      }
    }
    return null;
  };

  const activeSectionId = getActiveSectionId();

  return (
    <nav className="flex items-center gap-1 overflow-x-auto pb-0.5">
      {SECTIONS.map((section) => {
        const sectionIsActive = expandedSection === section.id || activeSectionId === section.id;
        return (
          <div key={section.id} className="relative">
            <button
              onClick={() =>
                setExpandedSection(
                  expandedSection === section.id ? null : section.id
                )
              }
              className={[
                'whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                sectionIsActive || activeSectionId === section.id
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-400/30 hover:text-slate-100',
              ].join(' ')}
            >
              {section.label} {expandedSection === section.id ? '▴' : '▾'}
            </button>
            {expandedSection === section.id && (
              <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-2xl border border-slate-800 bg-slate-900 py-2 shadow-2xl">
                {section.items.map((item) => {
                  const itemActive = isActive(pathname, item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setExpandedSection(null)}
                      className={[
                        'block px-4 py-2 text-sm font-medium transition-colors',
                        itemActive
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
        );
      })}
    </nav>
  );
}
