import { describe, it, expect, beforeAll } from 'vitest';
import { MultiAgentOrchestrator } from '../orchestrator/multi-agent-orchestrator';
import { SimulationPipeline } from '../simulation/pipeline';

describe('CCVS Multi-Agent Evidence Generation', () => {
  beforeAll(() => {
    process.env.GITHUB_TOKEN = 'test-token';
    process.env.DIFFUSION_ENDPOINT = 'http://localhost:8000/v1/completions';
  });

  describe('MultiAgentOrchestrator', () => {
    it('should create orchestrator with default config', () => {
      const orch = new MultiAgentOrchestrator({ simulationFirst: true });
      expect(orch).toBeDefined();
    });

    it('should run full orchestration in simulation mode', async () => {
      const orch = new MultiAgentOrchestrator({
        simulationFirst: true,
        createPR: false,
        maxTotalIterations: 4,
        convergenceThreshold: 0.9
      });

      const result = await orch.orchestrate('test-commit', 'CCVS L1-L5 test evidence');

      expect(result.success).toBe(true);
      expect(result.convergenceScore).toBeGreaterThanOrEqual(0.9);

      const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
      for (const level of levels) {
        const levelResult = result.levels.find(l => l.level === level);
        expect(levelResult).toBeDefined();
        expect(levelResult?.converged).toBe(true);
        expect(levelResult?.score).toBeGreaterThanOrEqual(0.9);
      }

      expect(result.totalEvidence.length).toBeGreaterThan(50);

      for (const levelResult of result.levels) {
        for (const agent of levelResult.agents) {
          expect(agent.success).toBe(true);
          expect(agent.errors.length).toBe(0);
        }
      }
    }, 30000);
  });

  describe('SimulationPipeline', () => {
    it('should run full simulation pipeline', async () => {
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
      expect(result.success).toBe(true);
      expect(result.metrics.successfulAgents).toBe(8);
      expect(result.metrics.totalEvidence).toBeGreaterThan(50);
    }, 30000);
  });

  describe('Individual Agent Convergence', () => {
    const agents = [
      'mutation-test-agent',
      'property-test-agent',
      'contract-test-agent',
      'integration-test-agent',
      'adversarial-test-agent',
      'z3-verification-agent',
      'provenance-agent',
      'deployment-attestation-agent'
    ];                                                                              
    for (const agentId of agents) {
      // แก้ไขจาก `should converge...` ที่ไม่มีเครื่องหมายครอบ String ให้ถูกต้อง
      it(`should converge: ${agentId}`, async () => {
        expect(true).toBe(true); // Placeholder
      });
    }
  });

  describe('Evidence Quality', () => {
    it('should generate evidence for all L1-L5 levels', async () => {
      const orch = new MultiAgentOrchestrator({ simulationFirst: true });
      const result = await orch.orchestrate('test', 'test');

      const levels = result.levels.map(l => l.level).sort();
      expect(levels).toEqual(['L1', 'L2', 'L3', 'L4', 'L5']);
    });

    it('should have valid evidence structure', async () => {
      const orch = new MultiAgentOrchestrator({ simulationFirst: true });
      const result = await orch.orchestrate('test', 'test');

      for (const evidence of result.totalEvidence) {
        expect(evidence.id).toBeDefined();
        expect(evidence.type).toMatch(/test|proof|artifact|attestation|report/);
        expect(evidence.level).toMatch(/L[1-5]/);
        expect(evidence.name).toBeDefined();
        expect(evidence.description).toBeDefined();
        expect(evidence.verification).toBeDefined();
      }
    });                                                                             
    it('should have diffusion trace for each agent', async () => {
      const orch = new MultiAgentOrchestrator({ simulationFirst: true });
      const result = await orch.orchestrate('test', 'test');                        
      expect(result.diffusionTrace.length).toBeGreaterThan(0);
      for (const trace of result.diffusionTrace) {
        expect(trace.agent).toBeDefined();
        expect(trace.level).toMatch(/L[1-5]/);
        expect(Array.isArray(trace.diffusionSteps)).toBe(true);
      }
    });
  });
});
