import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';
import { captureEvent } from '../../../../lib/telemetry/capture-event';

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id || !user.email) {
    return NextResponse.json(
      { ok: false, reason: 'UNAUTHENTICATED' },
      { status: 401 }
    );
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
