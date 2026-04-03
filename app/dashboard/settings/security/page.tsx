import { redirect } from 'next/navigation';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getApprovedApprovalDomains } from '../../../../lib/auth/access-policy';

export const dynamic = 'force-dynamic';

export default async function DashboardSecuritySettingsPage() {
  const access = await requireOrgPermission('org.manage_security');
  if (!access.ok) {
    redirect('/login?error=not-allowed');
  }

  const admin = getSupabaseAdmin();
  const [eventsRes, guestRes] = await Promise.all([
    admin
      .from('sign_in_events')
      .select('id, email, event_type, source, success, created_at')
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: false })
      .limit(30),
    admin.from('guest_access_grants').select('id').eq('org_id', access.orgId).eq('status', 'active').limit(1),
  ]);

  const events = eventsRes.data || [];

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white">
      <h1 className="text-3xl font-semibold">Security settings</h1>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold">1. Recent sign-in events</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400"><tr><th>Email</th><th>Event</th><th>Source</th><th>Success</th><th>Created</th></tr></thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-slate-800"><td className="py-2">{event.email}</td><td>{event.event_type}</td><td>{event.source || '-'}</td><td>{String(event.success)}</td><td>{new Date(event.created_at).toLocaleString()}</td></tr>
              ))}
              {events.length === 0 ? <tr><td colSpan={5} className="py-3 text-slate-400">No recent sign-ins.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold">2. Current session notes</h2>
        <p className="mt-3 text-sm text-slate-300">Email-based magic-link auth is active. Session identity comes from Supabase Auth and maps to org membership.</p>
        <p className="mt-2 text-sm text-slate-300">Signed in as: {access.email}</p>
        <p className="mt-2 text-sm text-slate-300">Organization: {access.orgId}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold">3. Security posture</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Card label="Email login enabled" value="yes" />
          <Card label="SSO required" value={String((process.env.ACCESS_MODE || '').toLowerCase() === 'sso_required')} />
          <Card label="Approval-required domains configured" value={String(getApprovedApprovalDomains().length > 0)} />
          <Card label="Guest access enabled" value={String((guestRes.data || []).length > 0)} />
        </div>
      </section>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-emerald-300">{value}</p>
    </div>
  );
}
