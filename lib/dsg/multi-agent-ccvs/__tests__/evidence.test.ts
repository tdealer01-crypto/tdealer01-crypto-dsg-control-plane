// CCVS Evidence Generation Tests - Run with: npx tsx lib/dsg/multi-agent-ccvs/__tests__/evidence.test.ts
import { MultiAgentOrchestrator } from '../orchestrator/multi-agent-orchestrator';
import { SimulationPipeline } from '../simulation/pipeline';

async function runTests() {
  console.log('🧪 Running CCVS Evidence Generation Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  async function assert(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`  ❌ ${name}: ${error instanceof Error ? error.message : String(error)}`);
      failed++;
    }
  }
  
  async function assertEqual<T>(name: string, actual: T, expected: T) {
    await assert(name, async () => {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    });
  }

  // Setup env
  process.env.GITHUB_TOKEN = 'test-token';
  process.env.DIFFUSION_ENDPOINT = 'http://localhost:8000/v1/completions';

  console.log('--- MultiAgentOrchestrator Tests ---');
  
  await assert('should create orchestrator with default config', async () => {
    const orch = new MultiAgentOrchestrator({ simulationFirst: true });
    if (!orch) throw new Error('Orchestrator not created');
  });

  await assert('should run full orchestration in simulation mode', async () => {
    const orch = new MultiAgentOrchestrator({
      simulationFirst: true,
      createPR: false,
      maxTotalIterations: 4,
      convergenceThreshold: 0.9
    });

    const result = await orch.orchestrate('test-commit', 'CCVS L1-L5 test evidence');
    
    // Overall convergence
    if (!result.success) throw new Error('Overall success should be true');
    
    // All levels converged
    const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
    for (const level of levels) {
      const levelResult = result.levels.find(l => l.level === level);
      if (!levelResult) throw new Error(`Level ${level} not found`);
      if (!levelResult.converged) throw new Error(`Level ${level} did not converge`);
      if (levelResult.score < 0.9) throw new Error(`Level ${level} score ${levelResult.score} < 0.9`);
    }
    
    // Evidence generated
    if (result.totalEvidence.length < 50) throw new Error(`Evidence count ${result.totalEvidence.length} < 50`);
    
    // All agents passed
    for (const levelResult of result.levels) {
      for (const agent of levelResult.agents) {
        if (!agent.success) throw new Error(`Agent ${agent.agentId} failed: ${agent.errors.join(', ')}`);
        if (agent.errors.length > 0) throw new Error(`Agent ${agent.agentId} has errors: ${agent.errors.join(', ')}`);
      }
    }
  });

  await assert('should generate evidence for all L1-L5 levels', async () => {
    const orch = new MultiAgentOrchestrator({ simulationFirst: true });
    const result = await orch.orchestrate('test', 'test');
    
    const levels = result.levels.map(l => l.level).sort();
    const expected = ['L1', 'L2', 'L3', 'L4', 'L5'];
    if (JSON.stringify(levels) !== JSON.stringify(expected)) {
      throw new Error(`Levels mismatch: got ${JSON.stringify(levels)}`);
    }
  });

  await assert('should have valid evidence structure', async () => {
    const orch = new MultiAgentOrchestrator({ simulationFirst: true });
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
      if (!evidence.verification) throw new Error('Evidence missing verification');
    }
  });

  await assert('should have diffusion trace for each agent', async () => {
    const orch = new MultiAgentOrchestrator({ simulationFirst: true });
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

  console.log('\n--- SimulationPipeline Tests ---');
  
  await assert('should run full simulation pipeline', async () => {
    const { SimulationPipeline } = await import('../simulation/pipeline');
    const pipeline = new SimulationPipeline({
      orchestrator: {
        simulationFirst: true,
        createPR: false,
        maxTotalIterations: 4,
        convergenceThreshold: 0.9
      },
      dryRun: true,
      verbose: false
    });

    const result = await pipeline.run('test-commit', 'CCVS L1-L5 evidence');
    
    if (!result.success) throw new Error('Pipeline should succeed');
    if (result.metrics.successfulAgents !== 8) throw new Error(`Expected 8 successful agents, got ${result.metrics.successfulAgents}`);
    if (result.metrics.totalEvidence < 50) throw new Error(`Evidence count ${result.metrics.totalEvidence} < 50`);
  });

  // Summary
  console.log(`\n==============================`);
  console.log(`Tests: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`==============================`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});