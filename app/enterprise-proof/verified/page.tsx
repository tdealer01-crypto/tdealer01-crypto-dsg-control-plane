import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

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

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('org_id', String(profile.org_id))
    .order('created_at', { ascending: false })
    .limit(20);

  const activeAgents = (agents || []).filter((agent) => String(agent.status || 'active') === 'active');
  const defaultAgentId = activeAgents.length === 1 ? String(activeAgents[0].id) : '';

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
          <p className="mt-2 text-sm text-slate-300">Choose an active agent in this org to open a verified runtime report.</p>

          <div className="mt-4 grid gap-2">
            {activeAgents.length === 0 ? (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
                No active agents found in this org scope.
              </div>
            ) : (
              activeAgents.map((agent) => (
                <Link
                  key={String(agent.id)}
                  href={`/enterprise-proof/verified/report?org_id=${encodeURIComponent(String(profile.org_id))}&agent_id=${encodeURIComponent(String(agent.id))}`}
                  className="rounded-lg border border-white/10 bg-slate-900 p-3 text-sm hover:border-emerald-300/40"
                >
                  {String(agent.name || agent.id)} <span className="text-slate-400">({String(agent.id)})</span>
                </Link>
              ))
            )}
          </div>

          <code className="mt-4 block rounded-lg border border-white/10 bg-slate-900 p-3 text-xs text-emerald-200">
            /enterprise-proof/verified/report?org_id={String(profile.org_id)}&agent_id=&lt;agent_id&gt;
          </code>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/enterprise-proof/report" className="rounded-xl border border-white/10 px-4 py-3 font-semibold">
            Back to Public Narrative
          </Link>
          {defaultAgentId ? (
            <Link
              href={`/enterprise-proof/verified/report?org_id=${encodeURIComponent(String(profile.org_id))}&agent_id=${encodeURIComponent(defaultAgentId)}`}
              className="rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"
            >
              Open Verified Runtime Report
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-400">
              Select an agent above to continue
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
