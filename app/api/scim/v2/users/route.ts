/**
 * SCIM 2.0 Users List/Create Endpoint
 *
 * GET /api/scim/v2/Users - List users with filters
 * POST /api/scim/v2/Users - Provision a new user
 *
 * RFC 7643: SCIM 2.0 User Resource
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import {
  validateScimUser,
  buildScimUserResponse,
  buildScimListResponse,
  buildScimError,
  parseScimFilter,
  filterMatches,
  isValidScimFilter,
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

export async function GET(request: Request) {
  const correlationId = initCorrelationContext();

  try {
    const url = new URL(request.url);
    const orgId = url.searchParams.get('org_id');
    const filter = url.searchParams.get('filter');
    const startIndex = parseInt(url.searchParams.get('startIndex') || '1');
    const count = parseInt(url.searchParams.get('count') || '20');

    if (!orgId) {
      return NextResponse.json(buildScimError('org_id parameter required', 400), { status: 400 });
    }

    // Verify auth
    if (!(await verifyScimAuth(request, orgId))) {
      return NextResponse.json(buildScimError('Unauthorized', 401), { status: 401 });
    }

    // Validate filter if provided
    if (filter && !isValidScimFilter(filter)) {
      return NextResponse.json(buildScimError(`Invalid filter: ${filter}`, 400), { status: 400 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Get users in org
    const usersResult = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data')
      .in('id', (await supabase.from('user_org_roles').select('user_id').eq('org_id', orgId)).data?.map((r: any) => r.user_id) || [])
      .limit(count)
      .offset(startIndex - 1);

    if (usersResult.error) {
      console.error('[scim-list] Error fetching users:', usersResult.error);
      return NextResponse.json(buildScimError('Failed to fetch users', 500), { status: 500 });
    }

    let users = usersResult.data || [];

    // Apply filter if provided
    if (filter) {
      const parsed = parseScimFilter(filter);
      if (parsed) {
        users = users.filter((user: any) => {
          const scimUser = buildScimUserResponse(user.id, user.email, user.email, orgId, user.raw_user_meta_data);
          return filterMatches(scimUser, parsed);
        });
      }
    }

    // Build SCIM response objects
    const resources = users.map((user: any) => {
      const metadata = user.raw_user_meta_data || {};
      return buildScimUserResponse(
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
    });

    const response = buildScimListResponse(resources, startIndex, count);

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'scim_list_users',
      resource_type: 'scim',
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
    console.error('[scim-list] Exception:', error);
    return NextResponse.json(buildScimError('Internal server error', 500), { status: 500 });
  }
}

export async function POST(request: Request) {
  const correlationId = initCorrelationContext();

  try {
    const body = await request.json();
    const orgId = new URL(request.url).searchParams.get('org_id');

    if (!orgId) {
      return NextResponse.json(buildScimError('org_id parameter required', 400), { status: 400 });
    }

    // Verify auth
    if (!(await verifyScimAuth(request, orgId))) {
      return NextResponse.json(buildScimError('Unauthorized', 401), { status: 401 });
    }

    // Validate SCIM user
    const validation = validateScimUser(body);
    if (!validation.valid) {
      return NextResponse.json(
        buildScimError(`Validation failed: ${validation.errors.join('; ')}`, 400),
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin() as any;

    // Check if user already exists
    const existingResult = await supabase.auth.admin.getUserById(body.externalId || body.id);
    if (existingResult.data?.user?.id) {
      return NextResponse.json(
        buildScimError('User already exists', 409),
        { status: 409 },
      );
    }

    // Create user
    const createResult = await supabase.auth.admin.createUser({
      email: body.emails[0].value,
      email_confirm: true,
      user_metadata: {
        displayName: body.displayName || body.emails[0].value,
        givenName: body.name?.givenName,
        familyName: body.name?.familyName,
        externalId: body.externalId,
        ssoProvider: 'scim',
      },
    });

    if (createResult.error) {
      console.error('[scim-create] Error creating user:', createResult.error);
      return NextResponse.json(buildScimError(`User creation failed: ${createResult.error.message}`, 500), { status: 500 });
    }

    const userId = createResult.data.user!.id;

    // Add user to org
    await supabase.from('user_org_roles').insert({
      user_id: userId,
      org_id: orgId,
      role_name: 'viewer', // Default role
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'scim_create_user',
      resource_type: 'user',
      resource_id: userId,
      actor_email: body.emails[0].value,
      result: 'success',
      correlation_id: correlationId,
      severity: 'INFO',
    });

    const response = buildScimUserResponse(userId, body.emails[0].value, body.emails[0].value, orgId, {
      displayName: body.displayName,
      name: {
        givenName: body.name?.givenName,
        familyName: body.name?.familyName,
      },
      externalId: body.externalId,
    });

    return NextResponse.json(response, {
      status: 201,
      headers: {
        'Content-Type': 'application/scim+json',
        'Location': `/api/scim/v2/Users/${userId}`,
        'x-correlation-id': correlationId,
      },
    });
  } catch (error) {
    console.error('[scim-create] Exception:', error);
    return NextResponse.json(buildScimError('Internal server error', 500), { status: 500 });
  }
}
