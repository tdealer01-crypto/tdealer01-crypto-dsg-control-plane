import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';
import { generateMcpApiKey } from '@/lib/dsg/mcp/api-key-crypto';

type KeyRow = {
  key_id: string;
  key_prefix: string;
  label: string;
  plan_id: string;
  calls_limit: number;
  period_start: string;
  period_end: string;
  created_at: string;
};

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR';
  const status =
    message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
  return NextResponse.json({ ok: false, error: { code: message } }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const body = (await req.json().catch(() => ({}))) as { label?: string };
    const label = body.label?.trim() || 'Default';

    const { rawKey, keyHash, keyPrefix } = await generateMcpApiKey();
    const config = getDsgSupabaseRpcConfig();

    const keyId = await callDsgRpc<string>(config, 'create_mcp_api_key', {
      p_actor_id: actor.actorId,
      p_key_hash: keyHash,
      p_key_prefix: keyPrefix,
      p_label: label,
    });

    return NextResponse.json(
      { ok: true, data: { keyId, rawKey, keyPrefix, label } },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const config = getDsgSupabaseRpcConfig();

    const keys = await readDsgRest<KeyRow[]>(config, 'dsg_mcp_api_keys', {
      actor_id: `eq.${actor.actorId}`,
      status: 'eq.ACTIVE',
      select: 'key_id,key_prefix,label,plan_id,calls_limit,period_start,period_end,created_at,stripe_subscription_id',
      order: 'created_at.desc',
    });

    return NextResponse.json({ ok: true, data: keys });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const keyId = req.nextUrl.searchParams.get('keyId');

    if (!keyId) {
      return NextResponse.json(
        { ok: false, error: { code: 'KEY_ID_REQUIRED' } },
        { status: 400 },
      );
    }

    const config = getDsgSupabaseRpcConfig();
    await callDsgRpc(config, 'revoke_mcp_api_key', {
      p_key_id: keyId,
      p_actor_id: actor.actorId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
