import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../../lib/authz';
import { RuntimeRouteRoles } from '../../../../../lib/runtime/permissions';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { handleApiError } from '../../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

const VALID_MODES = new Set(['audit_only', 'gate', 'full']);

// GET — read current ledger config for org
export async function GET(_request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.monitor);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = getSupabaseAdmin();
    const { data } = await (admin as any)
      .from('dsg_ledger_config')
      .select('*')
      .eq('org_id', access.orgId)
      .maybeSingle();

    // Return defaults if no config row exists yet
    const config = data ?? {
      org_id: access.orgId,
      mode: 'gate',
      gate_enabled: true,
      audit_enabled: true,
      chain_enabled: true,
    };

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    return handleApiError('api/dsg/ledger/config', error);
  }
}

// PATCH — update ledger mode / flags (owner only)
export async function PATCH(request: Request) {
  try {
    const access = await requireOrgRole(RuntimeRouteRoles.owner);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null) as {
      mode?: string;
      gate_enabled?: boolean;
      audit_enabled?: boolean;
      chain_enabled?: boolean;
    } | null;

    if (!body) {
      return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    }

    if (body.mode !== undefined && !VALID_MODES.has(body.mode)) {
      return NextResponse.json(
        { error: 'invalid_mode', valid: ['audit_only', 'gate', 'full'] },
        { status: 400 }
      );
    }

    // audit_enabled cannot be false if chain_enabled is true — chain requires audit
    const auditEnabled = body.audit_enabled;
    const chainEnabled = body.chain_enabled;
    if (auditEnabled === false && chainEnabled === true) {
      return NextResponse.json(
        { error: 'chain_requires_audit', message: 'chain_enabled requires audit_enabled. Disable chain first.' },
        { status: 400 }
      );
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.mode !== undefined) patch.mode = body.mode;
    if (typeof body.gate_enabled === 'boolean') patch.gate_enabled = body.gate_enabled;
    if (typeof body.audit_enabled === 'boolean') patch.audit_enabled = body.audit_enabled;
    if (typeof body.chain_enabled === 'boolean') patch.chain_enabled = body.chain_enabled;

    const admin = getSupabaseAdmin();
    const { data, error } = await (admin as any)
      .from('dsg_ledger_config')
      .upsert(
        { org_id: access.orgId, ...patch },
        { onConflict: 'org_id' }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, config: data });
  } catch (error) {
    return handleApiError('api/dsg/ledger/config', error);
  }
}
