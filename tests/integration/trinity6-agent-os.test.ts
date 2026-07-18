/**
 * Trinity6 with Agent OS — Integration Tests
 *
 * Tests the full integration of Agent OS (registry, event bus, memory, router, executive)
 * with Trinity5 agents (Mind, Hand, Eye, Nerve, Spine)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  agentRegistry,
  eventBus,
  sharedMemory,
  multiModelRouter,
  executiveHierarchy,
  initializeAgentOS,
} from '@/lib/dsg/agent-os';
import {
  initializeTrinity6,
  orchestrateWithAgentOS,
  getTrinity6Health,
  publishJobDiscovered,
  publishDeliverableGenerated,
  publishVerificationComplete,
  publishPaymentSettled,
  routeTrinityTask,
  TRINITY_AGENTS,
} from '@/lib/trinity/agent-os-integration';

describe('Trinity6 with Agent OS Integration', () => {
  beforeAll(async () => {
    // Initialize Agent OS
    const health = await initializeAgentOS();
    expect(health.registry).toBe(true);
    expect(health.eventBus).toBe(true);
    expect(health.memory).toBe(true);
    expect(health.router).toBe(true);
    expect(health.executive).toBe(true);
  });

  describe('Trinity6 Initialization', () => {
    it('registers all 5 Trinity agents in Agent OS registry', async () => {
      const agents = await initializeTrinity6();

      expect(Object.keys(agents)).toHaveLength(5);
      expect(agents.MIND).toBeDefined();
      expect(agents.HAND).toBeDefined();
      expect(agents.EYE).toBeDefined();
      expect(agents.NERVE).toBeDefined();
      expect(agents.SPINE).toBeDefined();

      // Verify each agent has proper metadata
      expect(agents.MIND.role).toBe('discovery');
      expect(agents.HAND.role).toBe('execution');
      expect(agents.EYE.role).toBe('verification');
      expect(agents.NERVE.role).toBe('settlement');
      expect(agents.SPINE.role).toBe('governance');
    });

    it('assigns all Trinity agents to CTO executive', async () => {
      const cto = executiveHierarchy.getExecutiveByRole('cto');
      expect(cto).toBeDefined();

      const agents = agentRegistry.list().filter((a) => a.role === 'discovery' || a.role === 'execution' || a.role === 'verification');
      expect(agents.length).toBeGreaterThan(0);

      // All should be assigned to CTO (from initializeTrinity6)
      for (const agent of agents) {
        expect(cto!.departmentAgents).toContain(agent.id);
      }
    });
  });

  describe('Trinity6 Orchestration Flow', () => {
    it('orchestrates a complete job with Agent OS', async () => {
      const jobId = `trinity6-test-job-${Date.now()}`;
      const result = await orchestrateWithAgentOS({
        id: jobId,
        title: 'Test Smart Contract Audit',
        category: 'smart-contract-audit',
        rewardAmount: 2.5,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        requirements: ['Solidity', 'Security'],
        agentId: 'test-agent-001',
        reputation: 85,
        skills: ['smart-contract-audit', 'security-review'],
      });

      expect(result.jobId).toBe(jobId);
      expect(result.discoveryEvent).toBeTruthy();
      expect(result.selectedModel).toBeTruthy();
      expect(result.modelTier).toMatch(/premium|balanced|worker|local/);
      expect(result.estimatedCostUsd).toBeGreaterThan(0);
      expect(result.auditHash).toMatch(/^[a-f0-9]+$/);
      expect(result.orchestrationVersion).toBe('Trinity6');
      expect(result.agentOSEnabled).toBe(true);
    });

    it('publishes job discovered event', async () => {
      const mindAgent = agentRegistry.list().find((a) => a.role === 'discovery');
      expect(mindAgent).toBeDefined();

      const event = await publishJobDiscovered('job-123', {
        title: 'Test Job',
        category: 'testing',
        reward: 1.5,
      });

      expect(event.type).toBe('trinity.job.discovered');
      expect(event.sourceAgentId).toBe(mindAgent!.id);
      expect(event.payload).toHaveProperty('jobId', 'job-123');
      expect(event.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('publishes deliverable generated event and stores in memory', async () => {
      const handAgent = agentRegistry.list().find((a) => a.role === 'execution');
      expect(handAgent).toBeDefined();

      const deliverable = `# Test Deliverable\n\nFull implementation and testing.`;

      const event = await publishDeliverableGenerated('job-456', deliverable, handAgent!.id);
      expect(event.type).toBe('trinity.deliverable.generated');
      expect(event.payload).toHaveProperty('jobId', 'job-456');
      expect(event.payload).toHaveProperty('qualityScore');

      // Verify stored in shared memory
      const memories = await sharedMemory.query({ agentId: handAgent!.id });
      const found = memories.find((m) => m.content.jobId === 'job-456');
      expect(found).toBeDefined();
    });

    it('publishes verification complete event', async () => {
      const eyeAgent = agentRegistry.list().find((a) => a.role === 'verification');
      expect(eyeAgent).toBeDefined();

      const event = await publishVerificationComplete('job-789', true, eyeAgent!.id);

      expect(event.type).toBe('trinity.verification.complete');
      expect(event.payload).toEqual({ jobId: 'job-789', passed: true });
    });

    it('publishes payment settled event', async () => {
      const nerveAgent = agentRegistry.list().find((a) => a.role === 'settlement');
      expect(nerveAgent).toBeDefined();

      const event = await publishPaymentSettled('job-999', 2.5, nerveAgent!.id);

      expect(event.type).toBe('trinity.payment.settled');
      expect(event.payload).toHaveProperty('jobId', 'job-999');
      expect(event.payload).toHaveProperty('amount', 2.5);
    });
  });

  describe('Trinity6 Task Routing', () => {
    it('routes execution task to best model', async () => {
      const routing = await routeTrinityTask('smart-contract-audit', 'execution', {
        input: 3000,
        output: 2000,
      });

      expect(routing.modelId).toBeTruthy();
      expect(routing.tier).toMatch(/premium|balanced|worker|local/);
      expect(routing.estimatedCostUsd).toBeLessThanOrEqual(0.5);
      expect(routing.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('respects cost budget for routing', async () => {
      const routing = await routeTrinityTask('documentation', 'execution', {
        input: 500,
        output: 500,
      });

      expect(routing.estimatedCostUsd).toBeLessThanOrEqual(0.5);
    });
  });

  describe('Trinity6 Event Bus Coordination', () => {
    it('allows event subscription for agent coordination', async () => {
      const events: Array<any> = [];

      const handAgent = agentRegistry.list().find((a) => a.role === 'execution');
      const eyeAgent = agentRegistry.list().find((a) => a.role === 'verification');

      if (!handAgent || !eyeAgent) {
        throw new Error('Hand or Eye agent not found');
      }

      // Eye subscribes to deliverable events from Hand
      const subscriptionId = eventBus.subscribe({
        agentId: eyeAgent.id,
        eventTypes: ['trinity.deliverable.generated'],
        handler: async (event) => {
          events.push(event);
        },
      });

      // Hand publishes
      await publishDeliverableGenerated('job-sub-test', 'deliverable', handAgent.id);

      // Wait for async delivery
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('trinity.deliverable.generated');

      eventBus.unsubscribe(subscriptionId);
    });
  });

  describe('Trinity6 Health', () => {
    it('reports Trinity6 health with Agent OS status', async () => {
      const health = await getTrinity6Health();

      expect(health.trinity6).toBeDefined();
      expect(health.healthChecks).toBeDefined();
      expect(health.orchestrationLevel).toContain('Trinity6');
      expect(health.timestamp).toBeTruthy();

      // All health checks should pass
      expect(health.healthChecks.agentRegistration).toBe(true);
      expect(health.healthChecks.eventBusOperational).toBe(true);
      expect(health.healthChecks.memoryAvailable).toBe(true);
    });
  });

  describe('Trinity6 Constants', () => {
    it('defines all Trinity agent roles', () => {
      const roles = Object.values(TRINITY_AGENTS).map((a) => a.role);
      expect(roles).toContain('discovery');
      expect(roles).toContain('execution');
      expect(roles).toContain('verification');
      expect(roles).toContain('settlement');
      expect(roles).toContain('governance');
    });
  });
});
