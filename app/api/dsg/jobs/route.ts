import { NextResponse } from 'next/server';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';
import { createRuntimeJob, listRuntimeJobs } from '@/lib/dsg/server/repository';
import { getBearerToken } from '@/lib/dsg/server/supabase-rpc';

export async function GET(request: Request) {
  const actor = await requireVerifiedDsgActor(request.headers, 'job:read');

  try {
    const jobs = await listRuntimeJobs({
      workspaceId: actor.workspaceId,
      actorId: actor.actorId,
      userAccessToken: getBearerToken(request.headers),
    });
    return NextResponse.json({ ok: true, data: { jobs, source: 'supabase' } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_LIST_JOBS_FAILED' } },
      { status: 403 },
    );
  }
}

export async function POST(request: Request) {
  const actor = await requireVerifiedDsgActor(request.headers, 'job:create');
  const body = (await request.json().catch(() => null)) as {
    goal?: string;
    successCriteria?: unknown[];
    figmaUrl?: string;
  } | null;

  if (!body?.goal?.trim()) {
    return NextResponse.json({ ok: false, error: { code: 'DSG_GOAL_REQUIRED' } }, { status: 400 });
  }

  let goal = body.goal.trim();

  if (body.figmaUrl?.trim()) {
    goal += `\n\nDesign reference (Figma): ${body.figmaUrl.trim()} — match the layout, colors, and components shown.`;
  }

  try {
    const data = await createRuntimeJob(
      { workspaceId: actor.workspaceId, actorId: actor.actorId, userAccessToken: getBearerToken(request.headers) },
      { goal, successCriteria: body.successCriteria },
    );
    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'DSG_CREATE_JOB_FAILED' } },
      { status: 403 },
    );
  }
}
