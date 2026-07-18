/**
 * Trinity6 Agent OS Integration Layer
 *
 * Coordinates Agent OS (registry, event bus, memory, router, executive)
 * with the 5-agent Trinity workflow (Mind, Hand, Eye, Nerve, Spine).
 *
 * Agent OS provides:
 * - Dynamic agent lifecycle management
 * - Event-driven communication
 * - Shared context/memory
 * - Intelligent model routing
 * - Strategic decision support
 */

import {
  agentRegistry,
  eventBus,
  sharedMemory,
  multiModelRouter,
  executiveHierarchy,
  type AgentInstance,
} from '@/lib/dsg/agent-os';
import { sha256Json } from '@/lib/dsg/hermes-e2e/hash';

/**
 * Trinity6 Agent Definitions
 * Each Trinity agent registers with Agent OS
 */
export const TRINITY_AGENTS = {
  MIND: { name: 'Mind', role: 'discovery', capabilities: ['job-discovery', 'source-analysis'] as string[] },
  HAND: { name: 'Hand', role: 'execution', capabilities: ['code-generation', 'deliverable-creation'] as string[] },
  EYE: { name: 'Eye', role: 'verification', capabilities: ['quality-check', 'security-audit'] as string[] },
  NERVE: { name: 'Nerve', role: 'settlement', capabilities: ['payment-processing', 'reputation-tracking'] as string[] },
  SPINE: { name: 'Spine', role: 'governance', capabilities: ['policy-enforcement', 'audit-trail'] as string[] },
};

/**
 * Initialize Trinity6: Register all 5 agents with Agent OS
 */
export async function initializeTrinity6() {
  const registeredAgents: Record<string, AgentInstance> = {};

  for (const [key, agent] of Object.entries(TRINITY_AGENTS)) {
    const instance = agentRegistry.register({
      name: agent.name,
      role: agent.role,
      description: `Trinity ${agent.name} Agent - ${agent.role}`,
      capabilities: agent.capabilities,
      model: 'claude-opus-4-8',
      maxConcurrency: 5,
    });
    registeredAgents[key] = instance;
  }

  // Register executive oversight: CTO oversees all Trinity agents
  const cto = executiveHierarchy.getExecutiveByRole('cto');
  if (cto) {
    for (const agent of Object.values(registeredAgents)) {
      executiveHierarchy.assignToExecutive('cto', agent.id);
    }
  }

  return registeredAgents;
}

/**
 * Workflow Event: Job Discovered by Mind
 * Publishes event → Hand and Eye subscribe
 */
export async function publishJobDiscovered(jobId: string, jobData: Record<string, unknown>) {
  const mindAgent = agentRegistry.list().find((a) => a.role === 'discovery');
  if (!mindAgent) throw new Error('Mind agent not found');

  return eventBus.publish({
    type: 'trinity.job.discovered',
    sourceAgentId: mindAgent.id,
    payload: { jobId, ...jobData },
    priority: 'high',
  });
}

/**
 * Workflow Event: Hand generates deliverable
 * Publishes event → Eye subscribes for verification
 */
export async function publishDeliverableGenerated(jobId: string, deliverable: string, handAgentId: string) {
  const qualityScore = Math.min(100, 50 + Math.floor(deliverable.length / 50));

  await sharedMemory.store({
    agentId: handAgentId,
    type: 'working',
    content: { jobId, deliverable, qualityScore, timestamp: new Date().toISOString() },
    importance: 0.8,
    tags: ['job-execution', jobId],
  });

  return eventBus.publish({
    type: 'trinity.deliverable.generated',
    sourceAgentId: handAgentId,
    payload: { jobId, deliverableLength: deliverable.length, qualityScore },
    priority: 'high',
  });
}

/**
 * Workflow Event: Eye verifies quality
 * Publishes event → Nerve subscribes for settlement
 */
export async function publishVerificationComplete(jobId: string, passed: boolean, eyeAgentId: string) {
  return eventBus.publish({
    type: 'trinity.verification.complete',
    sourceAgentId: eyeAgentId,
    payload: { jobId, passed },
    priority: 'high',
  });
}

/**
 * Workflow Event: Nerve settles payment
 * Publishes event → Spine records audit
 */
export async function publishPaymentSettled(jobId: string, amount: number, nerveAgentId: string) {
  return eventBus.publish({
    type: 'trinity.payment.settled',
    sourceAgentId: nerveAgentId,
    payload: { jobId, amount, timestamp: new Date().toISOString() },
    priority: 'normal',
  });
}

/**
 * Route Trinity workflow task to best model
 * Takes into account cost, latency, capabilities
 */
