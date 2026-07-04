/**
 * Outreach approval queue (human-in-the-loop for marketing-agent emails).
 *
 * GET  — list pending approvals (authenticated operator)
 * POST — { ids: string[], decision: 'approve' | 'reject' } (max 20 per call)
 *        approve → send via sendGitHubLeadOutreach + mark lead outreach_sent
 *        reject  → mark rejected, nothing is sent
 */

import { NextResponse } from 'next/server';
import { readJsonBody } from '../../../../../lib/security/request-json';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { requireActiveProfile } from '../../../../../lib/auth/require-active-profile';
import { sendGitHubLeadOutreach } from '../../../../../lib/email/sales';
import { logApiError } from '../../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

interface DecisionInput {
  ids?: string[];
  decision?: 'approve' | 'reject';
}

export async function GET() {
  const profile = await requireActiveProfile();
  if (!profile.ok) {
    return NextResponse.json({ error: profile.error }, { status: profile.status });
  }

  try {
    const admin = getSupabaseAdmin() as any;
    const { data, error } = await admin
      .from('outreach_approvals')
      .select('id, lead_email, framework, github_repo, github_stars, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) {
      return NextResponse.json({ error: 'query failed' }, { status: 500 });
    }
    return NextResponse.json({ pending: data ?? [], count: (data ?? []).length });
  } catch {
    return NextResponse.json({ error: 'queue unavailable' }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const profile = await requireActiveProfile();
  if (!profile.ok) {
    return NextResponse.json({ error: profile.error }, { status: profile.status });
  }

  const parsed = await readJsonBody<DecisionInput>(request, { maxBytes: 4_096 });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }

  const { ids, decision } = parsed.value ?? {};
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 20) {
    return NextResponse.json({ error: 'ids must be a non-empty array (max 20)' }, { status: 400 });
  }
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: "decision must be 'approve' or 'reject'" }, { status: 400 });
  }

  const admin = getSupabaseAdmin() as any;
  const nowIso = new Date().toISOString();
  const results: Array<{ id: string; status: string; error?: string }> = [];

  for (const id of ids) {
    const { data: row, error: readErr } = await admin
      .from('outreach_approvals')
      .select('id, lead_email, framework, github_repo, github_stars, status')
      .eq('id', id)
      .maybeSingle();

    if (readErr || !row) {
      results.push({ id, status: 'not_found' });
      continue;
    }
    if (row.status !== 'pending') {
      results.push({ id, status: row.status, error: 'already decided' });
      continue;
    }

    if (decision === 'reject') {
      await admin
        .from('outreach_approvals')
        .update({ status: 'rejected', decided_at: nowIso })
        .eq('id', id);
      results.push({ id, status: 'rejected' });
      continue;
    }

    try {
      await sendGitHubLeadOutreach({
        email: row.lead_email,
        framework: row.framework ?? 'langchain',
        githubRepo: row.github_repo ?? '',
        githubStars: Number(row.github_stars) || 0,
      });
      await admin
        .from('outreach_approvals')
        .update({ status: 'sent', decided_at: nowIso, sent_at: nowIso })
        .eq('id', id);
      await admin
        .from('leads')
        .update({ outreach_sent: true, outreach_sent_at: nowIso })
        .eq('email', row.lead_email)
        .eq('source', 'github-signal');
      results.push({ id, status: 'sent' });
    } catch (err) {
      // Detail stays server-side; response carries a generic marker only.
      logApiError('api/marketing/outreach/approve', err);
      results.push({ id, status: 'error', error: 'send failed' });
    }
  }

  return NextResponse.json({ ok: true, decision, results });
}
