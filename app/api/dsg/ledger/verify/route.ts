import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../../lib/runtime/permissions';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { handleApiError } from '../../../../../lib/security/api-error';
import { verifyChain } from '../../../../../lib/dsg/ledger/chain';
import type { LedgerEntryRow } from '../../../../../lib/dsg/ledger/chain';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.monitor);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const fromSeq = Number(url.searchParams.get('from_seq') ?? '0');
    const limit = Math.min(Number(url.searchParams.get('limit') ?? '500'), 2000);

    const admin = getSupabaseAdmin();
    const { data: rows, error } = await (admin as any)
      .from('dsg_agent_ledger')
      .select('org_id, seq, action, decision, reason, mode, timestamp_ms, entry_hash, prev_hash')
      .eq('org_id', access.orgId)
      .gte('seq', fromSeq)
      .order('seq', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const entries: LedgerEntryRow[] = (rows ?? []).map((r: Record<string, unknown>) => ({
      org_id: String(r.org_id),
      seq: Number(r.seq),
      action: String(r.action),
      decision: r.decision as LedgerEntryRow['decision'],
      reason: r.reason != null ? String(r.reason) : null,
      mode: r.mode as LedgerEntryRow['mode'],
      timestamp_ms: Number(r.timestamp_ms),
      entry_hash: String(r.entry_hash),
      prev_hash: r.prev_hash != null ? String(r.prev_hash) : null,
    }));

    const result = verifyChain(entries);

    return NextResponse.json({
      ok: result.ok,
      org_id: access.orgId,
      from_seq: fromSeq,
      entries_checked: result.entries_checked,
      first_seq: entries.at(0)?.seq ?? null,
      last_seq: entries.at(-1)?.seq ?? null,
      last_entry_hash: entries.at(-1)?.entry_hash ?? null,
      first_violation: result.first_violation,
      tamper_evidence: result.tamper_evidence,
      verified_at: new Date().toISOString(),
      integrity: result.ok ? 'INTACT' : 'VIOLATED',
    });

  } catch (error) {
    return handleApiError('api/dsg/ledger/verify', error);
  }
}
