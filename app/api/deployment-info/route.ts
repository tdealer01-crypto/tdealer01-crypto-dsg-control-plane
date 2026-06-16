import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

/**
 * GET /api/deployment-info
 * Returns current deployment information including commit hash
 * Useful for verifying production is on latest main
 */
export async function GET() {
  try {
    // Get git info (will work if .git is available in Vercel deployment)
    let gitCommit = process.env.VERCEL_GIT_COMMIT_SHA || 'unknown';
    let gitBranch = process.env.VERCEL_GIT_COMMIT_REF || 'main';
    let deploymentId = process.env.VERCEL_DEPLOYMENT_ID || 'unknown';

    // Fallback: try to read from git
    if (gitCommit === 'unknown') {
      try {
        const { stdout } = await execAsync('git rev-parse HEAD 2>/dev/null');
        gitCommit = stdout.trim().slice(0, 40);
      } catch {
        // Ignore if git not available
      }
    }

    return NextResponse.json(
      {
        ok: true,
        deployment: {
          commit: gitCommit,
          branch: gitBranch,
          environment: process.env.NODE_ENV || 'production',
          deploymentId: deploymentId,
          deployedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        },
        service: {
          name: 'dsg-control-plane',
          version: '2.0.0',
          phase: 'phase-2-complete',
        },
        features: {
          markdocPolicies: true,
          agentPermissions: true,
          multiAgentOrchestration: true,
          policyVersioning: true,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to retrieve deployment info',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
