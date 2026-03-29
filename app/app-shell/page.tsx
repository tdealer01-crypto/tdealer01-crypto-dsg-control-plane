'use client';

import Link from 'next/link';

const links = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/command-center', label: 'Command Center' },
  { href: '/dashboard/mission', label: 'Mission' },
  { href: '/dashboard/operations', label: 'Operations' },
  { href: '/dashboard/executions', label: 'Executions' },
  { href: '/dashboard/proofs', label: 'Proofs' },
  { href: '/dashboard/ledger', label: 'Ledger' },
  { href: '/dashboard/capacity', label: 'Capacity' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/audit', label: 'Audit' },
];

export default function AppShellPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-semibold">DSG ONE App Shell</h1>
        <p className="mt-2 text-slate-400">Unified entry page for the live command center routes.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-2xl border border-slate-800 bg-slate-900 p-6 font-semibold text-slate-100 hover:border-emerald-400">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
