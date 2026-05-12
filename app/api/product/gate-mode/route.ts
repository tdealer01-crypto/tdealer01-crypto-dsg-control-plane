import { NextResponse } from 'next/server';
import { logServerError, serverErrorResponse } from '../../../../lib/security/error-response';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { createClient as createSupabaseServerClient } from '../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

type GateMode = 'audit_only' | 'enforce_gate';

type GateModeRow = {
  gate_mode?: unknown;
  updated_at?: string | null;
};

type GateModeUpsert = {
  org_id: string;
  gate_mode: GateMode;
  updated_at: string;
};

type GateSettingsTable = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{ data: GateModeRow | null; error: unknown }>;
    };
  };
  upsert: (
    values: GateModeUpsert,
    options: { onConflict: string },
  ) => {
    select: (columns: string) => {
      single: () => Promise<{ data: GateModeRow | null; error: unknown }>;
    };
  };
};

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;
const DEFAULT_GATE_MODE: GateMode = 'audit_only';

function isGateMode(value: unknown): value is GateMode {
  return value === 'audit_only' || value === 'enforce_gate';
}

async function getClient() {
  try {
    return getSupabaseAdmin();
  } catch {
    return createSupabaseServerClient();
  }
}

function gateSettingsTable(client: unknown): GateSettingsTable {
  return (client as { from: (relation: string) => GateSettingsTable }).from('agent_gate_settings');
}

function dbSetupError(error: unknown) {
  const message = error && typeof error === 'object' && 'message' in error ? String((error as { message?: unknown }).message || '') : '';
  return message.includes('agent_gate_settings') || message.includes('does not exist') || message.includes('schema cache');
}

export async function GET(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'product-gate-mode'),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  const profileAccess = await requireActiveProfile();
  if (!profileAccess.ok) {
    return NextResponse.json({ error: profileAccess.error }, { status: profileAccess.status, headers });
  }

  try {
    const table = gateSettingsTable(await getClient());
    const { data, error } = await table
      .select('gate_mode, updated_at')
      .eq('org_id', profileAccess.orgId)
      .maybeSingle();

    if (error) {
      if (dbSetupError(error)) {
        return NextResponse.json({
          gate_mode: DEFAULT_GATE_MODE,
          persisted: false,
          error: 'database_migration_required',
        }, { status: 503, headers });
      }
      logServerError(error, 'product-gate-mode-get');
      return serverErrorResponse({ headers });
    }

    return NextResponse.json({
      gate_mode: isGateMode(data?.gate_mode) ? data.gate_mode : DEFAULT_GATE_MODE,
      persisted: Boolean(data?.gate_mode),
      updated_at: data?.updated_at || null,
    }, { headers });
  } catch (error) {
    logServerError(error, 'product-gate-mode-get');
    return serverErrorResponse({ headers });
  }
}

export async function PATCH(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'product-gate-mode'),
    limit: RATE_LIMIT,
    windowMs: RATE_WINDOW_MS,
  });
  const headers = buildRateLimitHeaders(rateLimit, RATE_LIMIT);

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers });
  }

  const profileAccess = await requireActiveProfile();
  if (!profileAccess.ok) {
    return NextResponse.json({ error: profileAccess.error }, { status: profileAccess.status, headers });
  }

  const body = await request.json().catch(() => null);
  const gateMode = body?.gate_mode;

  if (!isGateMode(gateMode)) {
    return NextResponse.json({ error: 'gate_mode must be audit_only or enforce_gate' }, { status: 400, headers });
  }

  try {
    const table = gateSettingsTable(await getClient());
    const now = new Date().toISOString();
    const { data, error } = await table
      .upsert({
        org_id: profileAccess.orgId,
        gate_mode: gateMode,
        updated_at: now,
      }, { onConflict: 'org_id' })
      .select('gate_mode, updated_at')
      .single();

    if (error) {
      if (dbSetupError(error)) {
        return NextResponse.json({ error: 'database_migration_required' }, { status: 503, headers });
      }
      logServerError(error, 'product-gate-mode-patch');
      return serverErrorResponse({ headers });
    }

    return NextResponse.json({
      gate_mode: isGateMode(data?.gate_mode) ? data.gate_mode : gateMode,
      persisted: true,
      updated_at: data?.updated_at || now,
    }, { headers });
  } catch (error) {
    logServerError(error, 'product-gate-mode-patch');
    return serverErrorResponse({ headers });
  }
}
