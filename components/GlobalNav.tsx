'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Building2,
  ChevronDown,
  DollarSign,
  FileCheck2,
  Menu,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAppLanguage } from '@/store/useAppLanguage';
import { languageStore } from '@/store/languageStore';

const PRODUCT_ITEMS_TH = [
  { href: '/proofgate', icon: Shield, title: 'ProofGate', description: 'ควบคุม action ก่อนกระทบระบบจริง' },
  { href: '/delivery-proof', icon: FileCheck2, title: 'Delivery Proof', description: 'หลักฐานการส่งมอบสำหรับทีมและลูกค้า' },
  { href: '/finance-approval-gate', icon: DollarSign, title: 'Finance Approval Gate', description: 'อนุมัติหรือหยุด action ด้านการเงิน' },
  { href: '/enterprise-ready', icon: Building2, title: 'Enterprise Ready', description: 'เชื่อมระบบเดิมโดยไม่ต้องย้ายทั้งหมด' },
  { href: '/ai-compliance', icon: ShieldCheck, title: 'AI Compliance', description: 'หลักฐานสำหรับกรอบกำกับดูแล AI' },
] as const;

const PRODUCT_ITEMS_EN = [
  { href: '/proofgate', icon: Shield, title: 'ProofGate', description: 'Govern actions before they touch real systems' },
  { href: '/delivery-proof', icon: FileCheck2, title: 'Delivery Proof', description: 'Delivery evidence for teams and customers' },
  { href: '/finance-approval-gate', icon: DollarSign, title: 'Finance Approval Gate', description: 'Review or stop governed finance actions' },
  { href: '/enterprise-ready', icon: Building2, title: 'Enterprise Ready', description: 'Connect existing systems without full migration' },
  { href: '/ai-compliance', icon: ShieldCheck, title: 'AI Compliance', description: 'Evidence for AI governance frameworks' },
] as const;

const NAV_T = {
  th: {
    product: 'ผลิตภัณฑ์',
    how: 'วิธีทำงาน',
    docs: 'เอกสาร',
    pricing: 'ราคา',
    connect: 'เชื่อมระบบ',
    login: 'เข้าสู่ระบบ',
    openMenu: 'เปิดเมนู',
    closeMenu: 'ปิดเมนู',
    productGroup: 'ผลิตภัณฑ์',
    resources: 'ข้อมูล',
  },
  en: {
    product: 'Product',
    how: 'How it works',
    docs: 'Docs',
    pricing: 'Pricing',
    connect: 'Connect',
    login: 'Log in',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    productGroup: 'Products',
    resources: 'Resources',
  },
} as const;

function publicLinkClass(active: boolean) {
  return [
    'rounded-lg px-3 py-2 text-sm font-semibold transition-colors',
    active ? 'bg-white/[0.07] text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
  ].join(' ');
}

export default function GlobalNav() {
  const pathname = usePathname();
  const lang = useAppLanguage();
  const [productOpen, setProductOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = NAV_T[lang];
  const productItems = lang === 'th' ? PRODUCT_ITEMS_TH : PRODUCT_ITEMS_EN;

  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return null;
  }

  const productActive = productItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  function closeMobileMenu() {
    setMobileOpen(false);
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#08090c]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="DSG Control Plane home">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-300/[0.07] text-[11px] font-black tracking-[0.12em] text-blue-100">
              DSG
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-white">DSG Control Plane</span>
              <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Agent Governance</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
            <div
              className="relative"
              onMouseEnter={() => setProductOpen(true)}
              onMouseLeave={() => setProductOpen(false)}
            >
              <button
                type="button"
                onClick={() => setProductOpen((value) => !value)}
                aria-expanded={productOpen}
                aria-haspopup="menu"
                className={`${publicLinkClass(productActive)} inline-flex items-center gap-1.5`}
              >
                {t.product}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${productOpen ? 'rotate-180' : ''}`} />
              </button>

              {productOpen && (
                <div className="absolute left-0 top-full w-[330px] pt-2" role="menu">
                  <div className="rounded-2xl border border-white/[0.09] bg-[#0b0d11] p-2 shadow-2xl shadow-black/35">
                    {productItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setProductOpen(false)}
                          className="flex items-start gap-3 rounded-xl p-3 transition hover:bg-white/[0.05]"
                          role="menuitem"
                        >
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-300/15 bg-blue-300/[0.06] text-blue-200">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span>
                            <span className="block text-sm font-bold text-white">{item.title}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <Link href="/#how-it-works" className={publicLinkClass(pathname === '/')}>
              {t.how}
            </Link>
            <Link href="/docs" className={publicLinkClass(pathname === '/docs' || pathname.startsWith('/docs/'))}>
              {t.docs}
            </Link>
            <Link href="/pricing" className={publicLinkClass(pathname === '/pricing')}>
              {t.pricing}
            </Link>

            <span className="mx-1 h-5 w-px bg-white/10" aria-hidden="true" />

            <button
              type="button"
              onClick={() => languageStore.setLanguage(lang === 'th' ? 'en' : 'th')}
              className="rounded-lg px-2.5 py-2 text-xs font-bold text-slate-500 transition hover:bg-white/[0.04] hover:text-white"
              aria-label="Switch language"
            >
              {lang === 'th' ? 'EN' : 'TH'}
            </button>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.04] hover:text-white">
              {t.login}
            </Link>
            <Link href="/dashboard/integrations" className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200">
              {t.connect}
            </Link>
          </nav>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-slate-300 md:hidden"
            aria-label={t.openMenu}
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#08090c] md:hidden">
          <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
            <Link href="/" onClick={closeMobileMenu} className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-300/[0.07] text-[11px] font-black tracking-[0.12em] text-blue-100">
                DSG
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-white">DSG Control Plane</span>
                <span className="block truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Agent Governance</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={closeMobileMenu}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-slate-300"
              aria-label={t.closeMenu}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{t.resources}</p>
            <div className="mt-2 grid gap-1">
              <Link href="/#how-it-works" onClick={closeMobileMenu} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-200 active:bg-white/[0.05]">
                {t.how}
              </Link>
              <Link href="/docs" onClick={closeMobileMenu} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-200 active:bg-white/[0.05]">
                {t.docs}
              </Link>
              <Link href="/pricing" onClick={closeMobileMenu} className="rounded-xl px-3 py-3 text-sm font-semibold text-slate-200 active:bg-white/[0.05]">
                {t.pricing}
              </Link>
            </div>

            <p className="mt-7 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">{t.productGroup}</p>
            <div className="mt-2 grid gap-1">
              {productItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="flex items-start gap-3 rounded-xl p-3 active:bg-white/[0.05]"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-300/15 bg-blue-300/[0.06] text-blue-200">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-white">{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="space-y-2 border-t border-white/[0.07] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <button
              type="button"
              onClick={() => languageStore.setLanguage(lang === 'th' ? 'en' : 'th')}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-slate-300"
            >
              {lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
            </button>
            <Link href="/dashboard/integrations" onClick={closeMobileMenu} className="block rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-slate-950">
              {t.connect}
            </Link>
            <Link href="/login" onClick={closeMobileMenu} className="block rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-semibold text-slate-300">
              {t.login}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
