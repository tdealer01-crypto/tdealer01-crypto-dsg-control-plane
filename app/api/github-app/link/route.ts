import { NextResponse } from 'next/server';
import { randomUUID, createHash } from 'crypto';
import { requireActiveProfile } from '../../../../lib/auth/require-active-profile';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { resolvePolicyId } from '../../../../lib/supabase/resolve-policy';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  const profileAccess = await requireActiveProfile();
  if (!profileAccess.ok) {
    return NextResponse.json({ error: profileAccess.error }, { status: profileAccess.status });
  }
  const { orgId } = profileAccess;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const installationId = Number((body as Record<string, unknown>)?.installation_id);
  const githubAccountLogin =
    typeof (body as Record<string, unknown>)?.github_account_login === 'string'
      ? String((body as Record<string, unknown>).github_account_login).trim()
      : undefined;

  if (!Number.isFinite(installationId) || installationId <= 0) {
    return NextResponse.json({ error: 'installation_id must be a positive integer' }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();

    // Create a dedicated agent for this installation
    const apiKey = `dsg_live_${randomUUID().replace(/-/g, '')}`;
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
    const agentId = `agt_${randomUUID().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    // resolvePolicyId may return null — that is acceptable
    const policyId = await resolvePolicyId(orgId, null).catch(() => null);

    const { error: agentError } = await (admin as ReturnType<typeof getSupabaseAdmin>)
      .from('agents')
      .insert({
        id: agentId,
        org_id: orgId,
        name: 'github-gate',
        policy_id: policyId,
        status: 'active',
        monthly_limit: 10000,
        api_key_hash: apiKeyHash,
        created_at: now,
        updated_at: now,
      });

    if (agentError) {
      console.error('[DSG] github-app/link: agent insert error:', String(agentError?.message));
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
    }

    // Upsert installation record — update if re-linking
    const upsertPayload: Record<string, unknown> = {
      installation_id: installationId,
      org_id: orgId,
      agent_id: agentId,
      agent_api_key: apiKey,
      installed_at: now,
    };
    if (githubAccountLogin) {
      upsertPayload.github_account_login = githubAccountLogin;
    }

    const { error: upsertError } = await (admin as any)
      .from('github_app_installations')
      .upsert(upsertPayload, { onConflict: 'installation_id' });

    if (upsertError) {
      console.error('[DSG] github-app/link: installation upsert error:', String(upsertError?.message));
      return NextResponse.json({ error: 'Failed to link installation' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, agent_id: agentId, installation_id: installationId }, { status: 200 });
  } catch (err) {
    console.error('[DSG] github-app/link: unexpected error:', String(err));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
