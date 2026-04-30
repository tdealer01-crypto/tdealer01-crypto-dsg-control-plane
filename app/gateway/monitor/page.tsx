import Link from 'next/link';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

type GatewayMonitorEvent = {
  id: string;
  org_id: string;
  plan_id: string | null;
  tool_name: string;
  action: string;
  mode: string;
  decision: string;
  actor_id: string | null;
  actor_role: string | null;
  risk: string | null;
  status: string;
  request_hash: string;
  decision_hash: string | null;
  record_hash: string | null;
  audit_token: string | null;
  created_at: string;
  committed_at: string | null;
};

async function loadEvents(orgId: string): Promise<GatewayMonitorEvent[]> {
  try {
    const supabase = getSupabaseAdmin() as any;
    const { data, error } = await supabase
      .from('gateway_monitor_events')
      .select('id, org_id, plan_id, tool_name, action, mode, decision, actor_id, actor_role, risk, status, request_hash, decision_hash, record_hash, audit_token, created_at, committed_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      return [];
    }

    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function shortHash(value?: string | null) {
  if (!value) {
    return '—';
  }
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export default async function GatewayMonitorPage({ searchParams }: { searchParams?: { orgId?: string } }) {
  const orgId = searchParams?.orgId || 'org-smoke';
  const events = await loadEvents(orgId);
  const committed = events.filter((event) => event.status === 'committed').length;
  const allowed = events.filter((event) => event.decision === 'allow').length;
  const blocked = events.filter((event) => event.decision !== 'allow').length;
  const exportHref = `/api/gateway/audit/export?orgId=${encodeURIComponent(orgId)}`;

  return (
    <main className="min-h-screen bg-[#040918] px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">DSG Monitor Mode</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">Realtime gateway audit monitor</h1>
          <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-200">
            Monitor Mode lets customer tools execute in their own runtime while DSG returns decision, audit token,
            request hash, and final record hash for audit proof.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/gateway/monitor?orgId=${encodeURIComponent(orgId)}`} className="rounded-2xl bg-cyan-300 px-5 py-3 font-bold text-slate-950">
              Refresh monitor
            </Link>
            <Link href={exportHref} className="rounded-2xl border border-cyan-200/40 px-5 py-3 font-bold text-cyan-100">
              Download audit JSON
            </Link>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          {[
            ['Org', orgId],
            ['Events', String(events.length)],
            ['Allowed', String(allowed)],
            ['Committed', String(committed)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 break-all text-2xl font-bold text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Monitor history</h2>
              <p className="mt-2 text-sm text-slate-400">Latest plan checks and audit commits for this organization.</p>
            </div>
            <form className="flex gap-2" action="/gateway/monitor">
              <input
                name="orgId"
                defaultValue={orgId}
                className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"
                aria-label="Organization ID"
              />
              <button className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-slate-950">Load</button>
            </form>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Tool</th>
                  <th className="px-3 py-3">Decision</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Actor</th>
                  <th className="px-3 py-3">Request hash</th>
                  <th className="px-3 py-3">Record hash</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-white/10 text-slate-200">
                    <td className="whitespace-nowrap px-3 py-4">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="px-3 py-4">
                      <p className="font-semibold text-white">{event.tool_name}</p>
                      <p className="text-xs text-slate-500">{event.action} · {event.mode} · {event.risk ?? 'unclassified'}</p>
                    </td>
                    <td className="px-3 py-4"><span className="rounded-full border border-cyan-300/25 px-3 py-1 text-xs uppercase text-cyan-100">{event.decision}</span></td>
                    <td className="px-3 py-4">{event.status}</td>
                    <td className="px-3 py-4">{event.actor_id ?? '—'}</td>
                    <td className="px-3 py-4 font-mono text-xs">{shortHash(event.request_hash)}</td>
                    <td className="px-3 py-4 font-mono text-xs">{shortHash(event.record_hash)}</td>
                  </tr>
                ))}
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-400">
                      No monitor events yet. Run /api/gateway/plan-check, then /api/gateway/audit/commit.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Runtime settings</h2>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/40 p-4 text-xs leading-6 text-cyan-100">{`POST /api/gateway/plan-check
x-org-id: ${orgId}
x-actor-id: agent-001
x-actor-role: agent_operator
x-org-plan: enterprise`}</pre>
          </div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-bold">Audit commit</h2>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-black/40 p-4 text-xs leading-6 text-cyan-100">{`POST /api/gateway/audit/commit
{
  "auditToken": "gat_...",
  "result": {
    "ok": true,
    "provider": "customer_runtime"
  }
}`}</pre>
          </div>
        </section>
      </div>
    </main>
  );
}
