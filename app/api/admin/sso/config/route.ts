/**
 * SSO Configuration Endpoint
 *
 * GET /api/admin/sso/config - Get current SSO config
 * POST /api/admin/sso/config - Set up SAML or OIDC
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { checkPermission } from '@/lib/rbac/require-permission';
import { initCorrelationContext, updateCorrelationContext } from '@/lib/audit/correlation-context';
import { retrieveEncryptedSecret } from '@/lib/encryption/secrets-vault';

export const dynamic = 'force-dynamic';

interface SsoConfigRequest {
  provider: 'saml' | 'oidc';
  metadataUrl?: string;
  clientId?: string;
  clientSecret?: string;
  issuer?: string;
  enabled?: boolean;
  ssoRequired?: boolean;
}

export async function GET(request: Request) {
  const correlationId = initCorrelationContext();

  try {
    const userId = (request as any).userId;
    const orgId = (request as any).orgId;

    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission
    const permResult = await checkPermission(userId, orgId, 'manage:sso');
    if (!permResult.ok) {
      return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin() as any;

    // Get SSO config
    const configResult = await supabase
      .from('org_sso_config')
      .select('id, provider, metadata_url, issuer, client_id, enabled, sso_required')
      .eq('org_id', orgId)
      .single();

    if (configResult.error) {
      return NextResponse.json({ ok: true, config: null });
    }

    // Don't return encrypted secrets
    const config = configResult.data;
    delete config.client_secret_encrypted;

    return NextResponse.json({ ok: true, config });
  } catch (error) {
    console.error('[sso-config-get] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const correlationId = initCorrelationContext();

  try {
    const userId = (request as any).userId;
    const orgId = (request as any).orgId;
    const body = (await request.json()) as SsoConfigRequest;

    if (!userId || !orgId) {
      return NextResponse.json({ ok: false, error: 'authentication_required' }, { status: 401 });
    }

    // Check permission
    const permResult = await checkPermission(userId, orgId, 'manage:sso');
    if (!permResult.ok) {
      return NextResponse.json({ ok: false, error: 'permission_denied' }, { status: 403 });
    }

    // Validate request
    if (!body.provider) {
      return NextResponse.json({ ok: false, error: 'provider is required' }, { status: 400 });
    }

    if (body.provider === 'saml' && !body.metadataUrl && !body.issuer) {
      return NextResponse.json({ ok: false, error: 'metadataUrl or issuer is required for SAML' }, { status: 400 });
    }

    if (body.provider === 'oidc' && (!body.metadataUrl || !body.clientId)) {
      return NextResponse.json(
        { ok: false, error: 'metadataUrl and clientId are required for OIDC' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin() as any;

    // Check if config exists
    const existingResult = await supabase
      .from('org_sso_config')
      .select('id')
      .eq('org_id', orgId)
      .single();

    updateCorrelationContext({ orgId, userId });

    const configData = {
      org_id: orgId,
      provider: body.provider,
      metadata_url: body.metadataUrl,
      issuer: body.issuer,
      client_id: body.clientId,
      client_secret_encrypted: body.clientSecret ? Buffer.from(body.clientSecret).toString('base64') : null,
      enabled: body.enabled !== false,
      sso_required: body.ssoRequired || false,
    };

    let result;

    if (existingResult.data?.id) {
      // Update
      result = await supabase
        .from('org_sso_config')
        .update(configData)
        .eq('org_id', orgId)
        .select();
    } else {
      // Create
      result = await supabase.from('org_sso_config').insert([configData]).select();
    }

    if (result.error) {
      console.error('[sso-config] Error:', result.error);
      return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      org_id: orgId,
      action: 'sso_config_updated',
      resource_type: 'sso',
      actor_id: userId,
      actor_email: userId,
      result: 'success',
      correlation_id: correlationId,
      severity: 'WARN',
      message: `${body.provider.toUpperCase()} SSO configured`,
    });

    return NextResponse.json({ ok: true, config: result.data[0] });
  } catch (error) {
    console.error('[sso-config-post] Exception:', error);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
