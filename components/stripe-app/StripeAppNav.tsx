'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard/stripe-app', label: 'Overview' },
  { href: '/dashboard/stripe-app/connect', label: 'Connect Account' },
  { href: '/dashboard/stripe-app/policies', label: 'Policies' },
  { href: '/dashboard/stripe-app/audit', label: 'Audit Trail' },
  { href: '/dashboard/stripe-app/approvals', label: 'Approvals' },
];

export default function StripeAppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 border-b border-slate-700 mb-6 overflow-x-auto">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              isActive
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