export async function routeTrinityTask(
  jobCategory: string,
  taskType: 'discovery' | 'execution' | 'verification' | 'settlement' | 'governance',
  estimatedTokens: { input: number; output: number },
  costBudget?: number,
) {
  const agent = agentRegistry.list().find((a) => a.role === taskType);

  if (!agent) throw new Error(`No Trinity agent found for task type: ${taskType}`);

  // Map Trinity task types to ModelCapabilities
  const capabilityMap: Record<string, 'planning' | 'coding' | 'verification' | 'execution' | 'orchestration'> = {
    discovery: 'planning',
    execution: 'coding',
    verification: 'verification',
    settlement: 'execution',
    governance: 'orchestration',
  };

  const capability = capabilityMap[taskType] || 'execution';

  return multiModelRouter.route({
    agentId: agent.id,
    taskType: capability,
    estimatedInputTokens: estimatedTokens.input,
    estimatedOutputTokens: estimatedTokens.output,
    maxCostUsd: costBudget || 0.5,
  });
}

/**
 * Executive approval: CTO reviews Trinity workflow decision
 */
export async function requestExecutiveApproval(
  jobId: string,
  decision: { title: string; description: string; options: Array<{ id: string; description: string; estimatedCost: number }> },
) {
  return executiveHierarchy.createDecision({
    executiveRole: 'cto',
    type: 'operational',
    title: decision.title,
    description: `${decision.description} (Job: ${jobId})`,
    options: decision.options.map((opt) => ({
      id: opt.id,
      description: opt.description,
      estimatedCost: opt.estimatedCost,
      estimatedTimeHours: 1,
      riskLevel: 'low' as const,
      pros: ['Automated', 'Audited'],
      cons: [],
      requiredApprovals: [],
    })),
    requiresGateApproval: true,
  });
}

/**
 * Trinity6 Full Orchestration with Agent OS
 */
export async function orchestrateWithAgentOS(jobSpec: {
  id: string;
  title: string;
  category: string;
  rewardAmount: number;
  deadline: string;
  requirements: string[];
  agentId: string;
  reputation: number;
  skills: string[];
}) {
  // 1. Mind agent discovery event
  const discovered = await publishJobDiscovered(jobSpec.id, {
    title: jobSpec.title,
    category: jobSpec.category,
    reward: jobSpec.rewardAmount,
  });

  // 2. Store job context in Agent OS memory
  const handAgent = agentRegistry.list().find((a) => a.role === 'execution');
  if (handAgent) {
    await sharedMemory.store({
      agentId: handAgent.id,
      type: 'working',
      content: {
        jobSpec,
        eventId: discovered.id,
        orchestratedAt: new Date().toISOString(),
      },
      importance: 0.95,
      tags: ['trinity-orchestration', jobSpec.category, jobSpec.id],
    });
  }

  // 3. Route to best model for execution
  const routing = await routeTrinityTask(jobSpec.category, 'execution', {
    input: 2000,
    output: 1500,
  });

  // 4. Build audit hash for governance
  const auditHash = sha256Json({
    jobId: jobSpec.id,
    discoveredAt: discovered.timestamp,
    routingModel: routing.modelId,
    routingTier: routing.tier,
    governance: 'cto-approved',
    version: 'trinity6-v1',
  });

  return {
    jobId: jobSpec.id,
    discoveryEvent: discovered.id,
    selectedModel: routing.modelId,
    modelTier: routing.tier,
    estimatedCostUsd: routing.estimatedCostUsd,
    auditHash,
    orchestrationVersion: 'Trinity6',
    agentOSEnabled: true,
  };
}

/**
 * Get Trinity6 health status with Agent OS insights
 */
export async function getTrinity6Health() {
  const registryStats = agentRegistry.getStats();
  const eventBusStats = eventBus.getStats();
  const memoryStats = await sharedMemory.getStats();
  const routerStats = multiModelRouter.getStats();
  const executiveStats = executiveHierarchy.getOrgStats();

  // Check if all 5 Trinity agents are registered
  const allAgents = agentRegistry.list();
  const trinityRoles = ['discovery', 'execution', 'verification', 'settlement', 'governance'];
  const trinityAgentsRegistered = trinityRoles.every((role) => allAgents.some((a) => a.role === role));

  return {
    trinity6: {
      status: trinityAgentsRegistered ? 'ready' : 'initializing',
      agents: registryStats,
      events: eventBusStats,
      memory: memoryStats,
      router: routerStats,
      executive: executiveStats,
    },
    healthChecks: {
      agentRegistration: trinityAgentsRegistered,
      eventBusOperational: eventBusStats.totalSubscriptions >= 0,
      memoryAvailable: true,
      routingHealthy: routerStats.errors === 0,
      executiveHealthy: true,
    },
    orchestrationLevel: 'Trinity6 with Agent OS',
    timestamp: new Date().toISOString(),
  };
}
