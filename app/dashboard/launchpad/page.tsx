import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LaunchpadApp } from '@/components/launchpad/LaunchpadApp';

export const dynamic = 'force-dynamic';

export default async function LaunchpadPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard/launchpad');
  }

  const { data: memberships, error } = await supabase
    .from('dsg_workspace_members')
    .select('workspace_id, role')
    .eq('actor_id', user.id)
    .limit(1);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6">
          <h1 className="text-xl font-semibold text-white">LaunchPad unavailable</h1>
          <p className="mt-2 text-sm text-rose-200">Could not resolve your DSG workspace membership.</p>
          <p className="mt-2 font-mono text-xs text-rose-300">{error.message}</p>
        </div>
      </main>
    );
  }

  const membership = memberships?.[0];
  if (!membership?.workspace_id) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6">
          <h1 className="text-xl font-semibold text-white">No DSG workspace access</h1>
          <p className="mt-2 text-sm text-amber-100">Your signed-in account is not a member of a DSG workspace yet.</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto max-w-7xl px-6 pt-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">DSG Control Plane</p>
        <h1 className="mt-2 text-3xl font-bold text-white">LaunchPad Checklist Tracker</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Workspace-scoped launch tracking backed by the DSG Supabase backend. Changes are authenticated and persisted through DSG API routes.
        </p>
      </div>
      <LaunchpadApp workspaceId={membership.workspace_id} />
    </main>
  );
}
