import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';
import { captureEvent } from '../../../../lib/telemetry/capture-event';

type ProvisionUser = { id: string; email: string };

function getBearerToken(headers: Headers): string | undefined {
  const value = headers.get('authorization');
  if (!value?.toLowerCase().startsWith('bearer ')) return undefined;
  return value.slice('bearer '.length).trim();
}

async function resolveUserFromBearer(bearerToken: string): Promise<ProvisionUser | null> {
  try {
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!anonKey || !url) return null;
    // Verify the Supabase-issued JWT against the Auth API using the anon key.
    // Supabase does not accept service_role keys on the Auth REST API, so we
    // validate the JWT with the anon key instead of admin.auth.getUser.
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${bearerToken}` },
      cache: 'no-store',
    });
    if (!userResponse.ok) return null;
    const user = (await userResponse.json()) as { id?: string; sub?: string; email?: string };
    const id = user.id || user.sub;
    if (!id || !user.email) return null;
    return { id, email: user.email };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  // Prefer an Authorization: Bearer JWT so programmatic clients (MCP bridges,
  // CLI installers) can provision access without a session cookie.
  const bearerToken = getBearerToken(request.headers);
  let user: ProvisionUser | null = bearerToken ? await resolveUserFromBearer(bearerToken) : null;

  if (!user) {
    const supabase = await createClient();

    const {
      data: { user: sessionUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !sessionUser?.id || !sessionUser.email) {
      return NextResponse.json(
        { ok: false, reason: 'UNAUTHENTICATED' },
        { status: 401 }
      );
    }
    user = { id: sessionUser.id, email: sessionUser.email };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await (admin as any).rpc('dsg_provision_user_access', {
    p_auth_user_id: user.id,
    p_email: user.email,
  });

  if (error) {
    logApiError('api/auth/provision-access', error);
    return NextResponse.json(
      {
        ok: false,
        reason: 'PROVISION_FAILED',
        error: internalErrorMessage(),
      },
      { status: 500 }
    );
  }

  // Capture workspace_created event
  if (data?.ok && data?.workspace_id) {
    void captureEvent('workspace_created', {
      userId: user.id,
      organizationId: data.organization_id,
    }, {
      organization_id: data.organization_id,
      workspace_id: data.workspace_id,
      workspace_name: data.workspace_name || 'default',
      created_at: new Date().toISOString(),
      created_by_user_id: user.id,
    }).catch((error) => {
      console.error('[auth-provision] Failed to capture workspace_created event:', error);
    });
  }

  return NextResponse.json(data ?? { ok: false, reason: 'NO_RESULT' });
}
