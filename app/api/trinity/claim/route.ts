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

    const { data: current, error: currentError } = await supabase
      .from('trinity_jobs')
      .select('id, status, claimed_by, claimed_at')
      .eq('org_id', actor.orgId)
      .eq('id', body.jobId)
      .maybeSingle();

    if (currentError) {
      return NextResponse.json({ ok: false, error: currentError.message }, { status: 409 });
    }
    if (!current) {
      return NextResponse.json({ ok: false, error: 'job not found' }, { status: 404 });
    }
    if (current.claimed_by && current.claimed_by !== actor.actorId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'job already claimed or not claimable',
          current,
        },
        { status: 409 },
      );
    }

    const { data: ownClaim, error: ownClaimError } = await supabase
      .from('trinity_jobs')
      .update({ claimed_by: actor.actorId, claimed_at: now, worker_wallet_address: walletAddress, status: 'claimed' })
      .eq('org_id', actor.orgId)
      .eq('id', body.jobId)
      .in('status', ['discovered', 'claimed'])
      .select('id, status, claimed_by, claimed_at, worker_wallet_address')
      .maybeSingle();

    if (ownClaimError || !ownClaim) {
      return NextResponse.json(
        {
          ok: false,
          error: 'job already claimed or not claimable',
          current: current ?? null,
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
  } catch {
    return NextResponse.json({ ok: false, error: 'Request could not be completed' }, { status: 403 });
  }
}
