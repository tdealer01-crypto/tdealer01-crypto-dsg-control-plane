'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const PUBLIC_NAV = [
  { href: '/', label: 'Home' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
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
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">DSG ONE</span>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                pathname === item.href
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                  : 'border-slate-800 bg-slate-900 text-slate-100 hover:border-emerald-400',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Login
          </Link>
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="rounded-lg border border-slate-700 p-2 text-slate-300 md:hidden"
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
        <nav className="space-y-2 border-t border-slate-800 px-6 py-4 md:hidden">
          {PUBLIC_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={[
                'block rounded-xl border px-4 py-3 text-sm font-semibold',
                pathname === item.href
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                  : 'border-slate-800 bg-slate-900 text-slate-100',
              ].join(' ')}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-slate-950"
          >
            Login
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
