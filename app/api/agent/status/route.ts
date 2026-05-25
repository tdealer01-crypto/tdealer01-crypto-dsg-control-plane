/**
 * GET /api/agent/status
 *
 * Lightweight agent-control status endpoint. No auth required.
 * Returns repo identity, deployment version, environment, a live timestamp,
 * and a minimal db connectivity check so an AI agent can confirm production
 * is alive and which commit is deployed.
 */

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

async function checkDb(): Promise<boolean> {
  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('organizations').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function GET() {
  const dbOk = await checkDb();

  return NextResponse.json(
    {
      ok: dbOk,
      repo: 'dsg-control-plane',
      version: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      env: process.env.VERCEL_ENV ?? 'local',
      ts: new Date().toISOString(),
      checks: {
        db: dbOk,
      },
    },
    { status: dbOk ? 200 : 503 },
  );
}
