import { NextResponse } from 'next/server';
import { lockAppBuilderGoal } from '@/lib/dsg/app-builder/goal-lock';
import { getAppBuilderDb, getDevSmokeAppBuilderContext } from '@/lib/dsg/app-builder/server-context';
import type { AppBuilderGoalInput } from '@/lib/dsg/app-builder/model';
import {
  createAppBuilderJob,
  listAppBuilderJobs,
} from '@/lib/dsg/server/repositories/app-builder-repository';

export async function GET(req: Request) {
  try {
    const ctx = getDevSmokeAppBuilderContext(req);
    const db = getAppBuilderDb();
    const data = await listAppBuilderJobs({ db, ...ctx });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'APP_BUILDER_LIST_FAILED' } },
      { status: 400 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = getDevSmokeAppBuilderContext(req);
    const db = getAppBuilderDb();
    const rawGoal = (await req.json()) as AppBuilderGoalInput;
    const lockedGoal = lockAppBuilderGoal(rawGoal);
    const data = await createAppBuilderJob({ db, ...ctx }, { rawGoal, lockedGoal });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: { code: error instanceof Error ? error.message : 'APP_BUILDER_CREATE_FAILED' } },
      { status: 400 },
    );
  }
}
