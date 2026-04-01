import { redirect } from 'next/navigation';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { getApprovedApprovalDomains, getApprovedAutoJoinDomains, resolveAccessModeForEmail } from '../../../../lib/auth/access-policy';

export default async function DashboardAccessSettingsPage() {
  const access = await requireOrgPermission('org.manage_access');
  if (!access.ok) {
    redirect('/login?error=not-allowed');
  }

  const admin = getSupabaseAdmin();
  const orgDomain = access.email.split('@')[1] || '';
  const [requestsRes, guestsRes] = await Promise.all([
    admin
      .from('access_requests')
      .select('id, email, email_domain, workspace_name, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20),
    admin
      .from('guest_access_grants')
      .select('id, email, status, expires_at, scope, created_at')
      .eq('org_id', access.orgId)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const requests = (requestsRes.data || []).filter((row) => row.email_domain === orgDomain);
  const guests = guestsRes.data || [];

  const mode = resolveAccessModeForEmail(access.email);

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 text-white">
      <h1 className="text-3xl font-semibold">Access settings</h1>
      <p className="mt-2 text-slate-300">Manage organization access controls, approvals, and guest visibility.</p>

      <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold">1. Access mode</h2>
        <p className="mt-3 text-sm text-slate-300">Current effective mode: <span className="font-semibold text-emerald-300">{mode}</span></p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
          <li>self-serve trial</li>
          <li>approved domains auto-join</li>
          <li>approved domains require approval</li>
          <li>invite only</li>
          <li>sso required</li>
          <li>scim managed</li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold">2. Approved domains</h2>
        <p className="mt-3 text-sm text-slate-300">APPROVED_AUTO_JOIN_DOMAINS: {(getApprovedAutoJoinDomains().join(', ') || 'none configured')}</p>
        <p className="mt-2 text-sm text-slate-300">APPROVED_APPROVAL_DOMAINS: {(getApprovedApprovalDomains().join(', ') || 'none configured')}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold">3. Pending access requests</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2">Email</th><th className="pb-2">Domain</th><th className="pb-2">Workspace</th><th className="pb-2">Created</th><th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="py-2">{item.email}</td><td>{item.email_domain}</td><td>{item.workspace_name || '-'}</td><td>{new Date(item.created_at).toLocaleString()}</td><td>{item.status}</td>
                </tr>
              ))}
              {requests.length === 0 ? <tr><td colSpan={5} className="py-3 text-slate-400">No pending requests.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="text-xl font-semibold">4. Guest access</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="pb-2">Email</th><th className="pb-2">Status</th><th className="pb-2">Expires</th><th className="pb-2">Scope summary</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((item) => (
                <tr key={item.id} className="border-t border-slate-800">
                  <td className="py-2">{item.email}</td><td>{item.status}</td><td>{item.expires_at ? new Date(item.expires_at).toLocaleString() : 'never'}</td><td>{JSON.stringify(item.scope || {})}</td>
                </tr>
              ))}
              {guests.length === 0 ? <tr><td colSpan={4} className="py-3 text-slate-400">No guest grants.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
