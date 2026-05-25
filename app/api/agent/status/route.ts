import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    repo: 'dsg-one-v1',
    version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    env: process.env.VERCEL_ENV ?? 'local',
    ts: new Date().toISOString(),
    checks: {
      db: true,
    },
  });
}
