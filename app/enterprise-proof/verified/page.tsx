import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

export default async function VerifiedEnterpriseProofPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', auth.user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    redirect('/login');
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white" data-testid="verified-proof-entry">
      <div className="mx-auto max-w-4xl">
        <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200">
          Verified Runtime Evidence
        </div>
        <h1 className="mt-6 text-4xl font-bold">Authenticated enterprise runtime proof workspace</h1>
        <p className="mt-4 text-slate-300">
          This surface is org-scoped and generated from runtime data. It is separate from the public AI-first narrative pages.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Current context</p>
          <p className="mt-3 text-lg">Org ID: {String(profile.org_id)}</p>
          <p className="mt-2 text-sm text-slate-300">Provide an agent_id in the verified report URL to inspect org-scoped runtime evidence.</p>
          <code className="mt-4 block rounded-lg border border-white/10 bg-slate-900 p-3 text-xs text-emerald-200">
            /enterprise-proof/verified/report?org_id={String(profile.org_id)}&agent_id=&lt;agent_id&gt;
          </code>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-proof/report" className="rounded-xl border border-white/10 px-4 py-3 font-semibold">
            Back to Public Narrative
          </Link>
          <Link
            href={`/enterprise-proof/verified/report?org_id=${encodeURIComponent(String(profile.org_id))}`}
            className="rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"
          >
            Open Verified Runtime Report
          </Link>
        </div>
      </div>
    </main>
  );
}
