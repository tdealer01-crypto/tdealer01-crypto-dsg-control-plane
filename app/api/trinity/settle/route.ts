import { NextResponse } from 'next/server';
import {
  assertVerifyRole,
  createHash,
  getSupabaseAdmin,
  parseActorContext,
  settleJob,
} from '@/lib/trinity/workflow';

export const dynamic = 'force-dynamic';

interface SettleRequest {
  jobId?: string;
  idempotencyKey?: string;
}

export async function POST(req: Request) {
  try {
    const actor = parseActorContext(req.headers);
    assertVerifyRole(actor);

    const body = (await req.json().catch(() => ({}))) as SettleRequest;
    if (!body.jobId) {
      return NextResponse.json({ ok: false, error: 'jobId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const idempotencyKey = body.idempotencyKey || createHash(`${actor.orgId}:${body.jobId}:settle`);

    const result = await settleJob({
      supabase,
      orgId: actor.orgId,
      actorId: actor.actorId,
      jobId: body.jobId,
      idempotencyKey,
    });

    return NextResponse.json({ ok: true, settlement: result });
  } catch {
    return NextResponse.json({ ok: false, error: 'Request could not be completed' }, { status: 403 });
  }
}
