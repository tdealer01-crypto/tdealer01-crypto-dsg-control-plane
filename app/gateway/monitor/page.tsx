import Link from 'next/link';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import DecisionExplainer from '../../../components/DecisionExplainer';

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

type CustomerState = 'ready' | 'review' | 'blocked' | 'empty';

async function loadEvents(orgId: string): Promise<GatewayMonitorEvent[]> {
  try {
    const supabase = getSupabaseAdmin() as any;
    const { data, error } = await supabase
      .from('gateway_monitor_events')
      .select('id, org_id, plan_id, tool_name, action, mode, decision, actor_id, actor_role, risk, status, request_hash, decision_hash, record_hash, audit_token, created_at, committed_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) return [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function shortHash(value?: string | null) {
  if (!value) return '—';
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

function classifyCustomerState(events: GatewayMonitorEvent[]): CustomerState {
  if (events.length === 0) return 'empty';
  if (events.some((event) => ['block', 'blocked', 'deny', 'denied'].includes(event.decision))) return 'blocked';
  if (events.some((event) => ['review', 'needs_review', 'manual_review'].includes(event.decision))) return 'review';
  return 'ready';
}

function stateCopy(state: CustomerState) {
  if (state === 'ready') {
    return {
      label: 'READY TO CONTINUE',
      title: 'DSG is allowing the current governed path.',
      body: 'Customer can continue the pilot. Keep exporting evidence before expanding rollout.',
      next: 'Download audit JSON or connect the next workflow.',
      className: 'border-amber-300/35 bg-amber-300/10 text-amber-50',
    };
  }
  if (state === 'review') {
    return {
      label: 'REVIEW NEEDED',
      title: 'A human decision is required before execution.',
      body: 'Customer sees exactly where the action paused, who must review, and which proof is missing.',
      next: 'Open approvals, review evidence, then approve or reject.',
      className: 'border-blue-300/35 bg-blue-300/10 text-blue-50',
    };
  }
  if (state === 'blocked') {
    return {
      label: 'BLOCKED',
      title: 'DSG stopped a risky or unsupported action.',
      body: 'Customer sees a safe stop instead of silent failure. Fix policy, identity, risk, or proof gap before retry.',
      next: 'Open evidence, inspect request hash, then adjust the workflow.',
      className: 'border-red-400/40 bg-red-500/10 text-red-50',
    };
  }
  return {
    label: 'WAITING FOR FIRST EVENT',
    title: 'No customer workflow has reached this monitor yet.',
    body: 'Start with one command: register integration, run plan-check, commit audit, then return here.',
    next: 'Use the command cards below to create the first visible proof event.',
    className: 'border-white/10 bg-white/[0.04] text-slate-100',
  };
}

function decisionClass(decision: string) {
  const normalized = decision.toLowerCase();
  if (['allow', 'pass', 'allowed'].includes(normalized)) return 'border-amber-300/35 bg-amber-300/10 text-amber-100';
  if (['review', 'needs_review', 'manual_review'].includes(normalized)) return 'border-blue-300/35 bg-blue-300/10 text-blue-100';
  return 'border-red-400/40 bg-red-500/10 text-red-100';
}

export default async function GatewayMonitorPage({ searchParams }: { searchParams?: { orgId?: string } }) {
  const orgId = searchParams?.orgId || 'org-smoke';
  const events = await loadEvents(orgId);
  const committed = events.filter((event) => event.status === 'committed').length;
  const allowed = events.filter((event) => ['allow', 'pass', 'allowed'].includes(event.decision)).length;
  const review = events.filter((event) => ['review', 'needs_review', 'manual_review'].includes(event.decision)).length;
  const blocked = events.filter((event) => !['allow', 'pass', 'allowed', 'review', 'needs_review', 'manual_review'].includes(event.decision)).length;
  const latest = events[0];
  const exportHref = `/api/gateway/audit/export?orgId=${encodeURIComponent(orgId)}`;
  const state = stateCopy(classifyCustomerState(events));

  const commands = [
    {
      title: '1. Plan-check one action',
      body: 'Use this first to prove DSG can decide before the customer system executes.',
      code: `curl -s -X POST /api/gateway/plan-check \\\n  -H 'content-type: application/json' \\\n  -H 'x-org-id: ${orgId}' \\\n  -H 'x-actor-id: agent-001' \\\n  -H 'x-actor-role: agent_operator' \\\n  -d '{"toolName":"customer_erp","action":"approve_invoice","risk":"medium"}'`,
    },
    {
      title: '2. Commit audit result',
      body: 'Commit after the customer runtime finishes so evidence is not just a screen claim.',
      code: `curl -s -X POST /api/gateway/audit/commit \\\n  -H 'content-type: application/json' \\\n  -d '{"auditToken":"gat_from_plan_check","result":{"ok":true,"provider":"customer_runtime"}}'`,
    },
    {
      title: '3. Export buyer evidence',
      body: 'Give IT, finance, or audit a portable proof bundle before rollout.',
      code: `curl -s '${exportHref}'`,
    },
  ];

  return (
    <main className="dsg-shell min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-7xl">
        <section className="dsg-card-blue rounded-[2rem] p-8">
          <p className="dsg-chip">Customer Monitor</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.75fr] lg:items-end">
            <div>
              <h1 className="dsg-text-gradient text-4xl font-black tracking-tight md:text-6xl">See what DSG decided, why it decided, and what to do next.</h1>
              <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-200">
                This monitor is for the buyer, operator, and auditor. It shows live action status, risk decision, evidence hashes, audit export, and the exact command path to reproduce the result.
              </p>
            </div>
            <div className={`rounded-3xl border p-5 ${state.className}`}>
              <p className="text-xs font-black uppercase tracking-[0.22em]">{state.label}</p>
              <h2 className="mt-3 text-2xl font-black text-white">{state.title}</h2>
              <p className="mt-3 text-sm leading-7">{state.body}</p>
              <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm font-bold">Next: {state.next}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/gateway/monitor?orgId=${encodeURIComponent(orgId)}`} className="dsg-btn-gold">Refresh monitor</Link>
            <Link href={exportHref} className="dsg-btn-blue">Download audit JSON</Link>
            <Link href="/approvals?orgId=org-smoke" className="dsg-btn-red">Open approvals</Link>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {[
            ['Org', orgId],
            ['Events', String(events.length)],
            ['Allowed', String(allowed)],
            ['Review', String(review)],
            ['Blocked', String(blocked)],
          ].map(([label, value]) => (
            <div key={label} className="dsg-card rounded-[1.5rem] p-5">
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-2 break-all text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="dsg-card rounded-[1.5rem] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Latest visible proof</p>
            {latest ? (
              <>
              <DecisionExplainer
                decision={latest.decision}
                reason={`${latest.tool_name} / ${latest.action}`}
                className="mt-5"
              />
              <dl className="mt-4 space-y-4 text-sm">
                <div><dt className="text-slate-400">Action</dt><dd className="mt-1 font-bold text-white">{latest.tool_name} / {latest.action}</dd></div>
                <div><dt className="text-slate-400">Decision</dt><dd className="mt-1"><span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase ${decisionClass(latest.decision)}`}>{latest.decision}</span></dd></div>
                <div><dt className="text-slate-400">Risk</dt><dd className="mt-1 font-mono text-slate-200">{latest.risk ?? 'unclassified'}</dd></div>
                <div><dt className="text-slate-400">Request hash</dt><dd className="mt-1 font-mono text-xs text-blue-200">{shortHash(latest.request_hash)}</dd></div>
                <div><dt className="text-slate-400">Record hash</dt><dd className="mt-1 font-mono text-xs text-amber-200">{shortHash(latest.record_hash)}</dd></div>
              </dl>
              </>
            ) : (
              <p className="mt-5 text-sm leading-7 text-slate-300">No proof event yet. Use command 1 below to create the first visible event, then refresh this page.</p>
            )}
          </div>

          <div className="dsg-card rounded-[1.5rem] p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-200">Monitor by organization</p>
                <h2 className="mt-2 text-2xl font-black">Load customer workspace</h2>
                <p className="mt-2 text-sm text-slate-400">Customer should understand which org/workspace they are watching before trusting the proof.</p>
              </div>
              <form className="flex gap-2" action="/gateway/monitor">
                <input name="orgId" defaultValue={orgId} className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" aria-label="Organization ID" />
                <button className="rounded-xl bg-amber-300 px-4 py-3 text-sm font-bold text-slate-950">Load</button>
              </form>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {['Who requested it?', 'Was it allowed/review/blocked?', 'What proof can I export?'].map((question) => (
                <div key={question} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm font-semibold text-slate-200">{question}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">Customer-readable history</p>
              <h2 className="mt-2 text-2xl font-black">Latest decisions and evidence</h2>
              <p className="mt-2 text-sm text-slate-400">A buyer should not need to read logs. This table answers action, decision, owner, proof hash, and exportability.</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.2em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Time</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Decision</th>
                  <th className="px-3 py-3">Evidence state</th>
                  <th className="px-3 py-3">Actor</th>
                  <th className="px-3 py-3">Request hash</th>
                  <th className="px-3 py-3">Record hash</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-white/10 text-slate-200">
                    <td className="whitespace-nowrap px-3 py-4">{new Date(event.created_at).toLocaleString()}</td>
                    <td className="px-3 py-4"><p className="font-semibold text-white">{event.tool_name}</p><p className="text-xs text-slate-500">{event.action} · {event.mode} · {event.risk ?? 'unclassified'}</p></td>
                    <td className="px-3 py-4"><span className={`rounded-full border px-3 py-1 text-xs uppercase ${decisionClass(event.decision)}`}>{event.decision}</span></td>
                    <td className="px-3 py-4">{event.status === 'committed' ? 'Evidence committed' : 'Waiting for commit'}</td>
                    <td className="px-3 py-4">{event.actor_id ?? '—'}</td>
                    <td className="px-3 py-4 font-mono text-xs">{shortHash(event.request_hash)}</td>
                    <td className="px-3 py-4 font-mono text-xs">{shortHash(event.record_hash)}</td>
                  </tr>
                ))}
                {events.length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-400">No monitor events yet. Run plan-check, commit audit, then refresh.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-3">
          {commands.map((command) => (
            <div key={command.title} className="dsg-card-blue rounded-[1.5rem] p-6">
              <h2 className="text-xl font-black text-white">{command.title}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">{command.body}</p>
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs leading-6 text-blue-100"><code>{command.code}</code></pre>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
