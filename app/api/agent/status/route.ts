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
import { getDeploymentIdentity } from '../../../../lib/deployment/platform';

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

  // Deployment identity is resolved across Vercel/Render/CI/local.
  const deployment = getDeploymentIdentity();
  const commitHash = deployment.commit;

  return NextResponse.json(
    {
      ok: dbOk,
      repo: 'dsg-control-plane',
      version: commitHash,
      commit: commitHash,
      env: deployment.env,
      platform: deployment.platform,
      branch: deployment.branch,
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
