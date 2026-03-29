import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import {
  getDSGCoreAuditEvents,
  getDSGCoreDeterminism,
  getDSGCoreHealth,
  getDSGCoreMetrics,
} from '../../../../lib/dsg-core';

export const dynamic = 'force-dynamic';

async function requireActiveProfile() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false as const, status: 401, error: 'Unauthorized' };
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }

  return { ok: true as const, orgId: String(profile.org_id) };
}

export async function GET() {
  try {
    const access = await requireActiveProfile();
    if (!access.ok) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    const [health, metrics, audit] = await Promise.all([
      getDSGCoreHealth(),
      getDSGCoreMetrics(),
      getDSGCoreAuditEvents(10),
    ]);

    const latestSequence = Number(audit.items?.[0]?.sequence ?? NaN);
    const hasSequence = Number.isFinite(latestSequence);
    const determinism = hasSequence
      ? await getDSGCoreDeterminism(latestSequence)
      : { ok: false as const, error: 'No audit sequence available' };

    return NextResponse.json({
      ok: health.ok,
      org_id: access.orgId,
      timestamp: new Date().toISOString(),
      core: {
        health,
        metrics,
        latest_sequence: hasSequence ? latestSequence : null,
        determinism,
      },
      audit: {
        count: audit.items.length,
        latest: audit.items[0] ?? null,
        items: audit.items,
        error: audit.ok ? null : audit.error ?? 'Failed to fetch audit events',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unexpected error',
      },
      { status: 500 }
    );
  }
}
