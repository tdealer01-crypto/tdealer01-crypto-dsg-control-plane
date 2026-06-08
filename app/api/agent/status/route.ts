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

// Simple in-memory cache for DB checks to reduce latency
const dbCheckCache = {
  result: false,
  timestamp: 0,
  ttl: 30_000, // 30 seconds
};

async function checkDb(): Promise<boolean> {
  const now = Date.now();

  // Return cached result if fresh
  if (now - dbCheckCache.timestamp < dbCheckCache.ttl) {
    return dbCheckCache.result;
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('organizations').select('id').limit(1);
    const isHealthy = !error;

    // Update cache
    dbCheckCache.result = isHealthy;
    dbCheckCache.timestamp = now;

    return isHealthy;
  } catch {
    dbCheckCache.result = false;
    dbCheckCache.timestamp = now;
    return false;
  }
}

export async function GET() {
  const dbOk = await checkDb();

  // Get commit hash with fallback
  const commitHash = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'local';

  return NextResponse.json(
    {
      ok: dbOk,
      repo: 'dsg-control-plane',
      version: commitHash,
      commit: commitHash,
      env: process.env.VERCEL_ENV ?? 'local',
      ts: new Date().toISOString(),
      checks: {
        db: dbOk,
      },
    },
    {
      status: dbOk ? 200 : 503,
      headers: {
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
}
