import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/security/api-error';
import {
  appendAuditEvent,
  assertVerifyRole,
  getSupabaseAdmin,
  normalizeSeverity,
  parseActorContext,
} from '@/lib/trinity/workflow';

export const dynamic = 'force-dynamic';

interface VerifyRequest {
  jobId?: string;
  qualityScore?: number;
  notes?: string;
}

export async function POST(req: Request) {
  try {
    const actor = parseActorContext(req.headers);
    assertVerifyRole(actor);

    const body = (await req.json().catch(() => ({}))) as VerifyRequest;
    if (!body.jobId) {
      return NextResponse.json({ ok: false, error: 'jobId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase not configured' }, { status: 503 });
    }

    const { data: job } = await supabase
      .from('trinity_jobs')
      .select('id, severity, status')
      .eq('org_id', actor.orgId)
      .eq('id', body.jobId)
      .maybeSingle();

    if (!job) return NextResponse.json({ ok: false, error: 'job not found' }, { status: 404 });

    const { data: latestDeliverable } = await supabase
      .from('trinity_deliverables')
      .select('id, quality_score, content_hash')
      .eq('org_id', actor.orgId)
      .eq('job_id', body.jobId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestDeliverable) {
      return NextResponse.json({ ok: false, error: 'no deliverable submitted' }, { status: 422 });
    }

    const severity = normalizeSeverity(job.severity || undefined);
    const threshold = severity === 'critical' ? 90 : severity === 'high' ? 80 : 70;
    const qualityScore = Number(body.qualityScore ?? latestDeliverable.quality_score ?? 0);
    const passed = qualityScore >= threshold;

    const { data: updatedJob } = await supabase
      .from('trinity_jobs')
      .update({ status: passed ? 'verified' : 'rejected', verified_at: new Date().toISOString() })
      .eq('org_id', actor.orgId)
      .eq('status', 'submitted')
      .eq('id', body.jobId)
      .select('id')
      .maybeSingle();

    if (!updatedJob) {
      return NextResponse.json({ ok: false, error: 'job is not in submitted state' }, { status: 409 });
    }

    await supabase
      .from('trinity_deliverables')
      .update({ quality_score: qualityScore, verification_notes: body.notes ?? null })
      .eq('org_id', actor.orgId)
      .eq('id', latestDeliverable.id);

    await appendAuditEvent({
      supabase,
      orgId: actor.orgId,
      jobId: body.jobId,
      eventType: 'job.verified',
      actorId: actor.actorId,
      payload: { passed, severity, threshold, qualityScore, notes: body.notes ?? null },
    });

    return NextResponse.json({
      ok: true,
      jobId: body.jobId,
      verification: {
        passed,
        qualityScore,
        threshold,
        severity,
        notes: body.notes ?? null,
      },
    });
  } catch (err) {
    return handleApiError('trinity/verify', err, { status: 403 });
  }
}
