/**
 * OIDC Callback Handler
 *
 * POST /api/auth/oidc/callback
 * Handles OIDC token exchange and user creation/login
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { parseJwt, validateOidcClaims, extractUserInfo, extractGroups } from '@/lib/sso/oidc-validator';
import { syncUserGroupsOnLogin } from '@/lib/sso/idp-group-mapper';
import { initCorrelationContext } from '@/lib/audit/correlation-context';
import { createSession } from '@/lib/session/session-policy';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

interface OidcCallbackRequest {
  code: string;
  state?: string;
  idToken?: string;
  orgId: string;
}

export async function POST(request: Request) {
  const correlationId = initCorrelationContext();

  try {
    const body = (await request.json()) as OidcCallbackRequest;
    const { code, orgId, idToken } = body;

    if (!code || !orgId || !idToken) {
      return NextResponse.json(
        { ok: false, error: 'missing_required_fields', message: 'code, orgId, and idToken are required' },
        { status: 400 },
      );
    }

    // Parse and validate ID token (JWT)
    const parsed = parseJwt(idToken);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: 'invalid_token' }, { status: 400 });
    }

    // Get expected issuer from org SSO config
    const supabase = getSupabaseAdmin() as any;
    const ssoConfigResult = await supabase
      .from('org_sso_config')
      .select('issuer, client_id')
      .eq('org_id', orgId)
      .eq('provider', 'oidc')
      .eq('enabled', true)
      .single();

    if (ssoConfigResult.error || !ssoConfigResult.data) {
      return NextResponse.json({ ok: false, error: 'sso_not_configured' }, { status: 403 });
    }

    const { issuer: expectedIssuer, client_id: expectedAudience } = ssoConfigResult.data;

    // Validate claims
    const validationResult = validateOidcClaims(parsed.claims, expectedIssuer, expectedAudience);
    if (!validationResult.valid) {
      return NextResponse.json({ ok: false, error: 'invalid_token', message: validationResult.error }, { status: 401 });
    }

    // Extract user info
    const claims = validationResult.claims!;
    const userInfo = extractUserInfo(claims);
    const groups = extractGroups(claims);

    // Upsert user in DSG
    const userResult = await supabase.auth.admin.createUser({
      email: userInfo.email,
      email_confirm: true,
      user_metadata: {
        externalId: userInfo.externalId,
        displayName: userInfo.displayName,
        ssoProvider: 'oidc',
      },
    });

    if (userResult.error && !userResult.error.message.includes('already exists')) {
      console.error('[oidc-callback] Error creating user:', userResult.error);
      return NextResponse.json({ ok: false, error: 'user_creation_failed' }, { status: 500 });
    }

    const userId = userResult.data?.user?.id || userResult.error?.message?.match(/\w{8}-\w{4}-\w{4}-\w{4}-\w{12}/)?.[0];
    if (!userId) {
      return NextResponse.json({ ok: false, error: 'user_id_not_found' }, { status: 500 });
    }

    // Ensure user is in organization
    const roleResult = await supabase
      .from('user_org_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .single();

    if (roleResult.error) {
      // Add user to org with default role (viewer)
      const defaultRoleResult = await supabase
        .from('org_rbac_roles')
        .select('id')
        .eq('org_id', orgId)
        .eq('name', 'viewer')
        .single();

      if (!defaultRoleResult.error && defaultRoleResult.data) {
        await supabase.from('user_org_roles').insert({
          user_id: userId,
          org_id: orgId,
          rbac_role_id: defaultRoleResult.data.id,
        });
      }
    }

    // Sync groups to roles (JIT provisioning)
    if (groups.length > 0) {
      await syncUserGroupsOnLogin(userId, orgId, groups);
    }

    // Create session
    const tokenHash = createHash('sha256').update(idToken).digest('hex');
    const sessionResult = await createSession(
      userId,
      orgId,
      tokenHash,
      request.headers.get('x-forwarded-for') || undefined,
      request.headers.get('user-agent') || undefined,
    );

    if (!sessionResult.ok) {
      return NextResponse.json({ ok: false, error: 'session_creation_failed' }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'oidc_login',
      resource_type: 'user',
      resource_id: userId,
      actor_id: userId,
      actor_email: userInfo.email,
      result: 'success',
      correlation_id: correlationId,
      severity: 'INFO',
    });

    return NextResponse.json({
      ok: true,
      sessionId: sessionResult.sessionId,
      userId,
      email: userInfo.email,
      displayName: userInfo.displayName,
      expiresAt: sessionResult.expiresAt,
    });
  } catch (error) {
    console.error('[oidc-callback] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
