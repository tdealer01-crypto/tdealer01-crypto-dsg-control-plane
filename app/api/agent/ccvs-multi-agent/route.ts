// CCVS Multi-Agent Diffusion Workflow API Route
// POST /api/agent/ccvs-multi-agent

import { NextRequest, NextResponse } from 'next/server';
import { MultiAgentOrchestrator } from '@/lib/dsg/multi-agent-ccvs/orchestrator/multi-agent-orchestrator';

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.commit || !body.goal) {
      return NextResponse.json(
        { success: false, error: 'commit and goal are required' },
        { status: 400 }
      );
    }

    const {
      commit,
      goal,
      config = {}
    } = body;

    // Parse config options
    const orchestratorConfig = {
      maxTotalIterations: config.maxIterations || 6,
      convergenceThreshold: config.threshold || 0.95,
      enableParallel: config.parallel !== false,
      simulationFirst: config.simulationFirst !== false,
      createPR: config.createPR || false,
      githubToken: process.env.GITHUB_TOKEN || '',
      repoOwner: process.env.GITHUB_REPO_OWNER || 'tdealer01-crypto',
      repoName: process.env.GITHUB_REPO_NAME || 'tdealer01-crypto-dsg-control-plane'
    };

    const orchestrator = new MultiAgentOrchestrator(orchestratorConfig);

    try {
      // Run orchestration
      const result = await orchestrator.orchestrate(commit, goal);

      const duration = Date.now() - startTime;

      return NextResponse.json({
        success: result.success,
        commit: result.commit,
        branchName: result.branchName,
        prUrl: result.prUrl,
        goal,
        levels: result.levels,
        totalEvidence: result.totalEvidence.length,
        metrics: {
          ...result.metrics,
          totalDurationMs: duration
        },
        diffusionTrace: result.diffusionTrace
      });
    } catch (orchestrationError) {
      return NextResponse.json(
        {
          success: false,
          error: orchestrationError instanceof Error 
            ? orchestrationError.message 
            : String(orchestrationError),
          durationMs: Date.now() - startTime
        },
        { status: 500 }
      );
    }
  } catch (parseError) {
    return NextResponse.json(
      { 
        success: false, 
        error: 'Invalid JSON body',
        durationMs: Date.now() - startTime
      },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'ccvs-multi-agent-diffusion',
    version: '1.0.0',
    agents: [
      { id: 'mutation-test-agent', level: 'L1', group: 'L1-unit' },
      { id: 'property-test-agent', level: 'L1', group: 'L1-unit' },
      { id: 'contract-test-agent', level: 'L2', group: 'L2-integration' },
      { id: 'integration-test-agent', level: 'L2', group: 'L2-integration' },
      { id: 'adversarial-test-agent', level: 'L3', group: 'L3-adversarial' },
      { id: 'z3-verification-agent', level: 'L4', group: 'L4-formal' },
      { id: 'provenance-agent', level: 'L5', group: 'L5-provenance' },
      { id: 'deployment-attestation-agent', level: 'L5', group: 'L5-provenance' }
    ],
    executionOrder: ['L1-unit', 'L2-integration', 'L3-adversarial', 'L4-formal', 'L5-provenance'],
    modes: {
      simulation: 'simulationFirst=true (default)',
      real: 'simulationFirst=false',
      dryRun: 'dryRun=true (default)',
      createPR: 'createPR=true (requires GITHUB_TOKEN)'
    },
    config: {
      maxIterations: 6,
      convergenceThreshold: 0.95,
      enableParallel: true,
      simulationFirst: true,
      createPR: false
    }
  });
}