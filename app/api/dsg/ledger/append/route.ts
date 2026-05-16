import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../../lib/runtime/permissions';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { handleApiError, internalErrorMessage, logApiError } from '../../../../../lib/security/api-error';
import { buildLedgerEntry } from '../../../../../lib/dsg/ledger/chain';
import type { LedgerMode } from '../../../../../lib/dsg/ledger/chain';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.operator);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null) as {
      action?: string;
      decision?: string;
      reason?: string | null;
      agent_id?: string | null;
      session_id?: string | null;
      context?: Record<string, unknown>;
      invariant_snapshot?: Record<string, unknown> | null;
    } | null;

    if (!body?.action || !body?.decision) {
      return NextResponse.json({ error: 'missing_action_or_decision' }, { status: 400 });
    }

    const validDecisions = new Set(['ALLOW', 'BLOCK', 'REVIEW', 'AUDIT']);
    if (!validDecisions.has(body.decision)) {
      return NextResponse.json({ error: 'invalid_decision' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const orgId = access.orgId;

    // Get org config (mode) — default to 'gate' if not configured
    const { data: config } = await (admin as any)
      .from('dsg_ledger_config')
      .select('mode, audit_enabled, chain_enabled')
      .eq('org_id', orgId)
      .maybeSingle();

    const mode: LedgerMode = (config?.mode as LedgerMode) ?? 'gate';
    const chainEnabled: boolean = config?.chain_enabled ?? true;

    // Atomically get next seq and previous hash
    const [seqResult, prevHashResult] = await Promise.all([
      (admin as any).rpc('dsg_ledger_next_seq', { p_org_id: orgId }).single(),
      chainEnabled
        ? (admin as any).rpc('dsg_ledger_latest_hash', { p_org_id: orgId }).single()
        : Promise.resolve({ data: null }),
    ]);

    const seq: number = seqResult.data ?? 0;
    const prevHash: string | null = chainEnabled ? (prevHashResult.data ?? null) : null;
    const timestampMs = Date.now();

    const entry = buildLedgerEntry({
      org_id: orgId,
      seq,
      action: String(body.action).slice(0, 2000),
      decision: body.decision as 'ALLOW' | 'BLOCK' | 'REVIEW' | 'AUDIT',
      reason: body.reason ? String(body.reason).slice(0, 500) : null,
      mode,
      timestamp_ms: timestampMs,
      prev_hash: prevHash,
      agent_id: body.agent_id ?? null,
      session_id: body.session_id ?? null,
      context: body.context ?? {},
      invariant_snapshot: body.invariant_snapshot ?? null,
    });

    const { error: insertError } = await (admin as any)
      .from('dsg_agent_ledger')
      .insert({
        org_id: entry.org_id,
        seq: entry.seq,
        action: entry.action,
        agent_id: entry.agent_id,
        session_id: entry.session_id,
        context: entry.context,
        decision: entry.decision,
        reason: entry.reason,
        mode: entry.mode,
        invariant_snapshot: entry.invariant_snapshot,
        entry_hash: entry.entry_hash,
        prev_hash: entry.prev_hash,
        timestamp_ms: entry.timestamp_ms,
      });

    if (insertError) {
      logApiError('api/dsg/ledger/append', insertError, { orgId, seq });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      seq,
      entry_hash: entry.entry_hash,
      prev_hash: entry.prev_hash,
      decision: entry.decision,
      mode,
      timestamp_ms: timestampMs,
    });

  } catch (error) {
    return handleApiError('api/dsg/ledger/append', error);
  }
}
