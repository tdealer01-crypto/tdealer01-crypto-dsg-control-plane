import { NextRequest, NextResponse } from 'next/server';
import { requireOrgPermission } from '../../../../lib/auth/require-org-permission';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { handleApiError } from '../../../../lib/security/api-error';

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

async function parseBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await request.json()) as Record<string, unknown>;
  }

  const form = await request.formData();
  return {
    request_id: form.get('request_id'),
    action: form.get('action'),
    role: form.get('role'),
    note: form.get('note'),
  } as Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireOrgPermission('org.manage_access');
    if ('status' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await parseBody(request);
    const requestId = String(body.request_id || '').trim();
    const action = String(body.action || '').trim().toLowerCase();
    const role = String(body.role || 'operator').trim().toLowerCase();
    const note = String(body.note || '').trim() || null;

    if (!requestId) {
      return NextResponse.json({ error: 'request_id is required' }, { status: 400 });
    }
    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: reqRow, error: reqErr } = await admin
      .from('access_requests')
      .select('id, email, org_id, status')
      .eq('id', requestId)
      .maybeSingle();

    if (reqErr || !reqRow?.id) {
      return NextResponse.json({ error: 'request not found' }, { status: 404 });
    }
    if (reqRow.status !== 'pending') {
      return NextResponse.json({ error: 'request already reviewed' }, { status: 409 });
    }
    if (reqRow.org_id && reqRow.org_id !== access.orgId) {
      return NextResponse.json({ error: 'cross-org review is not allowed' }, { status: 403 });
    }

    const nextStatus = action === 'approve' ? 'approved' : 'rejected';
    const { error: updateErr } = await admin
      .from('access_requests')
      .update({
        status: nextStatus,
        org_id: access.orgId,
        reviewed_by_user_id: access.userId,
        review_note: note,
      })
      .eq('id', requestId);
    if (updateErr) throw updateErr;

    if (action === 'approve') {
      const email = normalizeEmail(reqRow.email);
      const { data: targetUser } = await admin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (targetUser?.id) {
        await admin
          .from('users')
          .update({ org_id: access.orgId, role, is_active: true })
          .eq('id', targetUser.id);

        await admin
          .from('user_org_roles')
          .upsert({ org_id: access.orgId, user_id: targetUser.id, role }, { onConflict: 'org_id,user_id,role', ignoreDuplicates: true });

        const runtimeRole = role === 'owner' || role === 'admin' ? 'org_admin' : role === 'viewer' ? 'reviewer' : role;
        await admin
          .from('runtime_roles')
          .upsert({ org_id: access.orgId, user_id: targetUser.id, role: runtimeRole }, { onConflict: 'org_id,user_id,role', ignoreDuplicates: true });
      }
    }

    await admin.from('sign_in_events').insert({
      email: normalizeEmail(reqRow.email),
      org_id: access.orgId,
      auth_user_id: access.authUserId,
      event_type: 'request_access_reviewed',
      source: 'access-review',
      success: true,
      metadata: { request_id: requestId, action, role, reviewed_by_user_id: access.userId },
    });

    const acceptsHtml = (request.headers.get('accept') || '').includes('text/html');
    if (acceptsHtml) {
      return NextResponse.redirect(new URL('/dashboard/settings/access', request.url), { status: 302 });
    }

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error) {
    return handleApiError('api/access/review', error);
  }
}
