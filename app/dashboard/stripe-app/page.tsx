import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function StripeAppPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/dashboard/stripe-app');

  const params = searchParams ? await searchParams : {};
  const connected = getParam(params, 'connected') === 'true';
  const mode = getParam(params, 'mode') || 'live';
  const accountId = getParam(params, 'account_id');
  const connectedAt = getParam(params, 'connected_at');

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-6 py-8">
      <div>
        <h1 className="text-3xl font-bold text-white">DSG Stripe App</h1>
        <p className="mt-2 text-slate-400">
          Governance for Stripe operations — pre-execution gating and audit trails
        </p>
      </div>

      <section className={connected ? 'rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-6' : 'rounded-xl border border-violet-700/50 bg-violet-950/40 p-6'}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={connected ? 'text-xs font-semibold uppercase tracking-wider text-emerald-300' : 'text-xs font-semibold uppercase tracking-wider text-violet-400'}>
              Stripe connection status
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">
              {connected ? 'Stripe account connected' : 'Connect your Stripe account'}
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {connected
                ? `Install completed. Mode: ${mode}${accountId ? ` · Account: ${accountId}` : ''}`
                : 'Authorize DSG Governance Gate through Stripe OAuth.'}
            </p>
            {connectedAt && <p className="mt-1 text-xs text-slate-500">Connected at: {connectedAt}</p>}
          </div>
          <Link
            href="/api/stripe/connect/install?mode=live"
            className="shrink-0 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
          >
            {connected ? 'Reconnect Live Mode' : 'Connect Stripe Account'}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/50 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Installation checks</h2>
            <p className="mt-1 text-sm text-slate-400">Use these buttons to verify Live mode and Sandbox mode.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/api/stripe/connect/install?mode=live" className="rounded-lg bg-blue-600 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-500">
              Install Live Mode App
            </Link>
            <Link href="/api/stripe/connect/install?mode=sandbox" className="rounded-lg bg-slate-700 px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-slate-600">
              Install Sandbox App
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/dashboard/stripe-app/policies" className="group">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-600 hover:bg-slate-900">
            <h3 className="text-lg font-semibold text-white">Governance Policies</h3>
            <p className="mt-2 text-sm text-slate-400">Create and manage rules for charges, payouts, refunds</p>
          </div>
        </Link>
        <Link href="/dashboard/stripe-app/audit" className="group">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-600 hover:bg-slate-900">
            <h3 className="text-lg font-semibold text-white">Audit Trail</h3>
            <p className="mt-2 text-sm text-slate-400">View all gated operations and compliance decisions</p>
          </div>
        </Link>
        <Link href="/dashboard/stripe-app/approvals" className="group">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-600 hover:bg-slate-900">
            <h3 className="text-lg font-semibold text-white">Pending Approvals</h3>
            <p className="mt-2 text-sm text-slate-400">Review operations that require manual review</p>
          </div>
        </Link>
        <Link href="/api/stripe/connect/install?mode=live" className="group">
          <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 transition-all hover:border-slate-600 hover:bg-slate-900">
            <h3 className="text-lg font-semibold text-white">Reconnect</h3>
            <p className="mt-2 text-sm text-slate-400">Start the Stripe OAuth connection again</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
