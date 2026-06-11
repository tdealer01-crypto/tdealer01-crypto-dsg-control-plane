import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StripeAppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard/stripe-app');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold text-white">DSG Stripe App</h1>
        <p className="mt-2 text-slate-400">
          Governance for Stripe operations — pre-execution gating and audit trails
        </p>
      </div>

      {/* Primary CTA: Connect Stripe — Install from Partner pattern (Stripe review requirement) */}
      <div className="rounded-xl border border-violet-700/50 bg-violet-950/40 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
              Step 1 — Connect your Stripe account
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              Link Stripe to enable governance controls
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Click below to authorize DSG Governance Gate via Stripe OAuth. You will be
              redirected to Stripe and returned here automatically after authorizing.
            </p>
          </div>
          {/* href points to the server-side install route that builds the OAuth redirect URL.
              This satisfies Stripe's "Install from Partner" review requirement:
              user logs in to this platform first, then clicks to authorize Stripe. */}
          <Link
            href="/api/stripe/connect/install"
            className="shrink-0 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Connect Stripe Account
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Connect Card */}
        <Link href="/api/stripe/connect/install" className="group">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-600 hover:bg-slate-900">
            <h3 className="text-lg font-semibold text-white">Connect Stripe Account</h3>
            <p className="mt-2 text-sm text-slate-400">
              Link your Stripe account to enable governance controls
            </p>
            <div className="mt-4">
              <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Connect Account
              </button>
            </div>
          </div>
        </Link>

        {/* Policies Card */}
        <Link href="/dashboard/stripe-app/policies" className="group">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-600 hover:bg-slate-900">
            <h3 className="text-lg font-semibold text-white">Governance Policies</h3>
            <p className="mt-2 text-sm text-slate-400">
              Create and manage rules for charges, payouts, refunds
            </p>
            <div className="mt-4">
              <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                Manage Policies
              </button>
            </div>
          </div>
        </Link>

        {/* Audit Card */}
        <Link href="/dashboard/stripe-app/audit" className="group">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-600 hover:bg-slate-900">
            <h3 className="text-lg font-semibold text-white">Audit Trail</h3>
            <p className="mt-2 text-sm text-slate-400">
              View all gated operations and compliance decisions
            </p>
            <div className="mt-4">
              <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                View Audit Log
              </button>
            </div>
          </div>
        </Link>

        {/* Approvals Card */}
        <Link href="/dashboard/stripe-app/approvals" className="group">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-600 hover:bg-slate-900">
            <h3 className="text-lg font-semibold text-white">Pending Approvals</h3>
            <p className="mt-2 text-sm text-slate-400">
              Review and approve operations that require manual review
            </p>
            <div className="mt-4">
              <button className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                View Pending
              </button>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
