/**
 * Isolated Proof Portal Layout
 *
 * CRITICAL: This layout is SEPARATE from dashboard UI.
 * Do NOT use DashboardNav, admin UI components, or dashboard-specific styles.
 * This ensures /proof/* remains accessible even if admin UI has errors.
 */

import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Proof Portal — DSG ONE',
  description: 'View and share your delivery proof reports.',
};

export const dynamic = 'force-dynamic';

export default function ProofLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Isolated header — no DashboardNav */}
      <header className="border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/proof" className="flex shrink-0 flex-col gap-1">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/70">Proof Portal</p>
            <p className="text-lg font-bold leading-tight text-white">Delivery Reports</p>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/delivery-proof"
              className="text-slate-300 transition hover:text-emerald-300"
            >
              Scan Proof
            </Link>
            <a
              href="/api/readiness"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 transition hover:text-emerald-300"
            >
              API Docs
            </a>
          </nav>
        </div>
      </header>

      {/* Main content — isolated from dashboard */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>

      {/* Isolated footer */}
      <footer className="border-t border-slate-800/50 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
        <p>Proof Portal · Evidence-ready delivery for production claims</p>
      </footer>
    </div>
  );
}
