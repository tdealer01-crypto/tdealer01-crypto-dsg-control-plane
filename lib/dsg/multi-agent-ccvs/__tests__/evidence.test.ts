// CCVS Evidence Generation Tests - Run with: npx tsx lib/dsg/multi-agent-ccvs/__tests__/evidence.test.ts
import { MultiAgentOrchestrator } from '../orchestrator/multi-agent-orchestrator';

async function assert(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.log(`  ❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runTests() {
  console.log('🧪 Running CCVS Evidence Generation Tests...\n');
  
  // Setup env
  process.env.GITHUB_TOKEN='***';
  process.env.DIFFUSION_ENDPOINT = 'http://localhost:8000/v1/completions';
  process.env.GITHUB_REPO_OWNER = 'tdealer01-crypto';
  process.env.GITHUB_REPO_NAME = 'tdealer01-crypto-dsg-control-plane';

  console.log('--- MultiAgentOrchestrator Tests ---');

  const { MultiAgentOrchestrator } = await import('../orchestrator/multi-agent-orchestrator');

  await assert('should create orchestrator with default config', async () => {
    const orch = new MultiAgentOrchestrator({ 
      simulationFirst: true,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo'
    });
    if (!orch) throw new Error('Orchestrator not created');
  });

  await assert('should run full orchestration in simulation mode', async () => {
    const orch = new MultiAgentOrchestrator({
      simulationFirst: true,
      createPR: false,
      maxTotalIterations: 4,
      convergenceThreshold: 0.9,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo'
    });

    const result = await orch.orchestrate('test-commit', 'CCVS L1-L5 test evidence');
    
    if (!result.success) throw new Error('Overall success should be true');
    
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
    for (const level of levels) {
      const levelResult = result.levels.find(l => l.level === level);
      if (!levelResult) throw new Error(`Level ${level} not found`);
      if (!levelResult.converged) throw new Error(`Level ${level} did not converge`);
      if (levelResult.score < 0.9) throw new Error(`Level ${level} score ${levelResult.score} < 0.9`);
    }
    
    if (result.totalEvidence.length < 50) throw new Error(`Evidence count ${result.totalEvidence.length} < 50`);
    
    for (const levelResult of result.levels) {
      for (const agent of levelResult.agents) {
        if (!agent.success) throw new Error(`Agent ${agent.agentId} failed: ${agent.errors.join(', ')}`);
        if (agent.errors.length > 0) throw new Error(`Agent ${agent.agentId} has errors: ${agent.errors.join(', ')}`);
      }
    }
  });

  await assert('should generate evidence for all L1-L5 levels', async () => {
    const orch = new MultiAgentOrchestrator({ 
      simulationFirst: true,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo'
    });
    const result = await orch.orchestrate('test', 'test');
    
    const levels = result.levels.map(l => l.level).sort();
    const expected = ['L1', 'L2', 'L3', 'L4', 'L5'];
    if (JSON.stringify(levels) !== JSON.stringify(expected)) {
      throw new Error(`Levels mismatch: got ${JSON.stringify(levels)}`);
    }
  });

  await assert('should have valid evidence structure', async () => {
    const orch = new MultiAgentOrchestrator({ 
      simulationFirst: true,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo'
    });
    const result = await orch.orchestrate('test', 'test');
    
    for (const evidence of result.totalEvidence) {
      if (!evidence.id) throw new Error('Evidence missing id');
      if (!['test', 'proof', 'artifact', 'attestation', 'report'].includes(evidence.type)) {
        throw new Error(`Invalid evidence type: ${evidence.type}`);
      }
      if (!['L1', 'L2', 'L3', 'L4', 'L5'].includes(evidence.level)) {
        throw new Error(`Invalid level: ${evidence.level}`);
      }
      if (!evidence.name) throw new Error('Evidence missing name');
      if (!evidence.description) throw new Error('Evidence missing description');
      if (evidence.verification && typeof evidence.verification !== 'object') {
        throw new Error('Invalid verification structure');
      }
    }
  });

  await assert('should have diffusion trace for each agent', async () => {
    const orch = new MultiAgentOrchestrator({ 
      simulationFirst: true,
      githubToken: 'test-token',
      repoOwner: 'test-owner',
      repoName: 'test-repo'
    });
    const result = await orch.orchestrate('test', 'test');
    
    if (result.diffusionTrace.length === 0) throw new Error('No diffusion trace');
    for (const trace of result.diffusionTrace) {
      if (!trace.agent) throw new Error('Trace missing agent');
      if (!['L1', 'L2', 'L3', 'L4', 'L5'].includes(trace.level)) {
        throw new Error(`Invalid trace level: ${trace.level}`);
      }
      if (!Array.isArray(trace.diffusionSteps)) throw new Error('Missing diffusionSteps');
    }
  });

  console.log(`\n==============================`);
  console.log(`Tests completed!`);
  console.log(`==============================`);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});