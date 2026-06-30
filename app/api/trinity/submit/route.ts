import { NextResponse } from 'next/server';
import {
  appendAuditEvent,
  assertMutationRole,
  createHash,
  getSupabaseAdmin,
  parseActorContext,
} from '@/lib/trinity/workflow';

export const dynamic = 'force-dynamic';

interface SubmitRequest {
  jobId?: string;
  content?: string;
  proofRefs?: string[];
  qualityScore?: number;
}

export async function POST(req: Request) {
  try {
    const actor = parseActorContext(req.headers);
    assertMutationRole(actor);

    const body = (await req.json().catch(() => ({}))) as SubmitRequest;
    if (!body.jobId || !body.content) {
      return NextResponse.json({ ok: false, error: 'jobId and content are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
    }

    const contentHash = createHash(`${body.jobId}:${body.content}`);

    const { data: job } = await supabase
      .from('trinity_jobs')
      .select('id, claimed_by, status')
      .eq('org_id', actor.orgId)
      .eq('id', body.jobId)
      .maybeSingle();

    if (!job) {
      return NextResponse.json({ ok: false, error: 'job not found' }, { status: 404 });
    }

    if (job.claimed_by && job.claimed_by !== actor.actorId) {
      return NextResponse.json({ ok: false, error: 'job owned by another actor' }, { status: 409 });
    }

    await supabase.from('trinity_deliverables').insert({
      org_id: actor.orgId,
      job_id: body.jobId,
      submitted_by: actor.actorId,
      content: body.content,
      content_hash: contentHash,
      proof_refs: body.proofRefs ?? [],
      quality_score: body.qualityScore ?? null,
    });

    await supabase
      .from('trinity_jobs')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('org_id', actor.orgId)
      .eq('id', body.jobId);

    await appendAuditEvent({
      supabase,
      orgId: actor.orgId,
      jobId: body.jobId,
      eventType: 'job.submitted',
      actorId: actor.actorId,
      payload: { contentHash, proofRefs: body.proofRefs ?? [] },
    });

    return NextResponse.json({ ok: true, jobId: body.jobId, contentHash });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 403 });
  }
}
