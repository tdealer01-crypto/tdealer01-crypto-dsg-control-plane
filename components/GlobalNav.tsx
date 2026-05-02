'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const PUBLIC_NAV = [
  { href: '/', label: 'Home' },
  { href: '/finance-governance', label: 'Finance Governance' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/sync-center', label: 'Sync Center' },
  { href: '/pro-mode', label: 'Pro Mode' },
  { href: '/support', label: 'Support' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/app-shell', label: 'App Shell' },
];

export default function GlobalNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090b]/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
            DSG
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">DSG ONE</p>
            <p className="text-sm font-semibold text-slate-100">AI Runtime Control Plane</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                pathname === item.href
                  ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-amber-300/30 hover:text-amber-50',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Login
          </Link>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-300 md:hidden"
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {open ? (
        <nav className="space-y-2 border-t border-white/10 px-6 py-4 md:hidden">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={[
                'block rounded-xl border px-4 py-3 text-sm font-semibold',
                pathname === item.href
                  ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                  : 'border-white/10 bg-white/[0.03] text-slate-100',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block rounded-xl bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-slate-950"
          >
            Login
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
