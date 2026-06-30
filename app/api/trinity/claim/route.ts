import { NextResponse } from 'next/server';
import { appendAuditEvent, assertMutationRole, getSupabaseAdmin, parseActorContext } from '@/lib/trinity/workflow';

export const dynamic = 'force-dynamic';

interface ClaimRequest {
  jobId?: string;
  walletAddress?: string;
}

export async function POST(req: Request) {
  try {
    const actor = parseActorContext(req.headers);
    assertMutationRole(actor);

    const body = (await req.json().catch(() => ({}))) as ClaimRequest;
    if (!body.jobId) {
      return NextResponse.json({ ok: false, error: 'jobId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
    }

    const now = new Date().toISOString();
    const walletAddress = body.walletAddress || actor.walletAddress || null;

    const { data: ownClaim, error: ownClaimError } = await supabase
      .from('trinity_jobs')
      .update({ claimed_by: actor.actorId, claimed_at: now, worker_wallet_address: walletAddress, status: 'claimed' })
      .eq('org_id', actor.orgId)
      .eq('id', body.jobId)
      .or(`claimed_by.is.null,claimed_by.eq.${actor.actorId}`)
      .in('status', ['discovered', 'claimed'])
      .select('id, status, claimed_by, claimed_at, worker_wallet_address')
      .maybeSingle();

    if (ownClaimError) {
      return NextResponse.json({ ok: false, error: ownClaimError.message }, { status: 409 });
    }

    if (!ownClaim) {
      const { data: current } = await supabase
        .from('trinity_jobs')
        .select('id, status, claimed_by, claimed_at')
        .eq('org_id', actor.orgId)
        .eq('id', body.jobId)
        .maybeSingle();

      return NextResponse.json(
        {
          ok: false,
          error: 'job already claimed or not claimable',
          current,
        },
        { status: 409 },
      );
    }

    await appendAuditEvent({
      supabase,
      orgId: actor.orgId,
      jobId: body.jobId,
      eventType: 'job.claimed',
      actorId: actor.actorId,
      payload: { walletAddress },
    });

    return NextResponse.json({ ok: true, jobId: body.jobId, claim: ownClaim });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}
