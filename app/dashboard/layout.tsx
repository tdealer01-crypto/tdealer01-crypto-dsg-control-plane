import Link from 'next/link';

const NAV = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/command-center', label: 'Command Center' },
  { href: '/dashboard/integration', label: 'Integration' },
  { href: '/dashboard/mission', label: 'Mission' },
  { href: '/dashboard/operations', label: 'Operations' },
  { href: '/dashboard/executions', label: 'Executions' },
  { href: '/dashboard/skills', label: 'Skills' },
  { href: '/dashboard/verification', label: 'Verification' },
  { href: '/dashboard/proofs', label: 'Proofs' },
  { href: '/dashboard/ledger', label: 'Ledger' },
  { href: '/dashboard/capacity', label: 'Capacity' },
  { href: '/dashboard/billing', label: 'Billing' },
  { href: '/dashboard/agents', label: 'Agents' },
  { href: '/dashboard/policies', label: 'Policies' },
  { href: '/dashboard/audit', label: 'Audit' },
  { href: '/dashboard/settings/access', label: 'Access Settings' },
  { href: '/dashboard/settings/security', label: 'Security Settings' },
  { href: '/app-shell', label: 'App Shell' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">DSG ONE</p>
            <p className="text-lg font-semibold">Command Center</p>
          </div>
          <nav className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-400"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
