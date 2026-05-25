import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { getDsgSupabaseRpcConfig, readDsgRest } from '@/lib/dsg/server/supabase-rpc';

type ItemRow = { id: string; app_id: string; title: string; completed: boolean; created_at: string };

const APP_ID = '5b5ecf71-6bdf-47a6-bd16-bdfc19a9e32e';

export async function GET(req: NextRequest) {
  try {
    const actor = await requireVerifiedDsgActor(req.headers, 'read:generated-apps');
    const config = getDsgSupabaseRpcConfig();
    const rows = await readDsgRest<ItemRow[]>(config, 'generated_app_items', {
      select: 'id,title,completed,created_at',
      app_id: `eq.${APP_ID}`,
      actor_id: `eq.${actor.actorId}`,
      order: 'created_at.desc',
    });
    return NextResponse.json({ ok: true, data: { appId: APP_ID, items: rows } });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GENERATED_APP_REQUEST_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireVerifiedDsgActor(req.headers, 'write:generated-apps');
    return NextResponse.json({ ok: false, error: { code: 'WRITE_RPC_NOT_WIRED' } }, { status: 501 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'GENERATED_APP_REQUEST_FAILED';
    const status = message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
