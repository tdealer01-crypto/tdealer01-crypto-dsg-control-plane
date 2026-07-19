/**
 * SCIM 2.0 User Detail Endpoint
 *
 * GET /api/scim/v2/Users/{id} - Get user by ID
 * PATCH /api/scim/v2/Users/{id} - Update user
 * DELETE /api/scim/v2/Users/{id} - Deactivate user
 *
 * RFC 7643: SCIM 2.0 User Resource
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  buildScimUserResponse,
  buildScimError,
} from '@/lib/scim/schema-validator';
import { initCorrelationContext } from '@/lib/audit/correlation-context';

export const dynamic = 'force-dynamic';

/**
 * Verify SCIM API token authentication
 * In production, verify Bearer token against org_scim_tokens table
 */
async function verifyScimAuth(request: Request, orgId: string): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return false;
  }

  // TODO: Verify token against org_scim_tokens table
  // For now, basic validation
  return authHeader.length > 10;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = initCorrelationContext();
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('org_id');

    if (!orgId) {
      return NextResponse.json(buildScimError('org_id parameter required', 400), { status: 400 });
    }

    // Verify auth
    if (!(await verifyScimAuth(request, orgId))) {
      return NextResponse.json(buildScimError('Unauthorized', 401), { status: 401 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Get user and verify they belong to org
    const userResult = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data')
      .eq('id', id)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json(buildScimError('User not found', 404), { status: 404 });
    }

    // Verify user is in org
    const roleResult = await supabase
      .from('user_org_roles')
      .select('id')
      .eq('user_id', id)
      .eq('org_id', orgId)
      .single();

    if (roleResult.error) {
      return NextResponse.json(buildScimError('User not found in organization', 404), { status: 404 });
    }

    const user = userResult.data;
    const metadata = user.raw_user_meta_data || {};

    const response = buildScimUserResponse(
      user.id,
      user.email,
      user.email,
      orgId,
      {
        displayName: metadata.displayName || user.email,
        name: {
          givenName: metadata.givenName,
          familyName: metadata.familyName,
        },
        externalId: metadata.externalId,
      },
    );

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'scim_get_user',
      resource_type: 'scim',
      resource_id: id,
      result: 'success',
      correlation_id: correlationId,
      severity: 'INFO',
    });

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/scim+json',
        'x-correlation-id': correlationId,
      },
    });
  } catch (error) {
    console.error('[scim-get-user] Exception:', error);
    return NextResponse.json(buildScimError('Internal server error', 500), { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = initCorrelationContext();
  const { id } = await params;

  try {
    const body = await request.json();
    const url = new URL(request.url);
    const orgId = url.searchParams.get('org_id');

    if (!orgId) {
      return NextResponse.json(buildScimError('org_id parameter required', 400), { status: 400 });
    }

    // Verify auth
    if (!(await verifyScimAuth(request, orgId))) {
      return NextResponse.json(buildScimError('Unauthorized', 401), { status: 401 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Verify user exists and belongs to org
    const roleResult = await supabase
      .from('user_org_roles')
      .select('id')
      .eq('user_id', id)
      .eq('org_id', orgId)
      .single();

    if (roleResult.error) {
      return NextResponse.json(buildScimError('User not found in organization', 404), { status: 404 });
    }

    // Update user metadata (SCIM Operations patch)
    const updates: Record<string, any> = {};

    if (body.Operations) {
      for (const op of body.Operations) {
        if (op.op === 'replace') {
          if (op.path === 'active') {
            // Handle active status
            updates.disabled = !op.value;
          } else if (op.path === 'displayName') {
            updates.displayName = op.value;
          } else if (op.path === 'name.givenName') {
            updates.givenName = op.value;
          } else if (op.path === 'name.familyName') {
            updates.familyName = op.value;
          }
        } else if (op.op === 'add' || op.op === 'replace') {
          if (op.path === 'emails' && Array.isArray(op.value)) {
            // Email updates via SCIM usually require re-verification
            // For now, store in metadata
            updates.emails = op.value;
          }
        }
      }
    } else {
      // Standard JSON patch if no Operations provided
      if (body.displayName) updates.displayName = body.displayName;
      if (body.name?.givenName) updates.givenName = body.name.givenName;
      if (body.name?.familyName) updates.familyName = body.name.familyName;
      if (body.active !== undefined) updates.disabled = !body.active;
    }

    // Update user metadata
    const updateResult = await supabase.auth.admin.updateUserById(id, {
      user_metadata: updates,
    });

    if (updateResult.error) {
      console.error('[scim-update-user] Error:', updateResult.error);
      return NextResponse.json(
        buildScimError(`User update failed: ${updateResult.error.message}`, 500),
        { status: 500 },
      );
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'scim_update_user',
      resource_type: 'user',
      resource_id: id,
      result: 'success',
      correlation_id: correlationId,
      severity: 'INFO',
      message: 'User updated via SCIM',
    });

    // Return updated user
    const userResult = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data')
      .eq('id', id)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json(buildScimError('User not found', 404), { status: 404 });
    }

    const user = userResult.data;
    const metadata = user.raw_user_meta_data || {};

    const response = buildScimUserResponse(
      user.id,
      user.email,
      user.email,
      orgId,
      {
        displayName: metadata.displayName || user.email,
        name: {
          givenName: metadata.givenName,
          familyName: metadata.familyName,
        },
        externalId: metadata.externalId,
      },
    );

    return NextResponse.json(response, {
      headers: {
        'Content-Type': 'application/scim+json',
        'x-correlation-id': correlationId,
      },
    });
  } catch (error) {
    console.error('[scim-update-user] Exception:', error);
    return NextResponse.json(buildScimError('Internal server error', 500), { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const correlationId = initCorrelationContext();
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('org_id');

    if (!orgId) {
      return NextResponse.json(buildScimError('org_id parameter required', 400), { status: 400 });
    }

    // Verify auth
    if (!(await verifyScimAuth(request, orgId))) {
      return NextResponse.json(buildScimError('Unauthorized', 401), { status: 401 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Verify user exists and belongs to org
    const roleResult = await supabase
      .from('user_org_roles')
      .select('id')
      .eq('user_id', id)
      .eq('org_id', orgId)
      .single();

    if (roleResult.error) {
      return NextResponse.json(buildScimError('User not found in organization', 404), { status: 404 });
    }

    // Soft delete: mark as disabled, don't actually delete
    const updateResult = await supabase.auth.admin.updateUserById(id, {
      user_metadata: { disabled: true, deactivatedAt: new Date().toISOString() },
    });

    if (updateResult.error) {
      console.error('[scim-delete-user] Error:', updateResult.error);
      return NextResponse.json(
        buildScimError(`User deletion failed: ${updateResult.error.message}`, 500),
        { status: 500 },
      );
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'scim_delete_user',
      resource_type: 'user',
      resource_id: id,
      result: 'success',
      correlation_id: correlationId,
      severity: 'WARN',
      message: 'User deactivated via SCIM',
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('[scim-delete-user] Exception:', error);
    return NextResponse.json(buildScimError('Internal server error', 500), { status: 500 });
  }
}
