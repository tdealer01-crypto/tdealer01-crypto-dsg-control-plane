import Link from 'next/link';
import type { ReactNode } from 'react';
import OneNav from './_components/OneNav';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DSG ONE — Verified Execution',
  description:
    'Approve a plan once. DSG proves every action matches it, and holds evidence that it ran.',
};

/**
 * DSG ONE application shell.
 *
 * Deliberately separate from /dashboard: this is the single-product surface
 * described in docs/product/DSG_ONE_VERIFIED_EXECUTION.md, and the operator
 * dashboard keeps its own broader navigation.
 */
export default function OneLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-6 py-3">
          <Link href="/one" className="flex shrink-0 flex-col leading-tight">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">DSG ONE</span>
            <span className="text-sm font-semibold">Verified Execution</span>
          </Link>
          <OneNav />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
