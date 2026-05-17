import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

type Lead = {
  id: string;
  email: string;
  source: string;
  intent: string;
  intent_score: number;
  framework: string | null;
  github_repo: string | null;
  github_stars: number | null;
  company: string | null;
  outreach_sent: boolean;
  outreach_sent_at: string | null;
  messages: Array<{ role: string; sent_at?: string }> | null;
  last_seen_at: string;
};

const SOURCE_LABEL: Record<string, string> = {
  'github-signal': 'GitHub',
  'reddit-signal': 'Reddit',
  'hn-signal': 'HN',
};

const INTENT_COLOR: Record<string, string> = {
  high: 'text-emerald-400',
  browse: 'text-yellow-400',
  unsubscribed: 'text-slate-500',
};

function hasFollowup(messages: Lead['messages']) {
  return messages?.some((m) => m.role === 'followup') ?? false;
}

export default async function AdminLeadsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  if (!auth?.user) redirect('/login');

  const founderEmail = process.env.FOUNDER_EMAIL;
  if (founderEmail && auth.user.email !== founderEmail) redirect('/dashboard');

  const admin = getSupabaseAdmin();
  const { data: leads } = await (admin as any)
    .from('leads')
    .select('id,email,source,intent,intent_score,framework,github_repo,github_stars,company,outreach_sent,outreach_sent_at,messages,last_seen_at')
    .order('intent_score', { ascending: false })
    .limit(200);

  const all = (leads ?? []) as Lead[];
  const total = all.length;
  const contacted = all.filter((l) => l.outreach_sent).length;
  const followedUp = all.filter((l) => hasFollowup(l.messages)).length;
  const unsubscribed = all.filter((l) => l.intent === 'unsubscribed').length;
  const github = all.filter((l) => l.source === 'github-signal').length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 text-white">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lead Pipeline</h1>
          <p className="text-sm text-slate-400">Automated acquisition — GitHub + Social signals</p>
        </div>
        <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white">← Dashboard</Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { label: 'Total leads', value: total },
          { label: 'GitHub', value: github },
          { label: 'Emailed', value: contacted },
          { label: 'Followed up', value: followedUp },
          { label: 'Unsubscribed', value: unsubscribed },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <div className="text-2xl font-bold text-emerald-400">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 bg-slate-800 text-left text-xs text-slate-400">
            <tr>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">Source</th>
              <th className="px-3 py-3">Score</th>
              <th className="px-3 py-3">Framework</th>
              <th className="px-3 py-3">Repo</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Outreach</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {all.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-800/50">
                <td className="px-3 py-2 font-mono text-xs">
                  {lead.source === 'github-signal' ? (
                    <a href={`mailto:${lead.email}`} className="text-emerald-400 hover:underline">
                      {lead.email}
                    </a>
                  ) : (
                    <span className="text-slate-500">{lead.email.split('@')[0]}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-slate-300">
                  {SOURCE_LABEL[lead.source] ?? lead.source}
                </td>
                <td className="px-3 py-2">
                  <span className={`font-bold ${INTENT_COLOR[lead.intent] ?? 'text-white'}`}>
                    {lead.intent_score}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-300">{lead.framework ?? '—'}</td>
                <td className="px-3 py-2 text-xs">
                  {lead.github_repo ? (
                    <a
                      href={`https://github.com/${lead.github_repo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline"
                    >
                      {lead.github_repo}
                      {lead.github_stars ? ` (${lead.github_stars}★)` : ''}
                    </a>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs ${INTENT_COLOR[lead.intent] ?? 'text-white'}`}>
                    {lead.intent === 'unsubscribed' ? 'Unsub' : lead.intent}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {lead.outreach_sent ? (
                    <span className="text-emerald-400">
                      ✓ Sent{hasFollowup(lead.messages) ? ' + Follow-up' : ''}
                    </span>
                  ) : (
                    <span className="text-slate-500">Pending</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {all.length === 0 && (
          <div className="py-16 text-center text-slate-400">No leads yet — crons run at 08:00 UTC</div>
        )}
      </div>
    </main>
  );
}
