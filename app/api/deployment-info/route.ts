import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getDeploymentIdentity } from '@/lib/deployment/platform';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

/**
 * GET /api/deployment-info
 * Returns current deployment information including commit hash
 * Useful for verifying production is on latest main
 */
export async function GET() {
  try {
    // Host-injected git info (Vercel or Render); falls back to local git below.
    const deployment = getDeploymentIdentity();
    let gitCommit = deployment.commit === 'local' ? 'unknown' : deployment.commit;
    const gitBranch = deployment.branch ?? 'main';
    const deploymentId = deployment.deploymentId ?? 'unknown';

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
    console.error('Deployment info error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to retrieve deployment info' },
      { status: 500 }
    );
  }
}
