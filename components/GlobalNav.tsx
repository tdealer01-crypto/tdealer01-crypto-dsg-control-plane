'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Shield,
  Building2,
  DollarSign,
  Zap,
  ShieldCheck,
  ChevronDown,
  FileCheck,
} from 'lucide-react';

const PRODUCT_ITEMS = [
  {
    href: '/delivery-proof',
    icon: FileCheck,
    title: 'Delivery Proof',
    description: 'AI code proof report สำหรับ agency',
    highlight: true,
  },
  {
    href: '/proofgate',
    icon: Shield,
    title: 'ProofGate',
    description: 'Runtime control layer',
  },
  {
    href: '/enterprise-ready',
    icon: Building2,
    title: 'Enterprise Ready',
    description: 'No-migration enterprise setup',
  },
  {
    href: '/finance-governance',
    icon: DollarSign,
    title: 'Finance Governance',
    description: 'Payment & finance controls',
  },
  {
    href: '/finance-approval-gate',
    icon: DollarSign,
    title: 'Finance Approval Gate',
    description: 'AI payment approval pilot',
  },
  {
    href: '/automation',
    icon: Zap,
    title: 'Automation',
    description: 'Webhook & workflow automation',
  },
  {
    href: '/ai-compliance',
    icon: ShieldCheck,
    title: 'AI Compliance',
    description: 'ISO 42001, NIST AI RMF',
  },
  {
    href: '/eu-ai-act',
    icon: Shield,
    title: 'EU AI Act',
    description: 'Block before damage, not after',
  },
];

const FLAT_LINKS = [
  { href: '/blog',       label: 'Blog',       match: (p: string) => p === '/blog' || p.startsWith('/blog/') },
  { href: '/pricing',    label: 'Pricing',    match: (p: string) => p === '/pricing' },
  { href: '/docs',       label: 'Docs',       match: (p: string) => p === '/docs' || p.startsWith('/docs/') },
  { href: '/quickstart', label: 'Quickstart', match: (p: string) => p === '/quickstart' },
];

export default function GlobalNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [mobileProductOpen, setMobileProductOpen] = useState(false);

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return null;
  }

  function openMobileMenu() {
    setMobileOpen(true);
    setMobileProductOpen(true);
  }

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08090b]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
              DSG
            </span>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">DSG ONE</p>
              <p className="text-sm font-semibold text-slate-100">ProofGate Control Plane</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 md:flex">
            {/* Product dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setProductOpen(true)}
              onMouseLeave={() => setProductOpen(false)}
            >
              <button
                className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-amber-300/30 hover:text-amber-50"
                onClick={() => setProductOpen((v) => !v)}
                aria-expanded={productOpen}
                aria-haspopup="true"
              >
                Product
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    productOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {productOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl border border-white/15 bg-[#0c0e12] p-2 shadow-2xl">
                  {PRODUCT_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setProductOpen(false)}
                      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.05] ${'highlight' in item && item.highlight ? 'border border-emerald-400/20 bg-emerald-400/5' : ''}`}
                    >
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${'highlight' in item && item.highlight ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-amber-300'}`}>
                        <item.icon className="h-3.5 w-3.5" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-slate-100">
                          {item.title}
                          {'highlight' in item && item.highlight && (
                            <span className="ml-2 rounded-full bg-emerald-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-300">New</span>
                          )}
                        </span>
                        <span className="block text-xs text-slate-400">{item.description}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {FLAT_LINKS.map(({ href, label, match }) => (
              <Link
                key={href}
                href={href}
                className={[
                  'rounded-xl border px-3 py-2 text-sm font-semibold transition',
                  match(pathname)
                    ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-amber-300/30 hover:text-amber-50',
                ].join(' ')}
              >
                {label}
              </Link>
            ))}

            {/* CTAs */}
            <Link href="/dashboard/integrations" className="dsg-btn-gold text-sm">
              Start free →
            </Link>
            <Link href="/login" className="dsg-btn-blue text-sm">
              Login
            </Link>
          </nav>

          {/* Mobile hamburger — always three-line icon; × lives inside overlay */}
          <button
            onClick={openMobileMenu}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-300 md:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile full-screen overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#08090b] md:hidden">
          {/* Overlay header */}
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
            <Link href="/" onClick={closeMobileMenu} className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/35 bg-amber-300/10 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">
                DSG
              </span>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-500">DSG ONE</p>
                <p className="text-sm font-semibold text-slate-100">ProofGate Control Plane</p>
              </div>
            </Link>
            <button
              onClick={closeMobileMenu}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-slate-300"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable nav content */}
          <div className="flex-1 space-y-2 overflow-y-auto px-6 py-4">
            {/* Product accordion */}
            <button
              onClick={() => setMobileProductOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-100"
            >
              Product
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${
                  mobileProductOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {mobileProductOpen && (
              <div className="ml-2 space-y-1 border-l border-white/10 pl-4">
                {PRODUCT_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.05] ${'highlight' in item && item.highlight ? 'border border-emerald-400/20 bg-emerald-400/5' : ''}`}
                  >
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${'highlight' in item && item.highlight ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-white/10 bg-white/[0.04] text-amber-300'}`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-100">{item.title}</span>
                      <span className="block text-xs text-slate-400">{item.description}</span>
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Flat links */}
            {FLAT_LINKS.map(({ href, label, match }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobileMenu}
                className={[
                  'block rounded-xl border px-4 py-3 text-sm font-semibold',
                  match(pathname)
                    ? 'border-amber-300/40 bg-amber-300/10 text-amber-100'
                    : 'border-white/10 bg-white/[0.03] text-slate-100',
                ].join(' ')}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Sticky bottom CTAs */}
          <div className="shrink-0 space-y-2 border-t border-white/10 px-6 py-4">
            <Link
              href="/dashboard/integrations"
              onClick={closeMobileMenu}
              className="block rounded-xl bg-amber-300 px-4 py-3 text-center text-sm font-semibold text-slate-950"
            >
              Start free →
            </Link>
            <Link
              href="/login"
              onClick={closeMobileMenu}
              className="block rounded-xl border border-blue-300/30 bg-blue-300/10 px-4 py-3 text-center text-sm font-semibold text-blue-200"
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
